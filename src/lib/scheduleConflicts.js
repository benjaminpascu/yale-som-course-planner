import { parseTimeToMinutes } from './courseDisplay'
import { hasMeetingTime } from './parseCourses'

/** @param {string} isoA @param {string} isoB */
function dateRangesOverlap(isoAStart, isoAEnd, isoBStart, isoBEnd) {
  return isoAStart <= isoBEnd && isoBStart <= isoAEnd
}

/**
 * When session dates are missing, infer overlap from session codes (PRD §7.2).
 * Full-term `fall` overlaps mini-terms; `fall-1` does not overlap `fall-2`.
 */
export function sessionsOverlapByCode(sessionA, sessionB) {
  const a = sessionA?.trim() ?? ''
  const b = sessionB?.trim() ?? ''
  if (!a || !b) return true
  if (a === b) return true

  const termOf = (s) => {
    if (s.startsWith('fall')) return 'fall'
    if (s.startsWith('spring')) return 'spring'
    return s
  }

  const termA = termOf(a)
  const termB = termOf(b)
  if (termA !== termB) return false

  const isFull = (s) => s === 'fall' || s === 'spring'
  const isMini = (s) => s.includes('-')
  if (isFull(a) || isFull(b)) return true
  if (isMini(a) && isMini(b)) return a === b
  return true
}

/**
 * @param {import('./parseCourses').Course} a
 * @param {import('./parseCourses').Course} b
 */
export function sessionsOverlap(a, b) {
  if (
    a.sessionStart &&
    a.sessionEnd &&
    b.sessionStart &&
    b.sessionEnd
  ) {
    return dateRangesOverlap(
      a.sessionStart,
      a.sessionEnd,
      b.sessionStart,
      b.sessionEnd,
    )
  }
  return sessionsOverlapByCode(a.session, b.session)
}

/**
 * @param {string | null | undefined} startA
 * @param {string | null | undefined} endA
 * @param {string | null | undefined} startB
 * @param {string | null | undefined} endB
 */
export function meetingTimesOverlap(startA, endA, startB, endB) {
  const s1 = parseTimeToMinutes(startA)
  const e1 = parseTimeToMinutes(endA)
  const s2 = parseTimeToMinutes(startB)
  const e2 = parseTimeToMinutes(endB)
  if (s1 === null || e1 === null || s2 === null || e2 === null) return false
  return s1 < e2 && s2 < e1
}

/**
 * @param {import('./parseCourses').Course} a
 * @param {import('./parseCourses').Course} b
 */
export function coursesConflict(a, b) {
  if (!hasMeetingTime(a) || !hasMeetingTime(b)) return false
  if (!sessionsOverlap(a, b)) return false

  const sharedDay = a.meetingDays.some((day) => b.meetingDays.includes(day))
  if (!sharedDay) return false

  return meetingTimesOverlap(a.startTime, a.endTime, b.startTime, b.endTime)
}

/**
 * Course IDs that would time-conflict with at least one selected timed course.
 * @param {import('./parseCourses').Course[]} courses
 * @param {Set<string>} selectedIds
 */
export function getConflictingCourseIds(courses, selectedIds) {
  const selected = courses.filter((c) => selectedIds.has(c.courseId))
  const timedSelected = selected.filter(hasMeetingTime)
  if (timedSelected.length === 0) return new Set()

  const conflicts = new Set()
  for (const course of courses) {
    if (selectedIds.has(course.courseId) || !hasMeetingTime(course)) continue
    for (const sel of timedSelected) {
      if (coursesConflict(course, sel)) {
        conflicts.add(course.courseId)
        break
      }
    }
  }
  return conflicts
}
