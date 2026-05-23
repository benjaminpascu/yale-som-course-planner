import { formatCourseUnits } from './courseDisplay.js'
import {
  REQUIREMENT_TAG_CODES,
  REQUIREMENT_TAG_LABELS,
} from './requirementTags.js'

/** @param {number} units */
export const formatTagUnits = formatCourseUnits

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
    let totalUnits = 0

    for (const course of selectedCourses) {
      const courseTags = tagsByCourseNumber.get(course.courseNumber)
      if (!courseTags?.has(tagCode)) continue
      totalUnits += course.units
      contributors.push({
        courseNumber: course.courseNumber,
        title: course.title,
        units: course.units,
      })
    }

    contributors.sort((a, b) =>
      a.courseNumber.localeCompare(b.courseNumber),
    )

    return {
      tagCode,
      label: REQUIREMENT_TAG_LABELS[tagCode] ?? tagCode,
      totalUnits,
      contributors,
    }
  })
}
