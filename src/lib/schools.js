/**
 * Yale schools in the School picker. SOM courses come from SOM's own feed; the
 * others from docs/data-samples/yale_courses_<term>.csv (`School` column holds
 * Yale's two-letter school code). See docs/specs/cross-registration.md.
 */
export const SOM_SCHOOL = 'SOM'

/** Picker order first, then any other school alphabetically by name. */
const PICKER_ORDER = [SOM_SCHOOL, 'GB', 'LW', 'FS', 'PH', 'YC', 'GS']

export const SCHOOL_LABELS = {
  SOM: 'School of Management',
  GB: 'Jackson School of Global Affairs',
  LW: 'Law School',
  FS: 'School of the Environment',
  PH: 'School of Public Health',
  YC: 'Yale College',
  GS: 'Graduate School of Arts and Sciences',
  AC: 'School of Architecture',
  AT: 'School of Art',
  DI: 'Divinity School',
  DR: 'School of Drama',
  MD: 'School of Medicine',
  MU: 'School of Music',
  NR: 'School of Nursing',
  PA: 'Physician Associate Program',
}

export function schoolLabel(code) {
  return SCHOOL_LABELS[code] ?? code
}

/** @param {{ school?: string }} course */
export function isSomCourse(course) {
  return !course.school || course.school === SOM_SCHOOL
}

/** Course IDs from the other-schools files look like "<termCode>-<crn>" (SOM IDs are plain numbers). */
export function isOtherSchoolCourseId(id) {
  return /^\d{6}-\d+$/.test(String(id))
}

/**
 * Schools with at least one course in the term, in picker order. SOM is always listed.
 *
 * @param {{ school?: string, termCode: string }[]} courses
 * @param {string | null} termCode
 * @returns {{ id: string, label: string }[]}
 */
export function pickerSchools(courses, termCode) {
  const present = new Set([SOM_SCHOOL])
  for (const course of courses) {
    if (!termCode || course.termCode === termCode) present.add(course.school || SOM_SCHOOL)
  }
  const ordered = PICKER_ORDER.filter((code) => present.has(code))
  const rest = [...present]
    .filter((code) => !PICKER_ORDER.includes(code))
    .sort((a, b) => schoolLabel(a).localeCompare(schoolLabel(b)))
  return [...ordered, ...rest].map((id) => ({ id, label: schoolLabel(id) }))
}
