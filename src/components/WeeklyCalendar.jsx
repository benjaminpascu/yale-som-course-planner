import { useEffect, useMemo, useState } from 'react'
import CalendarCourseBlock from './CalendarCourseBlock'
import { layoutCoursesForDay } from '../lib/calendarLayout'
import {
  courseVisibleInCalendarView,
  getCalendarViewOptions,
  getDefaultCalendarView,
  planHasNonOverlappingSessions,
} from '../lib/calendarSessionView'
import {
  formatCourseUnits,
  parseTimeToMinutes,
  WEEKDAYS,
} from '../lib/courseDisplay'
import { formatSessionLabel } from '../lib/sessionDisplay'
import { hasMeetingTime } from '../lib/parseCourses'
import { sectionTone } from '../lib/sectionTheme'
import SectionHeader from './SectionHeader'

const START_HOUR = 8
const END_HOUR = 21
const MINUTES_PER_SLOT = 15
const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60
const PX_PER_MINUTE = 0.85
const GRID_HEIGHT = TOTAL_MINUTES * PX_PER_MINUTE

const CALENDAR_BLOCK_COLOR = 'bg-yale-800'

function topPx(startTime) {
  const minutes = parseTimeToMinutes(startTime)
  if (minutes === null) return 0
  return Math.max(0, (minutes - START_HOUR * 60) * PX_PER_MINUTE)
}

function heightPx(startTime, endTime) {
  const start = parseTimeToMinutes(startTime)
  const end = parseTimeToMinutes(endTime)
  if (start === null || end === null) return MINUTES_PER_SLOT * PX_PER_MINUTE
  return Math.max(MINUTES_PER_SLOT * PX_PER_MINUTE, (end - start) * PX_PER_MINUTE)
}

function formatHourLabel(hour) {
  const period = hour >= 12 ? 'PM' : 'AM'
  const h12 = hour % 12 || 12
  return `${h12} ${period}`
}

function formatCoursesInPeriod(count) {
  if (count === 1) return '1 course in period'
  return `${count} courses in period`
}

function blockPositionStyle(column, totalColumns) {
  const widthPct = 100 / totalColumns
  const leftPct = column * widthPct
  return {
    left: `calc(${leftPct}% + 2px)`,
    width: `calc(${widthPct}% - 4px)`,
  }
}

