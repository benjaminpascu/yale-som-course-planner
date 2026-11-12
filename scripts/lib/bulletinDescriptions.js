/**
 * Course descriptions from Yale's Bulletin (catalog.yale.edu), for courses
 * whose description is missing in Yale's Courses Web Service (e.g. Jackson,
 * Architecture, Music). Uses the catalog's public per-course lookup (the one
 * its course pop-ups use); no login, no key.
 */
import { setTimeout as pause } from 'node:timers/promises'
import { htmlToText } from './yaleImport.js'

const REFRESH_DAYS = 30
const MAX_LOOKUPS = 1500

/** Catalog lookup for one course number, e.g. "GLBL 5015". */
export function bulletinUrl(courseNumber) {
  return `https://catalog.yale.edu/ribbit/index.cgi?page=getcourse.rjs&code=${encodeURIComponent(courseNumber)}`
}

/**
 * The description text from a catalog lookup answer, or '' when the course
 * isn't in the Bulletin. Drops the credit note and meeting time the catalog
 * appends ("½ Course cr", "Th 3:30pm-6pm").
 *
 * @param {string} xml
 */
export function parseBulletinDescription(xml) {
  const match = /<p class="courseblockdesc">([\s\S]*?)<\/p>/.exec(xml ?? '')
  if (!match) return ''
  const body = match[1].split(/<span class="keeptogether"|<br\s*\/?>/)[0]
  return htmlToText(body).replace(/[ \s]+$/, '').trim()
}

/** Share the Bulletin cache and request limit across every term in a run. */
export function createBulletinLookup(cache, today) {
  const checked = today.toISOString().slice(0, 10)
  let lookups = 0

  async function description(courseNumber) {
    const cached = cache[courseNumber]
    const fresh = cached && (today - new Date(cached.checked)) / 86_400_000 < REFRESH_DAYS
    if (fresh || lookups >= MAX_LOOKUPS) return cached?.text ?? ''

    lookups++
    try {
      const response = await fetch(bulletinUrl(courseNumber), {
        headers: { 'User-Agent': 'SOMtimes course planner (somtimes.vercel.app)' },
        signal: AbortSignal.timeout(20_000),
      })
      if (!response.ok) return cached?.text ?? ''
      const text = parseBulletinDescription(await response.text())
      cache[courseNumber] = { text, checked }
      await pause(150)
      return text
    } catch {
      return cached?.text ?? ''
    }
  }

  return { description, get lookups() { return lookups } }
}

/** Keep protected published text, then try the main and cross-listed Bulletin numbers. */
export async function fillMissingDescriptions(rows, lookup, previous) {
  for (const row of rows) {
    if (row['Course Description']?.trim()) continue
    const published = previous(row)
    if (published?.trim()) {
      row['Course Description'] = published
      continue
    }

    const crossListings = (row['Cross Listings'] || '').split(';').map(number => number.trim()).filter(Boolean)
    for (const number of [row['Course Number'], ...crossListings]) {
      const description = await lookup(number)
      if (description) {
        row['Course Description'] = description
        break
      }
    }
  }
}
