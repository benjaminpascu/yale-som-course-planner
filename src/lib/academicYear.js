/**
 * Yale TermCode is YYYYTT (e.g. 202503 = fall 2025, 202601 = spring 2026).
 */

/**
 * @param {string} termCode
 * @returns {'fall' | 'spring' | null}
 */
export function termCodeToSemester(termCode) {
  const code = String(termCode ?? '').trim()
  if (!/^\d{6}$/.test(code)) return null

  const term = code.slice(4, 6)
  if (term === '03') return 'fall'
  if (term === '01') return 'spring'
  return null
}

/**
 * Calendar year encoded in Yale TermCode (YYYYTT), e.g. 202503 → 2025.
 *
 * @param {string} termCode
 * @returns {number | null}
 */
export function termCodeToCalendarYear(termCode) {
  const code = String(termCode ?? '').trim()
  if (!/^\d{6}$/.test(code)) return null
  return Number(code.slice(0, 4))
}

/**
 * @typedef {Object} SemesterCalendarYears
 * @property {number | null} fallYear — lowest fall TermCode year (term 03)
 * @property {number | null} springYear — highest spring TermCode year (term 01)
 */

/**
 * Fall uses the lowest fall calendar year in the catalog; spring uses the highest
 * spring year (e.g. fallYear 2025, springYear 2026 for 202503 + 202601).
 *
 * @param {{ termCode?: string }[]} courses
 * @returns {SemesterCalendarYears}
 */
export function getSemesterCalendarYears(courses) {
  let fallYear = null
  let springYear = null

  for (const course of courses) {
    const semester = termCodeToSemester(course.termCode)
    const year = termCodeToCalendarYear(course.termCode)
    if (semester == null || year == null) continue

    if (semester === 'fall') {
      fallYear = fallYear == null ? year : Math.min(fallYear, year)
    } else if (semester === 'spring') {
      springYear = springYear == null ? year : Math.max(springYear, year)
    }
  }

  return { fallYear, springYear }
}
