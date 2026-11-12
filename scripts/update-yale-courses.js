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
 * Yale's Courses Web Service answers one school + subject at a time, and often
 * answers "no courses" for a while before the real list comes back (sometimes
 * every third answer, sometimes after 4–5 empty ones), so each question is
 * asked up to TRIES times in a row before "no courses" is believed. To stay gentle:
 * school/subject pairs known to have courses are asked every REFRESH_DAYS days;
 * every other pair is re-checked once every SWEEP_DAYS days (a slice per day). A pair that
 * comes back empty keeps its previous courses until it has been empty for
 * DROP_AFTER_EMPTY_DAYS days in a row.
 *
 * Options:
 *   --check               write nothing
 *   --force               write even when a term shrinks by more than half
 *   --full                ask every school/subject pair today (first run)
 *   --known               ask every pair known in any semester today (catch-up)
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

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DATA_DIR = path.join(ROOT, 'docs/data-samples')
const STATE_FILE = path.join(DATA_DIR, 'yale_subject_pairs.json')
// Subject code → name, for the Department filter ("Economics (ECON)").
const SUBJECT_NAMES_FILE = path.join(DATA_DIR, 'yale_subjects.json')

const SWEEP_DAYS = 28
const REFRESH_DAYS = 2
const DROP_AFTER_EMPTY_DAYS = 7
const TRIES = 6
const PAUSE_MS = 250

const args = process.argv.slice(2)
const checkOnly = args.includes('--check')
const force = args.includes('--force')
const full = args.includes('--full')
const knownOnly = args.includes('--known')
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

/** One GET to Yale; a non-list answer or HTTP error throws (the key never appears in messages). */
async function getList(url, params) {
  const query = new URLSearchParams({ apikey: KEY, mode: 'json', ...params })
  requestCount++
  const response = await fetch(`${url}?${query}`, {
    headers: { Accept: 'application/json', 'User-Agent': 'SOMtimes course planner (somtimes.vercel.app)' },
    signal: AbortSignal.timeout(30_000),
  })
  if (!response.ok) throw new Error(`Yale answered ${response.status}`)
  const body = await response.json()
  if (!Array.isArray(body)) throw new Error("Yale's answer is not a list")
  await sleep(PAUSE_MS)
  return body
}

/** Asks up to TRIES times in a row; [] only when every answer was empty. */
async function askUntilFound(url, params) {
  let lastError
  for (let attempt = 0; attempt < TRIES; attempt++) {
    try {
      const list = await getList(url, params)
      if (list.length > 0) return list
    } catch (error) {
      lastError = error
    }
  }
  if (lastError) throw lastError
  return []
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
    if (known) return sweepSlot(key) % REFRESH_DAYS === dayNumber % REFRESH_DAYS
    return sweepSlot(key) === dayNumber % SWEEP_DAYS
  })
  console.log(`\n${name}: asking Yale about ${toAsk.length} of ${pairs.length} school/subject pairs…`)

  const rows = []
  const problems = []
  let errors = 0
  const asked = new Set()
  for (const { school, subject, key } of toAsk) {
    asked.add(key)
    let sections
    try {
      sections = await askUntilFound(COURSES_URL, { subjectCode: subject, termCode, school })
    } catch (error) {
      errors++
      problems.push(`${key}: ${error.message}`)
      rows.push(...(oldByPair.get(key) ?? []))
      continue
    }
    const known = termState.pairs[key]
    if (sections.length === 0) {
      if (known) {
        known.emptyDays = (known.emptyDays ?? 0) + 1
        if (known.emptyDays >= DROP_AFTER_EMPTY_DAYS) delete termState.pairs[key]
        else rows.push(...(oldByPair.get(key) ?? []))
      }
      continue
    }
    const built = buildYaleRows(sections, termCode)
    problems.push(...built.problems.map((p) => `${key}: ${p}`))
    rows.push(...built.rows.filter((row) => row.School === school))
    termState.pairs[key] = { lastSeen: todayStamp, emptyDays: 0 }
  }
  // Pairs not asked today keep their courses.
  for (const [key, kept] of oldByPair) if (!asked.has(key)) rows.push(...kept)

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
}

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

