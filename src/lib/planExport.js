import Papa from 'papaparse'
import { bidBadge } from './courseDisplay.js'
import { formatSchedule } from './parseCourses.js'
import { formatSessionLabel } from './sessionDisplay.js'

const EXPORT_COLUMNS = [
  'Plan name',
  'Academic year',
  'Course Number',
  'Course Title',
  'Faculty',
  'Session',
  'Units',
  'Schedule',
  'Bid or permission',
  'Room',
]

/**
 * @param {import('./parseCourses.js').Course[]} courses
 * @param {{ planName?: string, academicYear?: string | null }} meta
 */
export function buildPlanCsv(courses, { planName = 'My plan', academicYear = null } = {}) {
  const rows = courses.map((course) => ({
    'Plan name': planName,
    'Academic year': academicYear ?? '',
    'Course Number': course.courseNumber,
    'Course Title': course.title,
    Faculty: course.facultyName ?? '',
    Session: formatSessionLabel(course.session),
    Units: course.units,
    Schedule: formatSchedule(course),
    'Bid or permission': bidBadge(course.bidOrPermission).label,
    Room: course.room ?? '',
  }))

  return Papa.unparse({
    fields: EXPORT_COLUMNS,
    data: rows,
  })
}

export function downloadPlanCsv(csvText, planName = 'plan') {
  const safeName = planName
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 40)

  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `som-plan-${safeName || 'export'}.csv`
  anchor.click()
  URL.revokeObjectURL(url)
}
