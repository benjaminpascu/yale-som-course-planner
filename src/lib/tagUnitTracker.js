import { termCodeToSemester } from './academicYear.js'
import { formatCourseUnits } from './courseDisplay.js'
import {
  REQUIREMENT_TAG_CODES,
  REQUIREMENT_TAG_LABELS,
} from './requirementTags.js'
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
 * One line per semester when units span both; otherwise null.
 *
 * @param {{ fall: number, spring: number }} bySemester
 * @param {{ fallYear?: number | null, springYear?: number | null }} [years]
 * @returns {{ key: 'fall' | 'spring', text: string }[] | null}
 */
export function getSemesterBreakdownLines(bySemester, years = {}) {
  const { fallYear = null, springYear = null } = years
  const lines = []

  if (bySemester.fall > 0) {
    const label = fallYear != null ? `Fall ${fallYear}` : 'Fall'
    lines.push({
      key: 'fall',
      text: `${label}: ${formatTagUnits(bySemester.fall)}`,
    })
  }
  if (bySemester.spring > 0) {
    const label = springYear != null ? `Spring ${springYear}` : 'Spring'
    lines.push({
      key: 'spring',
      text: `${label}: ${formatTagUnits(bySemester.spring)}`,
    })
  }

  return lines.length >= 2 ? lines : null
}

/**
 * Live units per Yale requirement tag for courses in the active plan.
 * A course with multiple tags contributes its full units toward each tag.
 *
 * @param {import('./parseCourses.js').Course[]} selectedCourses
 * @param {Map<string, Set<string>>} tagsByCourseNumber
 */
export function computeTagUnitTotals(selectedCourses, tagsByCourseNumber) {
  return REQUIREMENT_TAG_CODES.map((tagCode) => {
    const contributors = []
    /** @type {Map<string, { units: number, contributors: typeof contributors }>} */
    const bySession = new Map()
    const bySemester = { fall: 0, spring: 0 }
    let totalUnits = 0

    for (const course of selectedCourses) {
      const courseTags = tagsByCourseNumber.get(course.courseNumber)
      if (!courseTags?.has(tagCode)) continue
      totalUnits += course.units

      const entry = {
        courseNumber: course.courseNumber,
        title: course.title,
        units: course.units,
      }
      contributors.push(entry)

      const semester = courseSemester(course)
      if (semester === 'fall') bySemester.fall += course.units
      else if (semester === 'spring') bySemester.spring += course.units

      const sessionKey = course.session?.trim() || 'Other'
      let group = bySession.get(sessionKey)
      if (!group) {
        group = { units: 0, contributors: [] }
        bySession.set(sessionKey, group)
      }
      group.units += course.units
      group.contributors.push(entry)
    }

    contributors.sort((a, b) =>
      a.courseNumber.localeCompare(b.courseNumber),
    )

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
      tagCode,
      label: REQUIREMENT_TAG_LABELS[tagCode] ?? tagCode,
      totalUnits,
      contributors,
      bySemester,
      contributorGroups,
    }
  })
}
