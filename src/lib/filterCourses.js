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
 * @param {{ courseNumber: string, tagCode: string }[]} tags
 * @returns {Map<string, Set<string>>}
 */
export function buildTagsByCourseNumber(tags) {
  const map = new Map()
  for (const tag of tags) {
    if (!tag.courseNumber || !tag.tagCode) continue
    let set = map.get(tag.courseNumber)
    if (!set) {
      set = new Set()
      map.set(tag.courseNumber, set)
    }
    set.add(tag.tagCode)
  }
  return map
}

/**
 * @param {string} query
 * @param {import('./parseCourses').Course} course
 */
function matchesSearch(query, course) {
  if (!query) return true
  const haystack = [
    course.courseNumber,
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
 * @param {Map<string, Set<string>>} tagsByCourseNumber
 */
export function courseMatchesFilters(course, filters, tagsByCourseNumber) {
  const search = filters.search.trim().toLowerCase()
  if (!matchesSearch(search, course)) return false

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
    const courseTags = tagsByCourseNumber.get(course.courseNumber)
    if (!courseTags) return false
    let hasTag = false
    for (const code of filters.tagCodes) {
      if (courseTags.has(code)) {
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
 * @param {Map<string, Set<string>>} tagsByCourseNumber
 */
export function filterCourses(courses, filters, tagsByCourseNumber) {
  return courses.filter((course) =>
    courseMatchesFilters(course, filters, tagsByCourseNumber),
  )
}

/** @param {import('./parseCourses').Course[]} courses */
export function uniqueSessions(courses) {
  return [...new Set(courses.map((c) => c.session).filter(Boolean))].sort(
    sessionSort,
  )
}

/** @param {import('./parseCourses').Course[]} courses */
/** Distinct categories from loaded courses (dynamic; not a fixed taxonomy). */
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
  }
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
    filters.tagCodes.size > 0
  )
}
