/**
 * Turns Yale SOM's course feed into one term CSV in the app's format, and
 * works out which terms to update. Used by scripts/update-courses.js; see
 * docs/updating-course-data.md.
 */
import Papa from 'papaparse'

/** Columns of docs/data-samples/courses_master_<term>.csv, in file order. */
export const OUTPUT_COLUMNS = [
  'Bid Or Permission',
  'Course Category',
  'Course Description',
  'Course ID',
  'Course Number',
  'Course Session',
  'Course Session End Date',
  'Course Session Start date',
  'Course Title',
  'Course Type',
  'Faculty 1',
  'Faculty 1 Email',
  'Old Syllabus',
  'Room',
  'Section',
  'Syllabus',
  'TermCode',
  'Units',
  'Visible',
  'days_clean',
  'start_24h',
  'end_24h',
  'tags',
]

/**
 * Yale course feed: one JSON list of every course in a term. Public, no login.
 * Found via Prof. Kyle Jensen's yale-som-course-search script.
 *
 * @param {string} termCode — YYYY01 spring, YYYY03 fall
 */
export function feedUrl(termCode) {
  return `https://som.yale.edu/courses/session-items/${termCode}`
}

/** Feed field for each column copied straight from Yale. */
const FEED_FIELDS = {
  'Bid Or Permission': 'bidOrPermission',
  'Course Category': 'courseCategory',
  'Course Description': 'courseDescription',
  'Course ID': 'courseID',
  'Course Number': 'courseNumber',
  'Course Session': 'courseSession',
  'Course Session End Date': 'courseSessionEndDate',
  'Course Session Start date': 'courseSessionStartDate',
  'Course Title': 'courseTitle',
  'Course Type': 'courseType',
  'Faculty 1': 'faculty1',
  'Faculty 1 Email': 'faculty1Email',
  'Old Syllabus': 'oldSyllabus',
  Room: 'room',
  Section: 'section',
  Syllabus: 'syllabus',
  TermCode: 'termCode',
  Units: 'units',
  Visible: 'visible',
}

/** Tag written for each Yale course attribute code, in the order tags are listed. */
export const TAG_ATTRIBUTES = [
  { attribute: 'MGMS', tag: 'STEM' },
  { attribute: 'MGGE', tag: 'GBS Req' },
]

const DAY_CODES = { M: 'Mo', T: 'Tu', W: 'We', Th: 'Th', F: 'Fr', Sa: 'Sa', Su: 'Su' }

/** @param {string} csvText */
export function parseCsv(csvText) {
  const text = csvText.replace(/^\uFEFF/, '')
  const { data, meta } = Papa.parse(text, { header: true, skipEmptyLines: true })
  return { rows: data, headers: meta.fields ?? [] }
}

/**
 * "1:05 PM" → "13:05". Returns null when the value is not a 12-hour time.
 *
 * @param {string} value
 */
export function to24h(value) {
  const match = /^(\d{1,2}):(\d{2})\s*([AP])M$/i.exec(value.trim())
  if (!match) return null
  let hour = Number(match[1]) % 12
  if (match[3].toUpperCase() === 'P') hour += 12
  return `${String(hour).padStart(2, '0')}:${match[2]}`
}

/**
 * Yale "daysTimes" (e.g. "M  W 1:00 PM-2:20 PM") → app meeting fields.
 * Empty input gives empty fields; unreadable input gives null.
 *
 * @param {string | null | undefined} daytimes
 * @returns {{ days_clean: string, start_24h: string, end_24h: string } | null}
 */
export function parseDaytimes(daytimes) {
  const raw = (daytimes ?? '').trim()
  if (!raw) return { days_clean: '', start_24h: '', end_24h: '' }

  const match = /^((?:Th|Sa|Su|M|T|W|F)(?:\s+(?:Th|Sa|Su|M|T|W|F))*)\s+(\d{1,2}:\d{2}\s*[AP]M)\s*-\s*(\d{1,2}:\d{2}\s*[AP]M)$/i.exec(raw)
  if (!match) return null

  const days = match[1].split(/\s+/).map((day) => DAY_CODES[day[0].toUpperCase() + day.slice(1).toLowerCase()])
  const start = to24h(match[2])
  const end = to24h(match[3])
  if (days.some((day) => !day) || !start || !end) return null
  return { days_clean: days.join(','), start_24h: start, end_24h: end }
}

