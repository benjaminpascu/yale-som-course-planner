import { termCodeToSemester } from './academicYear.js'
import { formatCourseUnits } from './courseDisplay.js'
import { compareSessions } from './sessionDisplay.js'

/** @param {number} units */
export const formatTagUnits = formatCourseUnits

/**
 * Fall vs spring for requirement distribution (native session / term, no overlap).
 *
 * @param {import('./parseCourses.js').Course} course
 * @returns {'fall' | 'spring' | null}
 */
export function courseSemester(course) {
  const session = course.session?.trim().toLowerCase() ?? ''
  if (session.startsWith('fall')) return 'fall'
  if (session.startsWith('spring')) return 'spring'
  return termCodeToSemester(course.termCode)
}

/**
 * Units, contributors, and per-session groups for the plan courses that pass `include`.
 *
 * @param {import('./parseCourses.js').Course[]} selectedCourses
 * @param {string} label
 * @param {(course: import('./parseCourses.js').Course) => boolean} include
 */
function buildUnitRow(selectedCourses, label, include) {
  const contributors = []
  /** @type {Map<string, { units: number, contributors: typeof contributors }>} */
  const bySession = new Map()
  let totalUnits = 0

  for (const course of selectedCourses) {
    if (!include(course)) continue
    totalUnits += course.units

    const entry = {
      courseNumber: course.courseNumber,
      title: course.title,
      units: course.units,
    }
    contributors.push(entry)

    const sessionKey = course.session?.trim() || 'Other'
    let group = bySession.get(sessionKey)
    if (!group) {
      group = { units: 0, contributors: [] }
      bySession.set(sessionKey, group)
    }
    group.units += course.units
    group.contributors.push(entry)
  }

  contributors.sort((a, b) => a.courseNumber.localeCompare(b.courseNumber))

  const contributorGroups = [...bySession.entries()]
    .sort(([a], [b]) => compareSessions(a, b))
    .map(([session, group]) => {
      group.contributors.sort((a, b) =>
        a.courseNumber.localeCompare(b.courseNumber),
      )
      return {
        session,
        units: group.units,
        contributors: group.contributors,
      }
    })

  return {
    tagCode: label,
    label,
    totalUnits,
    contributors,
    contributorGroups,
  }
}

/**
 * Live units per requirement tag for courses in the active plan.
 * Tag names come from `tagNames` (discovered from the catalog), not hardcoded.
 * Each selected course (course_id / section) is counted once via its own `tags`.
 *
 * @param {import('./parseCourses.js').Course[]} selectedCourses
 * @param {string[]} tagNames
 */
export function computeTagUnitTotals(selectedCourses, tagNames) {
  return tagNames.map((tagName) =>
    buildUnitRow(selectedCourses, tagName, (course) =>
      Boolean(course.tags?.includes(tagName)),
    ),
  )
}

/**
 * All units of the given courses (every course once), shown as the "Total" row in
 * Requirements. The tracker passes only the semester picked with the term switch.
 *
 * @param {import('./parseCourses.js').Course[]} courses
 */
export function computePlanUnitTotal(courses, label = 'Total') {
  return {
    ...buildUnitRow(courses, label, () => true),
    isTotal: true,
  }
}
