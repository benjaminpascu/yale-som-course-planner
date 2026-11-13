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
 * First and last class day of each term. Start dates outside the term's
 * calendar year are ignored (Yale typos).
 */
function termDates(courses) {
  /** @type {Map<string, { lastDay: string, firstDay: string }>} */
  const terms = new Map()
  for (const { termCode, sessionStart, sessionEnd } of courses) {
    if (!termCode) continue
    const term = terms.get(termCode) ?? { lastDay: '', firstDay: '' }
    if ((sessionEnd ?? '') > term.lastDay) term.lastDay = sessionEnd
    const inYear = sessionStart?.startsWith(String(termCodeToCalendarYear(termCode)))
    if (inYear && (!term.firstDay || sessionStart < term.firstDay)) term.firstDay = sessionStart
    terms.set(termCode, term)
  }
  return terms
}

/**
 * Term the site opens on: the one students are planning, i.e. the earliest
 * shown term that hasn't started yet (a term with no start dates counts as not
 * started). If every shown term has started, the newest.
 *
 * @param {{ termCode?: string, sessionStart?: string | null, sessionEnd?: string | null }[]} courses
 * @param {Date} [today]
 * @returns {string | null}
 */
export function getDefaultTermCode(courses, today = new Date()) {
  const shown = getCatalogTerms(courses, today)
  const dates = termDates(courses)
  const todayIso = isoDay(today)
  const upcoming = shown.find(({ id }) => {
    const { firstDay } = dates.get(id)
    return !firstDay || firstDay > todayIso
  })
  return (upcoming ?? shown.at(-1))?.id ?? null
}

/**
 * Terms students can pick, oldest first (TermCode sorts chronologically).
 * A term is hidden once the next loaded term has started, or the day after
 * its own last class if that comes first. Start dates outside the term's
 * calendar year are ignored (Yale typos, e.g. MGT 640 listed as 2026 in
 * Spring 2027). If every term is hidden, the newest stays so the site is
 * never empty.
 *
 * @param {{ termCode?: string, sessionStart?: string | null, sessionEnd?: string | null }[]} courses
 * @param {Date} [today]
 * @returns {{ id: string, label: string }[]}
 */
export function getCatalogTerms(courses, today = new Date()) {
  const terms = termDates(courses)
  const all = [...terms.keys()].sort()
  const todayIso = isoDay(today)
  const open = all.filter((termCode, i) => {
    const { lastDay } = terms.get(termCode)
    const nextStart = terms.get(all[i + 1])?.firstDay
    if (lastDay && lastDay < todayIso) return false
    if (nextStart && nextStart <= todayIso) return false
    return true
  })
  const shown = open.length > 0 ? open : all.slice(-1)
  return shown.map((termCode) => ({ id: termCode, label: formatTermLabel(termCode) }))
}
