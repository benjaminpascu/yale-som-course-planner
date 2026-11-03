/**
 * Turns the three Yale SOM website exports (full course list, STEM list,
 * GBS list) into one term CSV in the app's format. Used by
 * scripts/update-courses.js; see docs/updating-course-data.md.
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

/** Columns copied straight from the Yale export. */
export const COPIED_COLUMNS = OUTPUT_COLUMNS.slice(0, OUTPUT_COLUMNS.indexOf('days_clean'))

/** Columns the Yale export must have (copied columns + meeting-time columns). */
export const SOURCE_COLUMNS = [...COPIED_COLUMNS, 'Daytimes']

/** Tag written for each requirement list, in the order tags are listed. */
export const TAG_LISTS = [
  { key: 'stem', tag: 'STEM' },
  { key: 'gbs', tag: 'GBS Req' },
]

const DAY_CODES = { M: 'Mo', T: 'Tu', W: 'We', Th: 'Th', F: 'Fr', Sa: 'Sa', Su: 'Su' }

/**
 * Which export a file is, from its name: "stem" or "gbs" in the name marks a
 * requirement list; anything else is the full course list.
 *
 * @param {string} fileName
 * @returns {'stem' | 'gbs' | 'full'}
 */
export function classifyExportFile(fileName) {
  const name = fileName.toLowerCase()
  if (name.includes('stem')) return 'stem'
  if (name.includes('gbs')) return 'gbs'
  return 'full'
}

/** @param {string} csvText */
export function parseCsv(csvText) {
  const text = csvText.replace(/^﻿/, '')
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
 * Yale "Daytimes" (e.g. "M  W 1:00 PM-2:20 PM") → app meeting fields.
 * Empty input gives empty fields; unreadable input gives null.
 *
 * @param {string | undefined} daytimes
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

/**
 * Meeting fields for one export row: "Daytimes" first, then the separate
 * "Timings" columns Yale fills for a few courses.
 *
 * @param {Record<string, string>} row
 */
export function meetingFields(row) {
  const fromDaytimes = parseDaytimes(row.Daytimes)
  if (fromDaytimes?.days_clean) return fromDaytimes

  const day = row['Timings Day']?.trim()
  const start = to24h(row['Timings StartTime'] ?? '')
  const end = to24h(row['Timings EndTime'] ?? '')
  if (day && start && end) return { days_clean: day, start_24h: start, end_24h: end }

  return fromDaytimes
}

/**
 * Builds the term CSV rows from the three exports. Every row is made
 * visible (Visible = 1), whatever the export says.
 *
 * @param {{ full: Record<string, string>[], stem: Record<string, string>[], gbs: Record<string, string>[] }} exportsByKind
 * @returns {{ rows: Record<string, string>[], problems: string[] }}
 */
export function buildCourseRows(exportsByKind) {
  const problems = []
  const fullIds = new Set(exportsByKind.full.map((row) => row['Course ID']?.trim()))

  const tagIds = TAG_LISTS.map(({ key, tag }) => {
    const ids = new Set(exportsByKind[key].map((row) => row['Course ID']?.trim()))
    for (const row of exportsByKind[key]) {
      if (!fullIds.has(row['Course ID']?.trim())) {
        problems.push(`${tag} list has ${row['Course Number']} section ${row.Section} (ID ${row['Course ID']}), which is not in the full course list.`)
      }
    }
    return { tag, ids }
  })

  const seen = new Set()
  const rows = exportsByKind.full.map((source) => {
    const id = source['Course ID']?.trim()
    if (seen.has(id)) problems.push(`Course ID ${id} (${source['Course Number']}) appears more than once in the full list.`)
    seen.add(id)

    const row = {}
    for (const column of COPIED_COLUMNS) row[column] = source[column] ?? ''
    // Show every course, even ones Yale's export marks hidden: the SOM site
    // lists some of them (e.g. GNAM courses).
    row.Visible = '1'

    let meeting = meetingFields(source)
    if (!meeting) {
      problems.push(`Could not read the meeting time "${source.Daytimes}" for ${source['Course Number']} section ${source.Section}; it will show as "No time defined".`)
      meeting = { days_clean: '', start_24h: '', end_24h: '' }
    }
    Object.assign(row, meeting)

    row.tags = tagIds.filter(({ ids }) => ids.has(id)).map(({ tag }) => tag).join(';')
    return row
  })

  return { rows, problems }
}

/**
 * Applies manual fixes from docs/data-samples/course_overrides.csv.
 * Reports fixes whose course is gone and fixes Yale's export now matches.
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
      notes.push(`Override for ${row['Course Number']} ${column} is no longer needed: Yale's export now says "${fix.Value}". You can delete that line.`)
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
