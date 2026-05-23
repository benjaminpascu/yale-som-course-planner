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
 * @param {string | undefined} session — raw value, e.g. `fall`, `fall-1`
 * @param {{ showAsterisk?: boolean }} [options] — * only when full-term is selected
 */
export function formatSessionLabel(session, { showAsterisk = false } = {}) {
  const raw = session?.trim()
  if (!raw) return ''
  const label = SESSION_LABELS[raw] ?? raw
  if (showAsterisk && FULL_TERM_SESSIONS.has(raw)) return `${label}*`
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
