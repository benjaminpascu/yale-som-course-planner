import { averageRounds, getBiddingRounds } from './biddingHistory'
import { normalizeCategory } from './categoryDisplay'
import { hasMeetingTime } from './parseCourses'
import { parseTimeToMinutes } from './courseDisplay'

/**
 * Both bounds set: course must fit entirely inside the window (start/end inclusive).
 * Begin only: starts at or after. End only: ends at or before.
 */
function courseMatchesTimeRange(course, fromMin, toMin) {
  const start = parseTimeToMinutes(course.startTime)
  const end = parseTimeToMinutes(course.endTime)
  if (start === null || end === null) return false

  if (fromMin !== null && toMin !== null) {
    return start >= fromMin && end <= toMin
  }
  if (fromMin !== null) return start >= fromMin
  if (toMin !== null) return end <= toMin
  return true
}

/** @param {{ timeFrom: string, timeTo: string }} filters */
export function getTimeRangeError(filters) {
  const fromMin = parseTimeToMinutes(filters.timeFrom)
  const toMin = parseTimeToMinutes(filters.timeTo)
  if (fromMin !== null && toMin !== null && toMin <= fromMin) {
    return 'End time must be later than begin time.'
  }
  return null
}

/**
 * @param {string} query
 * @param {import('./parseCourses').Course} course
 */
function matchesSearch(query, course) {
  if (!query) return true
  const haystack = [
    course.courseNumber,
    ...(course.crossListings ?? []),
    course.title,
    course.faculty,
    course.description,
  ]
    .join(' ')
    .toLowerCase()
  return haystack.includes(query)
}

/**
 * @param {import('./parseCourses').Course} course
 * @param {{
 *   search: string
 *   sessions: Set<string>
 *   days: Set<string>
 *   timeFrom: string
 *   timeTo: string
 *   units: Set<number>
 *   bidTypes: Set<string>
 *   categories: Set<string>
 *   tagCodes: Set<string>
 * }} filters
 */
export function courseMatchesFilters(course, filters) {
  const search = filters.search.trim().toLowerCase()
  if (!matchesSearch(search, course)) return false

  if (filters.subjects?.size > 0 && !courseSubjects(course).some((s) => filters.subjects.has(s))) {
    return false
  }

  if (filters.sessions.size > 0 && !filters.sessions.has(course.session)) {
    return false
  }

  if (filters.units.size > 0 && !filters.units.has(course.units)) {
    return false
  }

  if (
    filters.categories.size > 0 &&
    !filters.categories.has(normalizeCategory(course.category))
  ) {
    return false
  }

  if (filters.bidTypes.size > 0) {
    if (!filters.bidTypes.has(bidFilterKey(course.bidOrPermission))) return false
  }

  if (filters.tagCodes.size > 0) {
    const courseTags = course.tags ?? []
    let hasTag = false
    for (const tag of filters.tagCodes) {
      if (courseTags.includes(tag)) {
        hasTag = true
        break
      }
    }
    if (!hasTag) return false
  }

  const fromMin = parseTimeToMinutes(filters.timeFrom)
  const toMin = parseTimeToMinutes(filters.timeTo)
  const timeRangeActive = fromMin !== null || toMin !== null

  const scheduleFiltersActive =
    filters.days.size > 0 || timeRangeActive

  if (scheduleFiltersActive) {
    if (!hasMeetingTime(course)) return false

    if (filters.days.size > 0) {
      const meetsOnDay = course.meetingDays.some((d) => filters.days.has(d))
      if (!meetsOnDay) return false
    }

    if (timeRangeActive) {
      if (!courseMatchesTimeRange(course, fromMin, toMin)) return false
    }
  }

  return true
}

/**
 * @param {import('./parseCourses').Course[]} courses
 * @param {Parameters<typeof courseMatchesFilters>[1]} filters
 */
export function filterCourses(courses, filters) {
  return courses.filter((course) => courseMatchesFilters(course, filters))
}

/** @param {import('./parseCourses').Course[]} courses */
export function uniqueSessions(courses) {
  return [...new Set(courses.map((c) => c.session).filter(Boolean))].sort(
    sessionSort,
  )
}

/** Subject code from the course number, e.g. "ECON 3365" → "ECON". */
export function courseSubject(course) {
  return course.courseNumber.split(' ')[0]
}

/** @param {import('./parseCourses').Course[]} courses */
export function uniqueSubjects(courses) {
  return [...new Set(courses.flatMap(courseSubjects).filter(Boolean))].sort()
}

/** Every department a course is listed under (its own and its cross-listings). */
export function courseSubjects(course) {
  return [course.courseNumber, ...(course.crossListings ?? [])].map((n) => n.split(' ')[0])
}

/** Distinct categories from loaded courses (dynamic; not a fixed taxonomy). */
/** @param {import('./parseCourses').Course[]} courses */
export function uniqueCategories(courses) {
  return [
    ...new Set(
      courses.map((c) => normalizeCategory(c.category)).filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b))
}

/** @param {import('./parseCourses').Course[]} courses */
export function uniqueUnits(courses) {
  return [...new Set(courses.map((c) => c.units))].sort((a, b) => a - b)
}

/** Preferred order for bid/permission filter chips (ids from `bidFilterKey`). */
const BID_FILTER_PRIORITY = [
  'bid',
  'core',
  'permission',
  'no',
  'mam required',
  'mms required',
  'am required',
  'emba',
  'phd',
]

