/**
 * Yale TermCode is YYYYTT (e.g. 202503 = fall 2025, 202601 = spring 2026).
 * Both belong to academic year 2025-26.
 *
 * @param {string} termCode
 * @returns {number | null} First calendar year of the academic year (e.g. 2025)
 */
export function termCodeToAcademicYearStart(termCode) {
  const code = String(termCode ?? '').trim()
  if (!/^\d{6}$/.test(code)) return null

  const year = Number(code.slice(0, 4))
  const term = code.slice(4, 6)

  if (term === '03') return year
  if (term === '01') return year - 1

  return year
}

/**
 * @param {number} startYear e.g. 2025
 * @returns {string} e.g. "2025-26"
 */
export function formatAcademicYear(startYear) {
  const endShort = (startYear + 1) % 100
  return `${startYear}-${String(endShort).padStart(2, '0')}`
}

/**
 * Most common academic year label from loaded courses.
 *
 * @param {{ termCode?: string }[]} courses
 * @returns {string | null}
 */
export function getAcademicYearLabel(courses) {
  const counts = new Map()

  for (const course of courses) {
    const start = termCodeToAcademicYearStart(course.termCode)
    if (start == null) continue
    const label = formatAcademicYear(start)
    counts.set(label, (counts.get(label) ?? 0) + 1)
  }

  if (counts.size === 0) return null

  let best = null
  let bestCount = 0
  for (const [label, count] of counts) {
    if (count > bestCount) {
      best = label
      bestCount = count
    }
  }

  return best
}
