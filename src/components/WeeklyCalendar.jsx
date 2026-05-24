import { useEffect, useMemo, useRef, useState } from 'react'
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
import CollapseChevron from './CollapseChevron'
import SectionHeader from './SectionHeader'

const START_HOUR = 8
const END_HOUR = 20
const MINUTES_PER_SLOT = 15
const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60
const PX_PER_MINUTE_MOBILE = 0.425
const PX_PER_MINUTE_MAX = 0.85
const PX_PER_MINUTE_MIN = 0.38

const CALENDAR_BLOCK_COLOR = 'bg-yale-800'
const GRID_COLUMNS = '2.75rem repeat(5, minmax(0, 1fr))'

function useDesktopCalendar() {
  const [desktop, setDesktop] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(min-width: 1024px)').matches
      : false,
  )

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const update = () => setDesktop(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  return desktop
}

function useFittedPxPerMinute(isDesktop, measureRef, remeasureKey, expanded) {
  const [bodyHeight, setBodyHeight] = useState(0)

  useEffect(() => {
    if (!isDesktop || !expanded) {
      setBodyHeight(0)
      return
    }
    const el = measureRef.current
    if (!el) {
      setBodyHeight(0)
      return
    }
    const update = () => setBodyHeight(el.clientHeight)
    update()
    // Flex layout may settle after mount when toggling plan ↔ calendar.
    let raf2 = 0
    const raf1 = requestAnimationFrame(() => {
      update()
      raf2 = requestAnimationFrame(update)
    })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
      ro.disconnect()
    }
  }, [isDesktop, measureRef, remeasureKey, expanded])

  return useMemo(() => {
    if (!isDesktop) return PX_PER_MINUTE_MOBILE
    if (bodyHeight <= 0) return PX_PER_MINUTE_MIN
    const fitted = bodyHeight / TOTAL_MINUTES
    return Math.min(
      PX_PER_MINUTE_MAX,
      Math.max(PX_PER_MINUTE_MIN, fitted),
    )
  }, [isDesktop, bodyHeight])
}

function topPx(startTime, pxPerMinute) {
  const minutes = parseTimeToMinutes(startTime)
  if (minutes === null) return 0
  return Math.max(0, (minutes - START_HOUR * 60) * pxPerMinute)
}