/** Display label when several raw CSV values share one filter id. */
const BID_FILTER_CANONICAL_LABEL = {
  bid: 'bid',
  permission: 'permission',
  no: 'No',
}

function bidFilterSort(a, b) {
  const ai = BID_FILTER_PRIORITY.indexOf(a.id)
  const bi = BID_FILTER_PRIORITY.indexOf(b.id)
  if (ai !== -1 || bi !== -1) {
    if (ai === -1) return 1
    if (bi === -1) return -1
    if (ai !== bi) return ai - bi
  }
  return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })
}

/**
 * Case-insensitive filter id; merges obvious CSV variants (bid/Bid, permission?,
 * blank with No).
 */
export function bidFilterKey(value) {
  const v = (value ?? '').trim().toLowerCase()
  if (v === '') return 'no'
  if (v === 'permission?') return 'permission'
  return v
}

function bidFilterDisplayLabel(key, raw) {
  return BID_FILTER_CANONICAL_LABEL[key] ?? raw
}

/**
 * Distinct bid/permission filter options (merged variants; no blank chip).
 * @returns {{ id: string, label: string }[]}
 */
export function uniqueBidOrPermission(courses) {
  const byKey = new Map()

  for (const course of courses) {
    const raw = (course.bidOrPermission ?? '').trim()
    const key = bidFilterKey(raw)
    if (!byKey.has(key)) {
      byKey.set(key, bidFilterDisplayLabel(key, raw))
    }
  }

  return [...byKey.entries()]
    .map(([id, label]) => ({ id, label }))
    .sort(bidFilterSort)
}

function sessionSort(a, b) {
  const order = ['fall', 'fall-1', 'fall-2', 'spring', 'spring-1', 'spring-2']
  const ai = order.indexOf(a)
  const bi = order.indexOf(b)
  if (ai !== -1 && bi !== -1) return ai - bi
  if (ai !== -1) return -1
  if (bi !== -1) return 1
  return a.localeCompare(b)
}

export function createEmptyFilters() {
  return {
    search: '',
    sessions: new Set(),
    days: new Set(),
    timeFrom: '',
    timeTo: '',
    units: new Set(),
    bidTypes: new Set(),
    categories: new Set(),
    tagCodes: new Set(),
    subjects: new Set(),
    // Filters → Conflicts: 'only' or 'hide' (one at a time), checked against the open plan.
    conflicts: new Set(),
    // Filters → Bidding: minimum average points per round, as typed ('' = none).
    minRound1: '',
    minRound2: '',
  }
}

/** A Bidding box's value as whole points; empty, 0 or anything else = 0 (no minimum). */
export function minPoints(value) {
  const points = Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(points) && points > 0 ? points : 0
}

/** How many Bidding boxes are in use (each counts once in the Filters number). */
export function countBiddingFilters(filters) {
  return (minPoints(filters.minRound1) > 0 ? 1 : 0) + (minPoints(filters.minRound2) > 0 ? 1 : 0)
}

/**
 * Filters → Bidding (spec: docs/specs/bidding-filter.md). Keeps sections whose
 * average past points (the rounds of their four squares) are at least the minimum
 * for each filled box; both boxes must hold. Sections without a number for a filled
 * round are hidden. Empty / 0 boxes keep everything.
 *
 * @template T
 * @param {T[]} courses
 * @param {{ minRound1: string, minRound2: string }} minimums
 * @param {object} history  the parsed bidding file (parseBiddingCsv)
 * @returns {T[]}
 */
export function filterByBidding(courses, { minRound1, minRound2 }, history) {
  const min1 = minPoints(minRound1)
  const min2 = minPoints(minRound2)
  if (!min1 && !min2) return courses
  return courses.filter((course) => {
    const { round1, round2 } = averageRounds(getBiddingRounds(course, history))
    if (min1 && (round1 == null || round1 < min1)) return false
    if (min2 && (round2 == null || round2 < min2)) return false
    return true
  })
}

/**
 * Filters → Conflicts. 'only' keeps courses that conflict with the plan,
 * 'hide' keeps the ones that still fit. Courses already in the plan stay either way.
 *
 * @template {{ courseId: string }} T
 * @param {T[]} courses
 * @param {Set<string>} mode
 * @param {{ has(id: string): boolean }} conflictingIds  a Set of ids, or the Map from getConflictsByCourseId
 * @param {Set<string>} selectedIds
 * @returns {T[]}
 */
export function filterByConflicts(courses, mode, conflictingIds, selectedIds) {
  if (mode.has('only')) {
    return courses.filter((c) => conflictingIds.has(c.courseId) || selectedIds.has(c.courseId))
  }
  if (mode.has('hide')) return courses.filter((c) => !conflictingIds.has(c.courseId))
  return courses
}

/** @param {ReturnType<typeof createEmptyFilters>} filters */
export function hasActiveFilters(filters) {
  return (
    filters.search.trim() !== '' ||
    filters.sessions.size > 0 ||
    filters.days.size > 0 ||
    filters.timeFrom !== '' ||
    filters.timeTo !== '' ||
    filters.units.size > 0 ||
    filters.bidTypes.size > 0 ||
    filters.categories.size > 0 ||
    filters.tagCodes.size > 0 ||
    (filters.subjects?.size ?? 0) > 0 ||
    (filters.conflicts?.size ?? 0) > 0 ||
    countBiddingFilters(filters) > 0
  )
}