/** @param {unknown} value */
function text(value) {
  return value == null ? '' : String(value)
}

/**
 * Builds the term CSV rows from Yale's feed items. Courses Yale marks hidden
 * (visible ≠ 1) are left out.
 *
 * @param {Record<string, unknown>[]} items — the feed's data.items
 * @returns {{ rows: Record<string, string>[], problems: string[] }}
 */
export function buildCourseRows(items) {
  const problems = []
  const seen = new Set()
  const rows = []

  for (const item of items) {
    if (text(item.visible).trim() !== '1') continue
    const daytimes = text(item.daysTimes).trim()

    const row = {}
    for (const [column, field] of Object.entries(FEED_FIELDS)) row[column] = text(item[field])
    // The feed separates course types with "|"; the app's files use ",".
    row['Course Type'] = row['Course Type'].split('|').join(',')

    const id = row['Course ID'].trim()
    if (!id) {
      problems.push(`A course in Yale's list has no Course ID (${row['Course Number']} ${row['Course Title']}); skipped.`)
      continue
    }
    if (seen.has(id)) {
      problems.push(`Course ID ${id} (${row['Course Number']}) appears more than once in Yale's list; kept the first.`)
      continue
    }
    seen.add(id)

    let meeting = parseDaytimes(daytimes)
    if (!meeting) {
      problems.push(`Could not read the meeting time "${daytimes}" for ${row['Course Number']} section ${row.Section}; it will show as "No time defined".`)
      meeting = { days_clean: '', start_24h: '', end_24h: '' }
    }
    Object.assign(row, meeting)

    const attributes = text(item.courseAttributes).split('|').map((code) => code.trim())
    row.tags = TAG_ATTRIBUTES.filter(({ attribute }) => attributes.includes(attribute)).map(({ tag }) => tag).join(';')
    rows.push(row)
  }

  return { rows, problems }
}

/**
 * Applies manual fixes from docs/data-samples/course_overrides.csv.
 * Reports fixes whose course is gone and fixes Yale's list now matches.
 *
 * @param {Record<string, string>[]} rows
 * @param {Record<string, string>[]} overrides — TermCode, Course ID, Column, Value, Note
 * @param {string} termCode
 */
export function applyOverrides(rows, overrides, termCode) {
  const byId = new Map(rows.map((row) => [row['Course ID'].trim(), row]))
  const applied = []
  const notes = []

  for (const fix of overrides) {
    if (fix.TermCode?.trim() !== termCode) continue
    const id = fix['Course ID']?.trim()
    const column = fix.Column?.trim()
    const row = byId.get(id)
    if (!row) {
      notes.push(`Override for Course ID ${id} (${column}) skipped: that course is no longer in Yale's list. You can delete that line.`)
      continue
    }
    if (!OUTPUT_COLUMNS.includes(column)) {
      notes.push(`Override for ${row['Course Number']} skipped: "${column}" is not a column name.`)
      continue
    }
    if (row[column] === fix.Value) {
      notes.push(`Override for ${row['Course Number']} ${column} is no longer needed: Yale's list now says "${fix.Value}". You can delete that line.`)
      continue
    }
    applied.push(`${row['Course Number']} section ${row.Section}: ${column} "${row[column]}" → "${fix.Value}"${fix.Note ? ` (${fix.Note})` : ''}`)
    row[column] = fix.Value
  }

  return { applied, notes }
}

/** Short course label for reports. */
function label(row) {
  return `${row['Course Number']} section ${row.Section} — ${row['Course Title']}`
}

/**
 * What changes between the current term CSV and the new one, by Course ID.
 *
 * @param {Record<string, string>[]} oldRows
 * @param {Record<string, string>[]} newRows
 */
