/**
 * Compare Courses groups catalog sections into "courses": same course number,
 * same title (trimmed, case-insensitive), and same program (EMBA vs full-time).
 * The key leaves out the term so scores follow a course across Fall and Spring.
 */

function isEmbaSection(course) {
  return (course.category ?? '').trim() === 'EMBA'
}

/** @param {{ courseNumber: string, title: string, category?: string }} course */
export function courseGroupKey(course) {
  const title = (course.title ?? '').trim().toLowerCase()
  return `${course.courseNumber}|${title}|${isEmbaSection(course) ? 'emba' : 'ft'}`
}

function uniqueInOrder(values) {
  return [...new Set(values.filter((value) => value !== '' && value != null))]
}

function mostCommon(values) {
  const counts = new Map()
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
  let best = values[0]
  for (const [value, count] of counts) {
    if (count > counts.get(best)) best = value
  }
  return best
}

/**
 * Group one term's sections into compare courses, in first-appearance order.
 *
 * @param {object[]} courses
 */
export function buildCourseGroups(courses) {
  const byKey = new Map()
  for (const course of courses) {
    const key = courseGroupKey(course)
    if (!byKey.has(key)) byKey.set(key, [])
    byKey.get(key).push(course)
  }

  return [...byKey].map(([key, sections]) => {
    const first = sections[0]
    const units = sections.map((s) => s.units)
    return {
      key,
      courseNumber: first.courseNumber,
      title: first.title,
      isEmba: isEmbaSection(first),
      sections,
      professors: uniqueInOrder(sections.map((s) => s.faculty?.trim())),
      units: mostCommon(units),
      unitVariants: uniqueInOrder(units),
      tags: [...new Set(sections.flatMap((s) => s.tags ?? []))].sort((a, b) =>
        a.localeCompare(b),
      ),
      sessions: uniqueInOrder(sections.map((s) => s.session)),
    }
  })
}

/** Every professor named in the catalog, sorted. */
export function uniqueProfessors(courses) {
  return uniqueInOrder(courses.map((c) => c.faculty?.trim())).sort((a, b) =>
    a.localeCompare(b),
  )
}
