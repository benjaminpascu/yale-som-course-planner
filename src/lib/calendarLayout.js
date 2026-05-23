import { parseTimeToMinutes } from './courseDisplay'

/** @param {{ start: number, end: number }} a @param {{ start: number, end: number }} b */
function timesOverlap(a, b) {
  return a.start < b.end && b.start < a.end
}

/**
 * Group events that overlap in clock time (transitively).
 * @param {{ start: number, end: number }[]} events
 */
function buildOverlapClusters(events) {
  let clusters = []

  for (const event of events) {
    const related = clusters.filter((cluster) =>
      cluster.some((e) => timesOverlap(e, event)),
    )
    if (related.length === 0) {
      clusters.push([event])
      continue
    }
    const merged = [event, ...related.flat()]
    clusters = clusters.filter((c) => !related.includes(c))
    clusters.push(merged)
  }

  return clusters
}

/**
 * Assign column index and totalColumns within one overlap cluster.
 * @param {{ course: object, start: number, end: number }[]} cluster
 */
function layoutCluster(cluster) {
  const sorted = [...cluster].sort(
    (a, b) => a.start - b.start || a.end - b.end,
  )
  /** @type {number[]} — end minute per column */
  const columnEnds = []

  for (const event of sorted) {
    let col = columnEnds.findIndex((end) => end <= event.start)
    if (col === -1) {
      col = columnEnds.length
      columnEnds.push(event.end)
    } else {
      columnEnds[col] = event.end
    }
    event.column = col
  }

  const totalColumns = columnEnds.length
  for (const event of sorted) {
    event.totalColumns = totalColumns
  }
  return sorted
}

/**
 * Side-by-side column layout for timed events on one weekday (Google Calendar style).
 * @param {import('./parseCourses').Course[]} courses — already filtered to the active session view
 * @param {string} day — e.g. `Mo`
 * @returns {{ course: import('./parseCourses').Course, column: number, totalColumns: number }[]}
 */
export function layoutCoursesForDay(courses, day) {
  const events = courses
    .filter((c) => c.meetingDays.includes(day))
    .map((course) => {
      const start = parseTimeToMinutes(course.startTime)
      const end = parseTimeToMinutes(course.endTime)
      return { course, start, end }
    })
    .filter(
      (e) =>
        e.start !== null && e.end !== null && e.end > e.start,
    )
    .map((e) => ({ course: e.course, start: e.start, end: e.end }))

  const clusters = buildOverlapClusters(events)
  return clusters.flatMap((cluster) => layoutCluster(cluster))
}
