/**
 * Owner-only exports for the hidden ?export page: the full course list, or one
 * saved plan's courses, as CSV with each course's details and description.
 */
import Papa from 'papaparse'
import { formatTermLabel } from './academicYear.js'
import { isSomCourse, schoolLabel } from './schools.js'

function meetingTimes(course) {
  if (!course.meetingDays?.length || !course.startTime || !course.endTime) return ''
  return `${course.meetingDays.join(',')} ${course.startTime}–${course.endTime}`
}

const COLUMNS = [
  ['Term', (c) => formatTermLabel(c.termCode)],
  ['Session', (c) => c.session],
  ['School', (c) => schoolLabel(c.school)],
  ['Course Number', (c) => c.courseNumber],
  ['Section', (c) => c.section],
  ['Title', (c) => c.title],
  ['Instructor', (c) => c.faculty],
  ['Meeting Times', meetingTimes],
  // Other schools' files carry no SOM units.
  ['Units', (c) => (isSomCourse(c) ? String(c.units) : '')],
  ['Category', (c) => c.category],
  ['Tags', (c) => (c.tags ?? []).join('; ')],
  ['Bid or Permission', (c) => c.bidOrPermission],
  ['Cross Listings', (c) => (c.crossListings ?? []).join('; ')],
  ['Prerequisites', (c) => c.prerequisites],
  ['Description', (c) => c.description],
  ['Syllabus', (c) => c.syllabusUrl ?? ''],
  ['Course Page', (c) => c.coursePageUrl ?? ''],
]

/** Courses (one row per section) as CSV text; `sort` orders by term, school, number. */
export function buildCourseListCsv(courses, { sort = true } = {}) {
  const sorted = !sort ? courses : [...courses].sort(
    (a, b) =>
      a.termCode.localeCompare(b.termCode) ||
      Number(!isSomCourse(a)) - Number(!isSomCourse(b)) ||
      a.courseNumber.localeCompare(b.courseNumber, undefined, { numeric: true }) ||
      a.section.localeCompare(b.section),
  )
  return Papa.unparse({
    fields: COLUMNS.map(([name]) => name),
    data: sorted.map((course) => COLUMNS.map(([, value]) => value(course) ?? '')),
  })
}

/** A saved plan's courses (in plan order), skipping any no longer in the data. */
export function planCourses(plan, coursesById) {
  return plan.courseIds.map((id) => coursesById.get(id)).filter(Boolean)
}

export function safeFileName(name) {
  return name.trim().replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '') || 'plan'
}

/** Save text as a file in the browser. */
export function downloadText(text, fileName, type) {
  // The BOM makes Excel read accents and curly quotes correctly.
  const url = URL.createObjectURL(new Blob(['\ufeff' + text], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
