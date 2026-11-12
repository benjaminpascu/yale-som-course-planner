/**
 * Updates the courses from the rest of Yale (every school except SOM) into
 * docs/data-samples/yale_courses_<term>.csv.
 *
 *   npm run update-yale-courses              # update every open term
 *   npm run update-yale-courses -- --check   # only show what would change
 *
 * Runs once a day on GitHub (.github/workflows/update-yale-courses.yml).
 * Needs the Yale API key in YALE_API_KEY (GitHub secret, or .env.local on a
 * computer). Full notes: docs/updating-course-data.md.
 *
 * Yale's Courses Web Service answers one school + subject at a time. Its
 * gateway spreads requests over several servers and (Nov 2026) only one of
 * them has data; the others answer "no courses". Every answer sets a cookie
 * (`_212f6`) naming the server, so each run first finds a server that answers
 * a question known to have courses (the CANARY), then sends its cookie with
 * every request so all of them go there. The canary is re-asked every
 * CHECK_EVERY questions; if it ever comes back empty, the run finds a working
 * server again and re-asks that batch. So an empty answer can be trusted.
 *
 * To stay gentle: school/subject pairs known to have courses are asked every
 * day; every other pair is re-checked once every SWEEP_DAYS days (a slice per
 * day). Roughly 1,000–1,500 requests a day.
 *
 * Options:
 *   --check               write nothing
 *   --force               write even when a term shrinks by more than half
 *   --full                ask every school/subject pair today (first run)
 *   --known               ask every pair known in any semester today (catch-up)
 *   --raw DIR             also save Yale's raw answers there (for checking)
 *   --summary-file PATH   write a one-line summary (used for the commit message)
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { diffCourses, parseCsv, termCodeFromFileName, termsToUpdate } from './lib/courseImport.js'
import {
  COURSES_URL,
  SUBJECTS_URL,
  YALE_API_SCHOOLS,
  YALE_COLUMNS,
  buildYaleRows,
  yaleFileName,
} from './lib/yaleImport.js'
import { fetchLawSections, LAW_SCHOOL } from './lib/lawImport.js'
import { bulletinUrl, parseBulletinDescription } from './lib/bulletinDescriptions.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DATA_DIR = path.join(ROOT, 'docs/data-samples')
const STATE_FILE = path.join(DATA_DIR, 'yale_subject_pairs.json')
// Subject code → name, for the Department filter ("Economics (ECON)").
const SUBJECT_NAMES_FILE = path.join(DATA_DIR, 'yale_subjects.json')
// Bulletin descriptions for courses Yale's API leaves without one (looked up once a month each).
const BULLETIN_FILE = path.join(DATA_DIR, 'yale_bulletin_descriptions.json')
const BULLETIN_REFRESH_DAYS = 30
const BULLETIN_MAX_LOOKUPS = 1500

const SWEEP_DAYS = 7
const CHECK_EVERY = 100
const FIND_SERVER_TRIES = 12
const PAUSE_MS = 150
// A question that always has courses while a term is open.
const CANARY = { subjectCode: 'ECON', school: 'YC' }

const args = process.argv.slice(2)
const checkOnly = args.includes('--check')
const force = args.includes('--force')
const full = args.includes('--full')
const knownOnly = args.includes('--known')
const rawIndex = args.indexOf('--raw')
const rawDir = rawIndex >= 0 ? args[rawIndex + 1] : null
const summaryIndex = args.indexOf('--summary-file')
const summaryFile = summaryIndex >= 0 ? args[summaryIndex + 1] : null

function apiKey() {
  if (process.env.YALE_API_KEY) return process.env.YALE_API_KEY.trim()
  const local = path.join(ROOT, '.env.local')
  if (fs.existsSync(local)) {
    const match = /^YALE_API_KEY=(.*)$/m.exec(fs.readFileSync(local, 'utf8'))
    if (match?.[1]?.trim()) return match[1].trim()
  }
  return null
}

const KEY = apiKey()
if (!KEY) {
  console.error('✖ No Yale API key: set YALE_API_KEY (GitHub secret) or add it to .env.local.')
  process.exit(1)
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
let requestCount = 0

/**
 * One GET to Yale, with a pinned server cookie if given. Returns the list and
 * the server cookie Yale set. A non-list answer or HTTP error is retried twice,
 * then throws (the key never appears in messages).
 */
