import { termCodeToSemester } from './academicYear'
import { courseSemester } from './tagUnitTracker'

/**
 * Plans can hold courses from both semesters; Your Plan shows only the one on
 * screen (same rule as the Weekly Calendar). No semester picked → everything.
 */
export function coursesInSemester(courses, termCode) {
  const semester = termCodeToSemester(termCode)
  if (!semester) return courses
  return courses.filter((c) => courseSemester(c) === semester)
}

/**
 * "Clear all courses": drops only the semester on screen, so it never removes
 * courses you can't see. IDs whose course hasn't loaded yet are kept.
 */
export function clearSemester(selectedIds, courseById, termCode) {
  const semester = termCodeToSemester(termCode)
  return new Set(
    [...selectedIds].filter((id) => {
      const course = courseById.get(id)
      return !course || (semester != null && courseSemester(course) !== semester)
    }),
  )
}
