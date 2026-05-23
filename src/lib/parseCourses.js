import Papa from 'papaparse'
import { REQUIRED_COURSE_COLUMNS, validateCsvColumns } from './csvColumns.js'

/**
 * @param {string} csvText
 * @returns {{ ok: true, headers: string[] } | { ok: false, missing: string[] }}
 */
export function validateCoursesCsvColumns(csvText) {
  const firstLine = csvText.split(/\r?\n/)[0]
  if (!firstLine) {
    return { ok: false, missing: REQUIRED_COURSE_COLUMNS }
  }
  const { data } = Papa.parse(firstLine, { header: false })
  const headers = data[0] ?? []
  return validateCsvColumns(headers, REQUIRED_COURSE_COLUMNS)
}

/** @param {string | undefined} value — `YYYYMMDD HHMMSS.SSS` */
export function parseSessionDate(value) {
  const raw = value?.trim()
  if (!raw) return null

  const datePart = raw.split(/\s+/)[0]
  if (datePart.length !== 8) return null

  const year = datePart.slice(0, 4)
  const month = datePart.slice(4, 6)
  const day = datePart.slice(6, 8)
  return `${year}-${month}-${day}`
}

/** @param {string | undefined} value */
function splitCsvList(value) {
  const raw = value?.trim()
  if (!raw) return []
  return raw.split(',').map((part) => part.trim()).filter(Boolean)
}

/** @param {string | undefined} value */
function optionalTime(value) {
  const raw = value?.trim()
  return raw || null
}

/** @param {{ meetingDays?: string[], startTime?: string | null, endTime?: string | null }} course */
export function hasMeetingTime(course) {
  const hasDays = Array.isArray(course.meetingDays)
    ? course.meetingDays.length > 0
    : Boolean(course.meetingDays)
  return hasDays && Boolean(course.startTime) && Boolean(course.endTime)
}

/** @param {import('papaparse').ParseResult<Record<string, string>>['data'][number]} row */
function rowToCourse(row) {
  const syllabus =
    row.Syllabus?.trim() || row['Old Syllabus']?.trim() || null

  return {
    courseId: row['Course ID']?.trim() ?? '',
    courseNumber: row['Course Number']?.trim() ?? '',
    title: row['Course Title']?.trim() ?? '',
    description: row['Course Description']?.trim() ?? '',
    units: Number.parseFloat(row.Units) || 0,
    termCode: row.TermCode?.trim() ?? '',
    session: row['Course Session']?.trim() ?? '',
    sessionStart: parseSessionDate(row['Course Session Start date']),
    sessionEnd: parseSessionDate(row['Course Session End Date']),
    category: row['Course Category']?.trim() ?? '',
    courseType: splitCsvList(row['Course Type']),
    bidOrPermission: row['Bid Or Permission']?.trim() ?? '',
    faculty: row['Faculty 1']?.trim() ?? '',
    facultyEmail: row['Faculty 1 Email']?.trim() ?? '',
    room: row.Room?.trim() ?? '',
    section: row.Section?.trim() ?? '',
    syllabusUrl: syllabus,
    meetingDays: splitCsvList(row.days_clean),
    startTime: optionalTime(row.start_24h),
    endTime: optionalTime(row.end_24h),
    visible: row.Visible === '1',
  }
}

/** App course → Supabase `courses` row (snake_case). */
export function courseToDbRow(course) {
  return {
    course_id: course.courseId,
    course_number: course.courseNumber,
    title: course.title,
    description: course.description || null,
    units: course.units,
    term_code: course.termCode,
    session: course.session,
    session_start: course.sessionStart,
    session_end: course.sessionEnd,
    category: course.category || null,
    course_type: course.courseType,
    bid_or_permission: course.bidOrPermission || null,
    faculty_name: course.faculty || null,
    faculty_email: course.facultyEmail || null,
    room: course.room || null,
    section: course.section || null,
    syllabus_url: course.syllabusUrl,
    meeting_days: course.meetingDays,
    start_time: course.startTime,
    end_time: course.endTime,
    visible: course.visible,
  }
}

/** Supabase row → app course (camelCase). */
export function dbRowToCourse(row) {
  return {
    courseId: row.course_id,
    courseNumber: row.course_number,
    title: row.title,
    description: row.description ?? '',
    units: Number(row.units) || 0,
    termCode: row.term_code,
    session: row.session,
    sessionStart: row.session_start,
    sessionEnd: row.session_end,
    category: row.category ?? '',
    courseType: row.course_type ?? [],
    bidOrPermission: row.bid_or_permission ?? '',
    faculty: row.faculty_name ?? '',
    facultyEmail: row.faculty_email ?? '',
    room: row.room ?? '',
    section: row.section ?? '',
    syllabusUrl: row.syllabus_url,
    meetingDays: row.meeting_days ?? [],
    startTime: row.start_time,
    endTime: row.end_time,
    visible: row.visible,
  }
}

/**
 * Parse courses_master_new.csv into app course objects.
 * Only includes rows where Visible === "1".
 * @param {string} csvText
 * @param {{ validate?: boolean }} [options]
 */
export function parseCoursesCsv(csvText, { validate = true } = {}) {
  if (validate) {
    const columnCheck = validateCoursesCsvColumns(csvText)
    if (!columnCheck.ok) {
      throw new Error(
        `Courses CSV is missing required columns: ${columnCheck.missing.join(', ')}`,
      )
    }
  }

  const { data, errors } = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
  })

  if (errors.length > 0) {
    console.warn('CSV parse warnings:', errors)
  }

  return data.filter((row) => row.Visible === '1').map(rowToCourse)
}

/** @param {string} isoDate — `YYYY-MM-DD` */
function formatShortDate(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(year, month - 1, day))
}

/** Semester run dates when a course has no weekly meeting time. */
export function formatSessionRange(course) {
  if (!course.sessionStart || !course.sessionEnd) return null
  return `${formatShortDate(course.sessionStart)} – ${formatShortDate(course.sessionEnd)}`
}

/**
 * Weekly meeting schedule when present; otherwise semester date range.
 */
export function formatSchedule(course) {
  if (!hasMeetingTime(course)) {
    return formatSessionRange(course) ?? 'No weekly meeting time'
  }

  const days = course.meetingDays.join(',')
  const start = course.startTime
  const end = course.endTime

  if (start && end) return `${days} · ${start}–${end}`
  return days
}
