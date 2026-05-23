/** Canonical term order for plan lists, filters, and calendar tabs. */
export const SESSION_SORT_ORDER = [
  'fall',
  'fall-1',
  'fall-2',
  'spring',
  'spring-1',
  'spring-2',
]

/** @param {string} a @param {string} b */
export function compareSessions(a, b) {
  const ai = SESSION_SORT_ORDER.indexOf(a)
  const bi = SESSION_SORT_ORDER.indexOf(b)
  if (ai !== -1 && bi !== -1) return ai - bi
  if (ai !== -1) return -1
  if (bi !== -1) return 1
  return a.localeCompare(b)
}

/**
 * Group courses by session, sorted in term order; courses within each group by number.
 *
 * @param {import('./parseCourses.js').Course[]} courses
 * @returns {{ session: string, courses: import('./parseCourses.js').Course[] }[]}
 */
export function groupCoursesBySession(courses) {
  const bySession = new Map()

  for (const course of courses) {
    const key = course.session?.trim() || 'Other'
    let group = bySession.get(key)
    if (!group) {
      group = []
      bySession.set(key, group)
    }
    group.push(course)
  }

  return [...bySession.entries()]
    .sort(([a], [b]) => compareSessions(a, b))
    .map(([session, list]) => ({
      session,
      courses: [...list].sort((a, b) =>
        a.courseNumber.localeCompare(b.courseNumber),
      ),
    }))
}

/** Display names for Yale `Course Session` values (CSV / DB stay unchanged). */
const SESSION_LABELS = {
  fall: 'Fall full term',
  'fall-1': 'Fall 1',
  'fall-2': 'Fall 2',
  spring: 'Spring full term',
  'spring-1': 'Spring 1',
  'spring-2': 'Spring 2',
}

/** Shown under the session filter when fall or spring full-term options exist. */
export const SESSION_FULL_TERM_FOOTNOTE =
  '* May not run for the full traditional term period — check each course’s dates.'

const FULL_TERM_SESSIONS = new Set(['fall', 'spring'])

/**
 * @param {string | undefined} session
 * @param {{ fallYear?: number | null, springYear?: number | null }} years
 * @returns {number | null}
 */
function calendarYearForSession(session, { fallYear = null, springYear = null } = {}) {
  const raw = session?.trim()
  if (!raw) return null
  if (raw.startsWith('fall')) return fallYear ?? null
  if (raw.startsWith('spring')) return springYear ?? null
  return null
}

/**
 * @param {string | undefined} session — raw value, e.g. `fall`, `fall-1`
 * @param {{ showAsterisk?: boolean, fallYear?: number | null, springYear?: number | null }} [options]
 */
export function formatSessionLabel(
  session,
  { showAsterisk = false, fallYear = null, springYear = null } = {},
) {
  const raw = session?.trim()
  if (!raw) return ''
  let label = SESSION_LABELS[raw] ?? raw
  if (showAsterisk && FULL_TERM_SESSIONS.has(raw)) label = `${label}*`

  const year = calendarYearForSession(raw, { fallYear, springYear })
  if (year != null) return `${label} (${year})`

  return label
}

/** @param {Set<string>} selectedSessions */
export function hasSelectedFullTermSession(selectedSessions) {
  for (const session of FULL_TERM_SESSIONS) {
    if (selectedSessions.has(session)) return true
  }
  return false
}

export function isFullTermSession(session) {
  return FULL_TERM_SESSIONS.has(session?.trim() ?? '')
}