export function diffCourses(oldRows, newRows) {
  const oldById = new Map(oldRows.map((row) => [row['Course ID'].trim(), row]))
  const newById = new Map(newRows.map((row) => [row['Course ID'].trim(), row]))

  const added = newRows.filter((row) => !oldById.has(row['Course ID'].trim())).map(label)
  const removed = oldRows.filter((row) => !newById.has(row['Course ID'].trim())).map(label)
  const changed = []

  for (const row of newRows) {
    const old = oldById.get(row['Course ID'].trim())
    if (!old) continue
    const fields = OUTPUT_COLUMNS.filter((column) => (old[column] ?? '') !== (row[column] ?? ''))
    if (fields.length === 0) continue
    const details = fields.map((column) =>
      column === 'Course Description'
        ? 'description updated'
        : `${column}: "${old[column] ?? ''}" → "${row[column] ?? ''}"`,
    )
    changed.push(`${label(row)}: ${details.join('; ')}`)
  }

  return { added, removed, changed }
}

/** @param {string} value */
function csvField(value) {
  const text = value ?? ''
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/**
 * Writes rows in the same CSV style as the existing term files (quotes only
 * where needed, \n between rows, no byte-order mark).
 *
 * @param {Record<string, string>[]} rows
 */
export function toCsv(rows) {
  const lines = [OUTPUT_COLUMNS.join(',')]
  for (const row of rows) lines.push(OUTPUT_COLUMNS.map((column) => csvField(row[column])).join(','))
  return `${lines.join('\n')}\n`
}

/**
 * "202701" → "spring2027"; null for codes the app does not use.
 *
 * @param {string} termCode
 */
export function termFileSlug(termCode) {
  const match = /^(\d{4})(01|03)$/.exec(termCode)
  if (!match) return null
  return `${match[2] === '03' ? 'fall' : 'spring'}${match[1]}`
}

/**
 * The term after this one: fall → next spring, spring → fall.
 *
 * @param {string} termCode
 */
export function nextTermCode(termCode) {
  const year = Number(termCode.slice(0, 4))
  return termCode.endsWith('03') ? `${year + 1}01` : `${year}03`
}

/**
 * Term running (or next up) on a date: Jan–May spring, Jun–Dec fall.
 *
 * @param {Date} today
 */
export function currentTermCode(today) {
  const year = today.getFullYear()
  return today.getMonth() < 5 ? `${year}01` : `${year}03`
}

/** @param {Date} date → "YYYYMMDD" */
function dayStamp(date) {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
}

/**
 * True once the last class of a term is over. Yale dates look like
 * "20270504 000000.000". A term with no end dates is never over.
 *
 * @param {Record<string, string>[]} rows — rows of one term CSV
 * @param {Date} today
 */
export function termHasEnded(rows, today) {
  const ends = rows.map((row) => /^\d{8}/.exec(row['Course Session End Date'] ?? '')?.[0]).filter(Boolean)
  if (ends.length === 0) return false
  return ends.sort().at(-1) < dayStamp(today)
}

/**
 * Which terms to fetch: every saved term that hasn't ended (finished terms
 * stay frozen), plus the next two after the newest saved term so new
 * semesters are picked up as soon as Yale posts them.
 *
 * @param {{ termCode: string, rows: Record<string, string>[] }[]} savedTerms
 * @param {Date} today
 * @returns {{ termCode: string, isNew: boolean }[]}
 */
export function termsToUpdate(savedTerms, today) {
  const open = savedTerms
    .filter(({ rows }) => !termHasEnded(rows, today))
    .map(({ termCode }) => ({ termCode, isNew: false }))

  const newest = savedTerms.map(({ termCode }) => termCode).sort().at(-1)
  const first = newest ? nextTermCode(newest) : currentTermCode(today)
  const probes = [first, nextTermCode(first)].map((termCode) => ({ termCode, isNew: true }))

  return [...open, ...probes].sort((a, b) => a.termCode.localeCompare(b.termCode))
}

/**
 * "courses_master_spring2027.csv" → "202701"; null for other names.
 *
 * @param {string} fileName
 */
export function termCodeFromFileName(fileName) {
  const match = /^courses_master_(fall|spring)(\d{4})\.csv$/.exec(fileName)
  if (!match) return null
  return `${match[2]}${match[1] === 'fall' ? '03' : '01'}`
}