function heightPx(startTime, endTime, pxPerMinute) {
  const slotHeight = MINUTES_PER_SLOT * pxPerMinute
  const start = parseTimeToMinutes(startTime)
  const end = parseTimeToMinutes(endTime)
  if (start === null || end === null) return slotHeight
  return Math.max(slotHeight, (end - start) * pxPerMinute)
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

const FULL_TERM_TAB_HINT =
  'Full-term courses appear on both half-term tabs.'

function SessionTabHint() {
  return (
    <span className="group/hint relative inline-flex shrink-0">
      <button
        type="button"
        className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-semibold text-yale-800 ring-1 ring-yale-200 hover:bg-yale-50"
        aria-label={FULL_TERM_TAB_HINT}
      >
        <span aria-hidden>i</span>
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute right-0 top-full z-20 mt-1 hidden w-max max-w-[14rem] rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-left text-xs leading-snug text-yale-800 shadow-lg group-hover/hint:block group-focus-within/hint:block"
      >
        {FULL_TERM_TAB_HINT}
      </span>
    </span>
  )
}

function blockPositionStyle(column, totalColumns) {
  const widthPct = 100 / totalColumns
  const leftPct = column * widthPct
  return {
    left: `calc(${leftPct}% + 2px)`,
    width: `calc(${widthPct}% - 4px)`,
  }
}

function CalendarGrid({
  layoutByDay,
  hourLabels,
  gridHeight,
  pxPerMinute,
  gridBodyRef,
  fillHeight,
  calendarTone,
  fallYear,
  springYear,
  openDetailKey,
  setOpenDetailKey,
}) {
  const columnHeight = gridHeight

  return (
    <div
      className={`flex w-full min-h-0 flex-col rounded-lg border shadow-sm ${calendarTone.inset} ${
        fillHeight ? 'min-h-0 flex-1' : ''
      }`}
    >
      <div
        className="grid shrink-0"
        style={{ gridTemplateColumns: GRID_COLUMNS }}
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
      </div>

      <div
        ref={gridBodyRef}
        className={`grid ${fillHeight ? 'min-h-0 flex-1 content-start' : ''}`}
        style={{ gridTemplateColumns: GRID_COLUMNS }}
      >
        <div
          className="relative border-r border-gray-100"
          style={{ height: columnHeight }}
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
            style={{ height: columnHeight }}
          >
            {hourLabels.map(({ top }) => (
              <div
                key={`line-${day}-${top}`}
                className="pointer-events-none absolute inset-x-0 border-t border-gray-100"
                style={{ top }}
              />
            ))}
            {layoutByDay[day].map(({ course, column, totalColumns }) => {
              const blockKey = `${course.courseId}-${day}`
              const top = topPx(course.startTime, pxPerMinute)
              return (
                <CalendarCourseBlock
                  key={blockKey}
                  course={course}
                  fallYear={fallYear}
                  springYear={springYear}
                  colorClass={CALENDAR_BLOCK_COLOR}
                  blockTopPx={top}
                  gridHeight={gridHeight}
                  isDetailOpen={openDetailKey === blockKey}
                  onToggleDetail={(open) =>
                    setOpenDetailKey(open ? blockKey : null)
                  }
                  positionStyle={{
                    top,
                    height: heightPx(
                      course.startTime,
                      course.endTime,
                      pxPerMinute,
                    ),
                    ...blockPositionStyle(column, totalColumns),
                  }}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function WeeklyCalendar({
  selectedCourses,
  hasSelection,
  fallYear = null,
  springYear = null,
  collapsible = true,
  fillViewport = false,
  expanded = true,
  onToggle = () => {},
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
  const isDesktop = useDesktopCalendar()
  const gridBodyRef = useRef(null)
  const pxPerMinute = useFittedPxPerMinute(
    isDesktop,
    gridBodyRef,
    `${timedCourses.length}-${calendarView}-${viewOptions.length}`,
    expanded,
  )
  const gridHeight = TOTAL_MINUTES * pxPerMinute

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
      labels.push({ hour: h, top: (h - START_HOUR) * 60 * pxPerMinute })
    }
    return labels
  }, [pxPerMinute])

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

  const sectionLayoutClass = `flex flex-col border-b ${calendarTone.section} lg:min-h-0 ${
    fillViewport && hasSelection
      ? 'min-h-0 flex-1 overflow-hidden'
      : hasSelection && expanded
        ? 'shrink-0 lg:min-h-0 lg:flex-1 lg:overflow-hidden'
        : 'shrink-0'
  }`

  const gridSharedProps = {
    layoutByDay,
    hourLabels,
    gridHeight,
    pxPerMinute,
    gridBodyRef,
    calendarTone,
    fallYear,
    springYear,
    openDetailKey,
    setOpenDetailKey,
  }

  const showSessionTabs = viewOptions.length > 1

  const periodSubtitle = (
    <>
      {!showSessionTabs && activeViewLabel ? `${activeViewLabel} · ` : null}
      {formatCoursesInPeriod(periodCourses.length)} (
      {formatCourseUnits(periodUnits)})
      {periodUntimedCount > 0 ? (
        <span className="text-amber-700">
          {` · ${periodUntimedCount} without weekly time`}
        </span>
      ) : null}
    </>
  )

  const sessionTabs = showSessionTabs ? (
    <div
      className="flex flex-wrap items-center justify-end gap-1.5"
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
  ) : null

  if (!hasSelection) {
    return (
      <section
        id="weekly-calendar"
        className={`${sectionLayoutClass} min-h-44 sm:min-h-52`}
        aria-label="Weekly schedule"
      >
        <SectionHeader
          tone="calendar"
          title="Weekly calendar"
          subtitle={
            fillViewport
              ? 'Add courses in the Courses tab to build your schedule.'
              : 'Select courses below to plan your weekly schedule.'
          }
        />
        <div className="flex flex-1 flex-col justify-center px-4 py-10">
          <p className="text-center text-xs text-gray-400">
            Courses with meeting times will show on this calendar.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section
      id="weekly-calendar"
      className={sectionLayoutClass}
      aria-label="Weekly schedule"
    >
      <div className={`border-b ${calendarTone.header}`}>
        <div className="flex flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
          <div className="flex min-w-0 items-center justify-between gap-2 sm:flex-1 sm:justify-start">
            {collapsible ? (
              <button
                type="button"
                onClick={onToggle}
                aria-expanded={expanded}
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left"
              >
                <CollapseChevron open={expanded} />
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-semibold text-yale-950">
                    Weekly calendar
                  </h2>
                  <p className="mt-0.5 text-xs leading-snug text-yale-700">
                    {periodSubtitle}
                  </p>
                </div>
              </button>
            ) : (
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold text-yale-950">
                  Weekly calendar
                </h2>
                <p className="mt-0.5 text-xs leading-snug text-yale-700">
                  {periodSubtitle}
                </p>
              </div>
            )}
            {mixedNonOverlappingSessions ? <SessionTabHint /> : null}
          </div>
          {sessionTabs ? (
            <div
              className={`flex shrink-0 flex-wrap items-center justify-end gap-1.5 ${
                collapsible ? 'pl-6 sm:pl-0' : ''
              }`}
            >
              {sessionTabs}
            </div>
          ) : null}
        </div>
      </div>

      {expanded ? (
        <div
          className={`flex shrink-0 flex-col lg:min-h-0 lg:flex-1 lg:overflow-hidden ${
            fillViewport ? 'min-h-0 flex-1 overflow-y-auto' : ''
          }`}
        >
          {timedCourses.length === 0 ? (
            <p className="shrink-0 px-4 py-10 text-center text-sm text-gray-600 lg:flex-1 lg:content-center">
              None of your selected courses have a weekly meeting time, so nothing
              appears on the grid. They still count in your plan and requirements
              below.
            </p>
          ) : visibleCourses.length === 0 ? (
            <p className="shrink-0 px-4 py-10 text-center text-sm text-gray-600 lg:flex-1 lg:content-center">
              No courses in your plan match this session view. Try another tab
              above.
            </p>
          ) : (
            <div
              className={`flex w-full shrink-0 flex-col px-4 py-2 sm:py-3 lg:min-h-0 lg:flex-1 lg:py-2 ${
                isDesktop ? 'overflow-hidden' : ''
              }`}
            >
              <CalendarGrid
                {...gridSharedProps}
                fillHeight={isDesktop}
              />
            </div>
          )}
        </div>
      ) : null}
    </section>
  )
}
