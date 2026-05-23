import { sessionsOverlap } from './scheduleConflicts'
import { compareSessions, formatSessionLabel } from './sessionDisplay'

/** @param {import('./parseCourses').Course[]} timedCourses */
function uniquePlanSessions(timedCourses) {
  return [
    ...new Set(timedCourses.map((c) => c.session).filter(Boolean)),
  ].sort(compareSessions)
}

/**
 * Session tabs to show. Full-term `fall` / `spring` have no separate tab when
 * Fall 1 / 2 (or Spring 1 / 2) tabs exist — those courses still appear on each mini-term tab.
 * @param {import('./parseCourses').Course[]} timedCourses
 */
function sessionsForCalendarTabs(timedCourses) {
  const sessions = uniquePlanSessions(timedCourses)
  const hasFallMini = sessions.some((s) => s === 'fall-1' || s === 'fall-2')
  const hasSpringMini = sessions.some(
    (s) => s === 'spring-1' || s === 'spring-2',
  )

  return sessions.filter((s) => {
    if (s === 'fall' && hasFallMini) return false
    if (s === 'spring' && hasSpringMini) return false
    return true
  })
}

/**
 * @param {import('./parseCourses').Course} course
 * @param {string} viewId — session code, e.g. `fall-1`
 */
export function courseVisibleInCalendarView(course, viewId) {
  return sessionsOverlap(course, { session: viewId })
}

/**
 * @param {import('./parseCourses').Course[]} timedCourses
 * @param {number | null} [fallYear]
 * @param {number | null} [springYear]
 * @returns {{ id: string, label: string }[]}
 */
export function getCalendarViewOptions(
  timedCourses,
  fallYear = null,
  springYear = null,
) {
  const sessions = sessionsForCalendarTabs(timedCourses)
  if (sessions.length === 0) return []
  return sessions.map((s) => ({
    id: s,
    label: formatSessionLabel(s, { fallYear, springYear }),
  }))
}

/**
 * @param {import('./parseCourses').Course[]} timedCourses
 */
export function getDefaultCalendarView(timedCourses) {
  const options = getCalendarViewOptions(timedCourses)
  if (options.length === 0) return ''
  const mini = options.find((o) => o.id.includes('-'))
  return mini?.id ?? options[0].id
}

/** True when plan mixes sessions that never run in the same weeks (e.g. fall-1 + fall-2). */
export function planHasNonOverlappingSessions(timedCourses) {
  const sessions = uniquePlanSessions(timedCourses)
  if (sessions.length < 2) return false
  for (let i = 0; i < sessions.length; i++) {
    for (let j = i + 1; j < sessions.length; j++) {
      if (
        !sessionsOverlap(
          { session: sessions[i] },
          { session: sessions[j] },
        )
      ) {
        return true
      }
    }
  }
  return false
}
