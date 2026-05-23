export { REQUIREMENT_TAG_LABELS } from './requirementTagTheme.js'

/** Yale SOM requirement tag codes (PRD §6.2). */
export const REQUIREMENT_TAG_CODES = [
  'MGAM',
  'MGBA',
  'MGGB',
  'MGGS',
  'MGLD',
  'MGMS',
  'MGSR',
]

/**
 * Requirement tags on a course, in canonical display order.
 *
 * @param {string} courseNumber
 * @param {Map<string, Set<string>>} tagsByCourseNumber
 */
export function getCourseRequirementTags(courseNumber, tagsByCourseNumber) {
  const courseTags = tagsByCourseNumber.get(courseNumber)
  if (!courseTags) return []
  return REQUIREMENT_TAG_CODES.filter((code) => courseTags.has(code))
}
