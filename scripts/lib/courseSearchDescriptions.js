/** Section descriptions from the public Yale Course Search. */
import { execFile } from 'node:child_process'
import { setTimeout as pause } from 'node:timers/promises'
import { promisify } from 'node:util'
import { htmlToText } from './yaleImport.js'

const MAX_DETAILS_PER_TERM = 80
const REFRESH_DAYS = 30
const DAY_MS = 86_400_000
const runCurl = promisify(execFile)

async function requestFose(route, payload) {
  // Use the curl request verified against the public endpoint on ubuntu-latest.
  const { stdout } = await runCurl('curl', [
    '--disable', '--silent', '--show-error', '--max-time', '8',
    '--write-out', '\n%{http_code}',
    'https://courses.yale.edu/api/?page=fose&route=' + route,
    '--user-agent', 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36',
    '--header', 'Content-Type: application/json',
    '--header', 'Accept: application/json, text/javascript, */*; q=0.01',
    '--header', 'X-Requested-With: XMLHttpRequest',
    '--header', 'Origin: https://courses.yale.edu',
    '--header', 'Referer: https://courses.yale.edu/',
    '--data-raw', JSON.stringify(payload),
  ])
  await pause(150)
  const status = stdout.slice(-3)
  if (status !== '200') throw new Error('HTTP ' + status)
  return JSON.parse(stdout.slice(0, -4))
}

function usableResponse(body) {
  return body && typeof body === 'object' && !Object.hasOwn(body, 'fatal')
}

/** Check one school at a time because Course Search groups results by school. */
async function readSchool(termCode, school, candidates, request) {
  const response = await request('search', {
    other: { srcdb: termCode }, criteria: [{ field: 'col', value: school }], _pers: {},
  })
  if (!usableResponse(response) || !Array.isArray(response.results)) {
    throw new Error('invalid search response')
  }
  const wanted = new Set(candidates.map(candidate => candidate.crn))
  return new Map(response.results
    .filter(listing => wanted.has(String(listing?.crn)) && String(listing.srcdb) === termCode &&
      typeof listing.code === 'string' && listing.code.trim())
    .map(listing => [String(listing.crn), listing]))
}

async function readDescription(listing, termCode, crn, request) {
  const key = `crn:${crn}`
  const detail = await request('details', {
    group: `code:${listing.code}`, key, matched: key, srcdb: listing.srcdb, _pers: {},
  })
  if (!usableResponse(detail) || String(detail.srcdb) !== termCode || String(detail.crn) !== crn) {
    throw new Error('invalid details or wrong term/CRN')
  }
  if (!Object.hasOwn(detail, 'description') || (detail.description != null && typeof detail.description !== 'string')) {
    throw new Error('invalid description field')
  }
  return htmlToText(detail.description)
}

/** Fill v3 gaps and refresh previously verified Course Search descriptions. */
export async function refreshCourseSearchDescriptions(
  { rows, crnsByCourseId }, cache, { checkedOn, previousDescriptions, request = requestFose },
) {
  const report = { attempted: 0, received: 0, updated: 0, problems: [] }
  const candidates = []
  for (const row of rows) {
    const id = row['Course ID']
    const crn = crnsByCourseId.get(id)
    if (!/^\d+$/.test(crn ?? '')) continue
    const key = `${row.TermCode}:${crn}`
    const saved = cache.get(key)
    if (row['Course Description'] && !saved?.text) continue
    candidates.push({ row, crn, key, saved, published: Boolean(previousDescriptions.get(id)) })
  }
  if (candidates.length === 0) return report

  // Try new sections first, with visible gaps ahead of existing Bulletin text.
  // Failed attempts go to the back of the queue and are eligible again tomorrow.
  candidates.sort((a, b) =>
    (a.saved?.checkedOn ?? '').localeCompare(b.saved?.checkedOn ?? '') || Number(a.published) - Number(b.published))
  const due = candidates.filter(({ saved }) =>
    !saved || Date.parse(checkedOn) - Date.parse(saved.checkedOn) >= (saved.retry ? 1 : REFRESH_DAYS) * DAY_MS)
  // Even on a quiet day, recheck one known description to detect endpoint changes.
  const canary = candidates.find(({ saved }) => saved?.text) ?? candidates[0]
  const selected = [...new Set([canary, ...due])].slice(0, MAX_DETAILS_PER_TERM)
  report.attempted = selected.length
  const bySchool = new Map()
  for (const candidate of selected) {
    const school = candidate.row.School
    if (!bySchool.has(school)) bySchool.set(school, [])
    bySchool.get(school).push(candidate)
  }

  for (const [school, sections] of bySchool) {
    const termCode = sections[0].row.TermCode
    let listings
    try {
      listings = await readSchool(termCode, school, sections, request)
    } catch (error) {
      report.problems.push(`${school}: search unavailable (${error.message.split('\n')[0]}).`)
      for (const { key, saved } of sections) cache.set(key, { text: saved?.text ?? '', checkedOn, retry: true })
      continue
    }

    for (const { crn, key, saved } of sections) {
      const oldText = saved?.text ?? ''
      try {
        const listing = listings.get(crn)
        if (!listing) throw new Error('missing from the search results')
        const text = await readDescription(listing, termCode, crn, request)
        report.received++
        if (text) report.updated++
        else if (oldText) report.problems.push(`CRN ${crn}: description is now empty. Kept the saved text.`)
        cache.set(key, { text: text || oldText, checkedOn })
      } catch (error) {
        report.problems.push(`CRN ${crn}: ${error.message.split('\n')[0]}.`)
        cache.set(key, { text: oldText, checkedOn, retry: true })
      }
    }
  }

  for (const { row, key } of candidates) {
    const text = cache.get(key)?.text
    if (text) row['Course Description'] = text
  }
  return report
}
