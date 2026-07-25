/** Columns required in courses_master_fall2026.csv */
export const REQUIRED_COURSE_COLUMNS = [
  'Course ID',
  'Course Number',
  'Course Title',
  'Course Description',
  'Units',
  'TermCode',
  'Course Session',
  'Course Session Start date',
  'Course Session End Date',
  'Course Category',
  'Course Type',
  'Bid Or Permission',
  'Faculty 1',
  'Faculty 1 Email',
  'Room',
  'Section',
  'Syllabus',
  'Old Syllabus',
  'days_clean',
  'start_24h',
  'end_24h',
  'Visible',
  'tags',
]

/**
 * @param {string[]} headers
 * @param {string[]} required
 * @returns {{ ok: true } | { ok: false, missing: string[] }}
 */
export function validateCsvColumns(headers, required) {
  const headerSet = new Set(headers.map((h) => h?.trim()).filter(Boolean))
  const missing = required.filter((col) => !headerSet.has(col))
  if (missing.length > 0) {
    return { ok: false, missing }
  }
  return { ok: true }
}
