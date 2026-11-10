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
 * @property {number | null} fallYear
 * @property {number | null} springYear
 */

/**
 * Calendar years of the academic year a term belongs to, used for session
 * labels like "Fall 2026": Fall 2026 and Spring 2027 both give
 * { fallYear: 2026, springYear: 2027 }.
 *
 * @param {string | null | undefined} termCode
 * @returns {SemesterCalendarYears}
 */
export function getAcademicYears(termCode) {
  const semester = termCodeToSemester(termCode)
  const year = termCodeToCalendarYear(termCode)
  if (semester == null || year == null) return { fallYear: null, springYear: null }
  return semester === 'fall'
    ? { fallYear: year, springYear: year + 1 }
    : { fallYear: year - 1, springYear: year }
}

/**
 * Display name for a TermCode, e.g. 202603 → "Fall 2026", 202701 → "Spring 2027".
 *
 * @param {string} termCode
 * @returns {string}
 */
export function formatTermLabel(termCode) {
  const semester = termCodeToSemester(termCode)
  const year = termCodeToCalendarYear(termCode)
  if (semester == null || year == null) return String(termCode ?? '')
  const name = semester === 'fall' ? 'Fall' : 'Spring'
  return `${name} ${year}`
}

/** @param {Date} date → "YYYY-MM-DD" in local time (same format as course.sessionEnd) */
function isoDay(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/**
 * Terms students can pick, oldest first (TermCode sorts chronologically).
 * A term is hidden once its last class is over; if every term is over, the
 * newest one stays so the site is never empty.
 *
 * @param {{ termCode?: string, sessionEnd?: string | null }[]} courses
 * @param {Date} [today]
 * @returns {{ id: string, label: string }[]}
 */
export function getCatalogTerms(courses, today = new Date()) {
  const lastDay = new Map()
  for (const { termCode, sessionEnd } of courses) {
    if (!termCode) continue
    const end = sessionEnd ?? ''
    if (!lastDay.has(termCode) || end > lastDay.get(termCode)) lastDay.set(termCode, end)
  }
  const all = [...lastDay.keys()].sort()
  const todayIso = isoDay(today)
  const open = all.filter((termCode) => !lastDay.get(termCode) || lastDay.get(termCode) >= todayIso)
  const shown = open.length > 0 ? open : all.slice(-1)
  return shown.map((termCode) => ({ id: termCode, label: formatTermLabel(termCode) }))
}