async function getList(url, params, cookie = null) {
  const query = new URLSearchParams({ apikey: KEY, mode: 'json', ...params })
  let lastError
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      requestCount++
      const response = await fetch(`${url}?${query}`, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'SOMtimes course planner (somtimes.vercel.app)',
          ...(cookie ? { Cookie: cookie } : {}),
        },
        signal: AbortSignal.timeout(30_000),
      })
      if (!response.ok) throw new Error(`Yale answered ${response.status}`)
      const body = await response.json()
      if (!Array.isArray(body)) throw new Error("Yale's answer is not a list")
      const server = (response.headers.getSetCookie?.() ?? [])
        .map((c) => /^(_212f6=[^;]+)/.exec(c)?.[1])
        .find(Boolean)
      await sleep(PAUSE_MS)
      return { list: body, server: server ?? null }
    } catch (error) {
      lastError = error
      await sleep(2_000)
    }
  }
  throw lastError
}

/** Asks without a pinned server until a non-empty answer (the subject list has no pinning). */
async function askUntilFound(url, params, tries = FIND_SERVER_TRIES) {
  for (let attempt = 0; attempt < tries; attempt++) {
    const { list } = await getList(url, params)
    if (list.length > 0) return list
  }
  return []
}

/** Cookie for a Yale server that answers the canary for this term, or null. */
async function findWorkingServer(termCode) {
  for (let attempt = 0; attempt < FIND_SERVER_TRIES; attempt++) {
    const { list, server } = await getList(COURSES_URL, { ...CANARY, termCode })
    if (list.length > 0 && server) return server
  }
  return null
}

async function serverStillWorks(cookie, termCode) {
  const { list } = await getList(COURSES_URL, { ...CANARY, termCode }, cookie)
  return list.length > 0
}

const termLabel = (termCode) => `${termCode.endsWith('03') ? 'Fall' : 'Spring'} ${termCode.slice(0, 4)}`
const today = new Date()
const todayStamp = today.toISOString().slice(0, 10)
const dayNumber = Math.floor(today.getTime() / 86_400_000)

/** Stable number for a pair, so each pair is swept on the same day of the cycle. */
function sweepSlot(pairKey) {
  let hash = 0
  for (const char of pairKey) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return hash % SWEEP_DAYS
}

const subjectOf = (row) => row['Course Number'].split(' ')[0]
const pairKeyOf = (row) => `${row.School}|${subjectOf(row)}`

// SOM files decide which terms are open, like the SOM update.
const somTerms = fs
  .readdirSync(DATA_DIR)
  .map((name) => ({ name, termCode: termCodeFromFileName(name) }))
  .filter(({ termCode }) => termCode)
  .map(({ name, termCode }) => ({ termCode, rows: parseCsv(fs.readFileSync(path.join(DATA_DIR, name), 'utf8')).rows }))
const terms = termsToUpdate(somTerms, today)
  .filter(({ isNew }) => !isNew)
  .map(({ termCode }) => termCode)

const state = fs.existsSync(STATE_FILE) ? JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) : {}
const bulletin = fs.existsSync(BULLETIN_FILE) ? JSON.parse(fs.readFileSync(BULLETIN_FILE, 'utf8')) : {}
let bulletinLookups = 0

/** Description from Yale's Bulletin for a course number ('' if none), cached in BULLETIN_FILE. */
async function bulletinDescription(courseNumber) {
  const cached = bulletin[courseNumber]
  const fresh = cached && (today - new Date(cached.checked)) / 86_400_000 < BULLETIN_REFRESH_DAYS
  if (fresh || (cached && bulletinLookups >= BULLETIN_MAX_LOOKUPS)) return cached.text
  if (bulletinLookups >= BULLETIN_MAX_LOOKUPS) return ''
  bulletinLookups++
  try {
    const response = await fetch(bulletinUrl(courseNumber), {
      headers: { 'User-Agent': 'SOMtimes course planner (somtimes.vercel.app)' },
      signal: AbortSignal.timeout(20_000),
    })
    if (!response.ok) throw new Error(`catalog answered ${response.status}`)
    const text = parseBulletinDescription(await response.text())
    bulletin[courseNumber] = { text, checked: todayStamp }
    await sleep(PAUSE_MS)
    return text
  } catch {
    return cached?.text ?? ''
  }
}

