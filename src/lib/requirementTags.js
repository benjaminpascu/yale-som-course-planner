/**
 * Requirement tags on a course (from the inline `tags` field), sorted for display.
 *
 * @param {{ tags?: string[] } | null | undefined} course
 * @returns {string[]}
 */
export function getCourseRequirementTags(course) {
  const tags = course?.tags
  if (!Array.isArray(tags) || tags.length === 0) return []
  return [...tags].sort((a, b) => a.localeCompare(b))
}

/**
 * Unique tag names across the catalog (data-driven; not hardcoded).
 *
 * @param {{ tags?: string[] }[]} courses
 * @returns {string[]}
 */
export function uniqueRequirementTags(courses) {
  const names = new Set()
  for (const course of courses) {
    for (const tag of course.tags ?? []) {
      if (tag) names.add(tag)
    }
  }
  return [...names].sort((a, b) => a.localeCompare(b))
}