export default function WeeklyCalendar({
  selectedCourses,
  hasSelection,
  fallYear = null,
  springYear = null,
}) {
  const timedCourses = useMemo(
    () => selectedCourses.filter(hasMeetingTime),
    [selectedCourses],
  )

  const viewOptions = useMemo(
    () => getCalendarViewOptions(timedCourses, fallYear, springYear),
    [timedCourses, fallYear, springYear],
  )

  const defaultView = useMemo(
    () => getDefaultCalendarView(timedCourses),
    [timedCourses],
  )

  const [calendarView, setCalendarView] = useState(defaultView)
  const [openDetailKey, setOpenDetailKey] = useState(null)

  useEffect(() => {
    if (!openDetailKey) return
    const close = () => setOpenDetailKey(null)
    const timer = window.setTimeout(() => {
      document.addEventListener('click', close)
    }, 0)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('click', close)
    }
  }, [openDetailKey])

  useEffect(() => {
    setCalendarView((prev) => {
      if (viewOptions.some((o) => o.id === prev)) return prev
      return defaultView
    })
  }, [viewOptions, defaultView])

  const visibleCourses = useMemo(
    () =>
      timedCourses.filter((c) => courseVisibleInCalendarView(c, calendarView)),
    [timedCourses, calendarView],
  )

  const periodCourses = useMemo(
    () =>
      calendarView
        ? selectedCourses.filter((c) =>
            courseVisibleInCalendarView(c, calendarView),
          )
        : selectedCourses,
    [selectedCourses, calendarView],
  )

  const periodUnits = useMemo(
    () => periodCourses.reduce((sum, c) => sum + c.units, 0),
    [periodCourses],
  )

  const periodUntimedCount = useMemo(
    () => periodCourses.filter((c) => !hasMeetingTime(c)).length,
    [periodCourses],
  )

  const mixedNonOverlappingSessions = useMemo(
    () => planHasNonOverlappingSessions(timedCourses),
    [timedCourses],
  )

  const layoutByDay = useMemo(() => {
    const byDay = {}
    for (const day of WEEKDAYS) {
      byDay[day] = layoutCoursesForDay(visibleCourses, day)
    }
    return byDay
  }, [visibleCourses])

  const hourLabels = useMemo(() => {
    const labels = []
    for (let h = START_HOUR; h <= END_HOUR; h++) {
      labels.push({ hour: h, top: (h - START_HOUR) * 60 * PX_PER_MINUTE })
    }
    return labels
  }, [])

  const calendarTone = sectionTone('calendar')
  const activeViewLabel = useMemo(() => {
    const fromTab = viewOptions.find((o) => o.id === calendarView)?.label
    if (fromTab) return fromTab
    if (calendarView) {
      return formatSessionLabel(calendarView, { fallYear, springYear })
    }
    const session = selectedCourses.find((c) => c.session)?.session
    return session
      ? formatSessionLabel(session, { fallYear, springYear })
      : ''
  }, [viewOptions, calendarView, fallYear, springYear, selectedCourses])

  if (!hasSelection) {
    return (
      <section
        id="weekly-calendar"
        className={`flex min-h-44 shrink-0 flex-col justify-center border-b ${calendarTone.section} px-6 py-10 sm:min-h-52`}
        aria-label="Weekly schedule"
      >
        <p className="text-center text-sm text-gray-500">
          Select courses below to plan your weekly schedule.
        </p>
        <p className="mt-1 text-center text-xs text-gray-400">
          Courses with meeting times will show on this calendar.
        </p>
      </section>
    )
  }

  return (
    <section
      id="weekly-calendar"
      className={`flex shrink-0 flex-col border-b ${calendarTone.section}`}
    >
      <SectionHeader
        tone="calendar"
        title="Weekly calendar"
        subtitle={
          <>
            {activeViewLabel ? `${activeViewLabel} · ` : null}
            {formatCoursesInPeriod(periodCourses.length)} (
            {formatCourseUnits(periodUnits)})
            {periodUntimedCount > 0
              ? ` · ${periodUntimedCount} without weekly time`
              : ''}
          </>
        }
      />

      {viewOptions.length > 1 ? (
        <div
          className="flex flex-wrap items-center gap-1.5 border-b border-yale-100/80 bg-yale-50/40 px-4 py-2"
          role="tablist"
          aria-label="Calendar session view"
        >
          {viewOptions.map((opt) => {
            const active = calendarView === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setCalendarView(opt.id)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  active
                    ? 'bg-yale-800 text-white shadow-sm'
                    : 'bg-white text-yale-800 ring-1 ring-yale-200 hover:bg-yale-50'
                }`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      ) : null}

      {mixedNonOverlappingSessions && viewOptions.length > 1 ? (
        <p className="border-b border-yale-100/60 px-4 py-1.5 text-xs text-yale-700">
          Fall 1 and Fall 2 (or Spring 1 and 2) do not meet in the same weeks —
          switch tabs to see each schedule. Full-term courses appear on both
          halves.
        </p>
      ) : null}

      {timedCourses.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-gray-600">
          None of your selected courses have a weekly meeting time, so nothing
          appears on the grid. They still count in your plan and requirements
          below.
        </p>
      ) : visibleCourses.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-gray-600">
          No courses in your plan match this session view. Try another tab
          above.
        </p>
      ) : (
        <div className="w-full px-2 py-2 sm:px-4 sm:py-3">
          <div
            className={`grid w-full overflow-visible rounded-lg border shadow-sm ${calendarTone.inset}`}
            style={{
              gridTemplateColumns: '2.75rem repeat(5, minmax(0, 1fr))',
            }}
          >
            <div />
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="border-b border-gray-200 pb-1 text-center text-xs font-semibold text-gray-700"
              >
                {day}
              </div>
            ))}

            <div
              className="relative border-r border-gray-100"
              style={{ height: GRID_HEIGHT }}
            >
              {hourLabels.map(({ hour, top }) => (
                <div
                  key={hour}
                  className="absolute right-1 -translate-y-1/2 text-[10px] text-gray-400"
                  style={{ top }}
                >
                  {formatHourLabel(hour)}
                </div>
              ))}
            </div>

            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="relative border-l border-gray-100 bg-white"
                style={{ height: GRID_HEIGHT }}
              >
                {hourLabels.map(({ top }) => (
                  <div
                    key={`line-${day}-${top}`}
                    className="pointer-events-none absolute inset-x-0 border-t border-gray-100"
                    style={{ top }}
                  />
                ))}
                {layoutByDay[day].map(
                  ({ course, column, totalColumns }) => {
                    const blockKey = `${course.courseId}-${day}`
                    const top = topPx(course.startTime)
                    return (
                      <CalendarCourseBlock
                        key={blockKey}
                        course={course}
                        fallYear={fallYear}
                        springYear={springYear}
                        colorClass={CALENDAR_BLOCK_COLOR}
                        blockTopPx={top}
                        gridHeight={GRID_HEIGHT}
                        isDetailOpen={openDetailKey === blockKey}
                        onToggleDetail={(open) =>
                          setOpenDetailKey(open ? blockKey : null)
                        }
                        positionStyle={{
                          top,
                          height: heightPx(
                            course.startTime,
                            course.endTime,
                          ),
                          ...blockPositionStyle(column, totalColumns),
                        }}
                      />
                    )
                  },
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