/** Fills empty descriptions from the Bulletin (main number first, then cross-listings). */
async function fillFromBulletin(rows) {
  for (const row of rows) {
    if (row['Course Description'] || row.School === LAW_SCHOOL) continue
    const numbers = [row['Course Number'], ...(row['Cross Listings'] || '').split(';').map((n) => n.trim()).filter(Boolean)]
    for (const number of numbers) {
      const text = await bulletinDescription(number)
      if (text) {
        row['Course Description'] = text
        break
      }
    }
  }
}
// A school/subject pair with courses in one semester probably has some in the other too.
const knownAnywhere = new Set(Object.values(state).flatMap((term) => Object.keys(term.pairs ?? {})))
const failures = []
const summary = []
const subjectNames = fs.existsSync(SUBJECT_NAMES_FILE) ? JSON.parse(fs.readFileSync(SUBJECT_NAMES_FILE, 'utf8')) : {}

for (const termCode of terms) {
  const name = termLabel(termCode)
  const outputName = yaleFileName(termCode)
  const outputFile = path.join(DATA_DIR, outputName)
  const oldRows = fs.existsSync(outputFile) ? parseCsv(fs.readFileSync(outputFile, 'utf8')).rows : []
  const termState = state[termCode] ?? { pairs: {} }
  const firstRun = Object.keys(termState.pairs).length === 0

  let subjects
  try {
    const subjectList = await askUntilFound(SUBJECTS_URL, { termCode })
    for (const { code, description } of subjectList) if (code && description) subjectNames[code] = description.trim()
    subjects = subjectList.map((s) => s.code).filter(Boolean)
  } catch (error) {
    failures.push(`${name}: couldn't get Yale's subject list (${error.message}). Kept the current file.`)
    continue
  }
  if (subjects.length === 0) {
    failures.push(`${name}: Yale's subject list is empty. Kept the current file.`)
    continue
  }

  // Previous rows per school/subject pair: kept when Yale gives no answer for that pair.
  const oldByPair = new Map()
  for (const row of oldRows) {
    if (row.School === LAW_SCHOOL) continue
    const key = pairKeyOf(row)
    if (!oldByPair.has(key)) oldByPair.set(key, [])
    oldByPair.get(key).push(row)
  }

  const pairs = YALE_API_SCHOOLS.flatMap((school) => subjects.map((subject) => ({ school, subject, key: `${school}|${subject}` })))
  const toAsk = pairs.filter(({ key }) => {
    if (full || firstRun) return true
    const known = termState.pairs[key] || knownAnywhere.has(key)
    if (knownOnly) return known
    return known || sweepSlot(key) === dayNumber % SWEEP_DAYS
  })
  console.log(`\n${name}: asking Yale about ${toAsk.length} of ${pairs.length} school/subject pairs…`)

  let server = await findWorkingServer(termCode)
  if (!server) {
    failures.push(`${name}: no Yale server answered with courses. Kept the current file.`)
    continue
  }

  const rows = []
  const problems = []
  const raw = []
  let errors = 0
  const asked = new Set()
  // Batches of CHECK_EVERY questions; after each, make sure the server still answers.
  for (let start = 0; start < toAsk.length; start += CHECK_EVERY) {
    const batch = toAsk.slice(start, start + CHECK_EVERY)
    let answers
    for (let attempt = 0; attempt < 2; attempt++) {
      answers = []
      for (const pair of batch) {
        try {
          const { list } = await getList(COURSES_URL, { subjectCode: pair.subject, termCode, school: pair.school }, server)
          answers.push({ pair, sections: list })
        } catch (error) {
          answers.push({ pair, error })
        }
      }
      if (await serverStillWorks(server, termCode)) break
      console.log('  The Yale server stopped answering; finding another and re-asking this batch…')
      server = await findWorkingServer(termCode)
      if (!server) break
    }
    if (!server) {
      failures.push(`${name}: lost Yale's working server mid-run. Kept the current file.`)
      break
    }
    for (const { pair, sections, error } of answers) {
      const { school, key } = pair
      asked.add(key)
      if (error) {
        errors++
        problems.push(`${key}: ${error.message}`)
        rows.push(...(oldByPair.get(key) ?? []))
        continue
      }
      if (sections.length === 0) {
        delete termState.pairs[key]
        continue
      }
      raw.push(...sections.filter((s) => s.schoolCode === school))
      termState.pairs[key] = { lastSeen: todayStamp }
    }
  }
  if (!server) continue
  // Whole term at once, so cross-listed listings from different subjects merge into one class.
  const built = buildYaleRows(raw, termCode)
  problems.push(...built.problems)
  rows.push(...built.rows)
  if (rawDir) {
    fs.mkdirSync(rawDir, { recursive: true })
    fs.writeFileSync(path.join(rawDir, `${termCode}.json`), JSON.stringify(raw))
  }
  // Pairs not asked today keep their courses (listed first, so fresh rows win on the same ID).
  for (const [key, kept] of oldByPair) if (!asked.has(key)) rows.unshift(...kept)

  if (errors > toAsk.length / 2) {
    failures.push(`${name}: Yale gave errors for ${errors} of ${toAsk.length} questions. Kept the current file.`)
    continue
  }

  // Law School: its own public course list.
  try {
    const law = await fetchLawSections(termCode)
    if (law.rows.length > 0) rows.push(...law.rows)
    else rows.push(...oldRows.filter((row) => row.School === LAW_SCHOOL))
    problems.push(...law.problems.map((p) => `Law: ${p}`))
  } catch (error) {
    problems.push(`Law: couldn't read the Law course list (${error.message}); kept the previous Law courses.`)
    rows.push(...oldRows.filter((row) => row.School === LAW_SCHOOL))
  }

  // One row per course ID (a course can come back under two subjects).
  const unique = [...new Map(rows.map((row) => [row['Course ID'], row])).values()].sort(
    (a, b) => a.School.localeCompare(b.School) || a['Course Number'].localeCompare(b['Course Number']) || a.Section.localeCompare(b.Section),
  )
  await fillFromBulletin(unique)

  const { added, removed, changed } = diffCourses(oldRows, unique)
  console.log(`  ${unique.length} course sections (was ${oldRows.length}); ${added.length} new, ${removed.length} removed, ${changed.length} changed`)
  for (const problem of problems.slice(0, 20)) console.log(`  ⚠️  ${problem}`)
  if (problems.length > 20) console.log(`  … and ${problems.length - 20} more problems`)

  if (unique.length === 0) {
    failures.push(`${name}: no courses at all. Kept the current file.`)
    continue
  }
  if (oldRows.length > 0 && unique.length < oldRows.length * 0.5 && !force) {
    failures.push(`${name}: far fewer courses than before (${unique.length} vs ${oldRows.length}). Kept the current file; run with --force if this is really right.`)
    continue
  }

  state[termCode] = termState
  const csv = toYaleCsv(unique)
  if (fs.existsSync(outputFile) && fs.readFileSync(outputFile, 'utf8') === csv) {
    console.log('  No changes.')
    continue
  }
  summary.push(`${name}: ${[added.length && `${added.length} added`, removed.length && `${removed.length} removed`, changed.length && `${changed.length} changed`].filter(Boolean).join(', ') || 'details updated'}`)
  if (!checkOnly) {
    fs.writeFileSync(outputFile, csv)
    console.log(`  ✔ Wrote docs/data-samples/${outputName}`)
  }
}

