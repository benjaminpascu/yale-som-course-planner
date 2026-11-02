/**
 * Compare Courses groups one term's catalog sections into "courses": same
 * course number, same program (EMBA vs full-time) and — only where one number
 * covers several different courses, like the MGT 416 trips — same title.
 *
 * The group key is where Compare files a course's decisions, ratings and note,
 * so it leaves the title out whenever it can: fixing a title typo in the CSV
 * then keeps that course's data. (Editing the course number or the EMBA
 * category still starts that course fresh.)
 */

function isEmbaSection(course) {
  return (course.category ?? '').trim() === 'EMBA'
}

const programKey = (course) => `${course.courseNumber}|${isEmbaSection(course) ? 'emba' : 'ft'}`
const titleKey = (course) => (course.title ?? '').trim().toLowerCase()

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
  const titlesByProgram = new Map()
  for (const course of courses) {
    const program = programKey(course)
    if (!titlesByProgram.has(program)) titlesByProgram.set(program, new Set())
    titlesByProgram.get(program).add(titleKey(course))
  }
  const keyOf = (course) => {
    const program = programKey(course)
    if (titlesByProgram.get(program).size === 1) return program
    const [number, flag] = program.split('|')
    return `${number}|${titleKey(course)}|${flag}`
  }

  const byKey = new Map()
  for (const course of courses) {
    const key = keyOf(course)
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