// Drop state for terms that no longer have a file being updated.
for (const termCode of Object.keys(state)) if (!terms.includes(termCode)) delete state[termCode]
if (!checkOnly) {
  fs.writeFileSync(STATE_FILE, `${JSON.stringify(state, null, 1)}\n`)
  const sortedNames = Object.fromEntries(Object.entries(subjectNames).sort(([a], [b]) => a.localeCompare(b)))
  fs.writeFileSync(SUBJECT_NAMES_FILE, `${JSON.stringify(sortedNames, null, 1)}\n`)
  const sortedBulletin = Object.fromEntries(Object.entries(bulletin).sort(([a], [b]) => a.localeCompare(b)))
  fs.writeFileSync(BULLETIN_FILE, `${JSON.stringify(sortedBulletin, null, 1)}\n`)
}
if (bulletinLookups > 0) console.log(`${bulletinLookups} Bulletin description lookups.`)

console.log(`\n${requestCount} requests to Yale.`)
if (checkOnly) console.log('--check: nothing was written.')
if (summaryFile && summary.length > 0) fs.writeFileSync(summaryFile, `${summary.join('; ')}\n`)

if (failures.length > 0) {
  console.error('\n✖ Some terms were not updated:')
  for (const failure of failures) console.error(`  • ${failure}`)
  process.exit(1)
}
console.log(summary.length > 0 ? `Done: ${summary.join('; ')}` : 'Done: everything already up to date.')

function csvField(value) {
  const raw = value == null ? '' : String(value)
  return /[",\n\r]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw
}

function toYaleCsv(rows) {
  const lines = [YALE_COLUMNS.join(',')]
  for (const row of rows) lines.push(YALE_COLUMNS.map((column) => csvField(row[column])).join(','))
  return `${lines.join('\n')}\n`
}

