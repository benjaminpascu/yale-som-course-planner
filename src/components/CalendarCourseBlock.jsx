import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import CourseDetailSheet from './CourseDetailSheet'
import { normalizeCategory } from '../lib/categoryDisplay'
import {
  formatCourseUnits,
  formatTimeLabel,
} from '../lib/courseDisplay'
import { isSomCourse } from '../lib/schools'
import { formatSessionLabel } from '../lib/sessionDisplay'
import {
  CALENDAR_DESCRIPTION_LINE_COUNT,
  LARGE_DESCRIPTION_LINE_COUNT,
  TOOLTIP_HIDE_DELAY_MS,
  calendarCourseTooltipStyle,
  clampPortaledTooltipLeft,
} from '../lib/portaledTooltip'

export function CalendarCourseDetail({
  course,
  fallYear = null,
  springYear = null,
  // Your Plan's bigger popup shows more description before it scrolls.
  descriptionLines = CALENDAR_DESCRIPTION_LINE_COUNT,
}) {
  const timeRange =
    course.startTime && course.endTime
      ? `${formatTimeLabel(course.startTime)} – ${formatTimeLabel(course.endTime)}`
      : null

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold leading-snug text-gray-900">
        {course.courseNumber} — {course.title}
      </p>

      <div
        className={
          course.description
            ? 'grid grid-cols-[minmax(0,9.5rem)_1fr] gap-3 sm:gap-4'
            : ''
        }
      >
        <div data-tooltip-metadata className="min-w-0 space-y-2">
          <dl className="space-y-1.5 text-xs text-gray-700">
            <div>
              <dt className="font-medium text-gray-500">Faculty</dt>
              <dd>{course.faculty || 'Faculty TBA'}</dd>
            </div>
            {isSomCourse(course) ? (
              <div>
                <dt className="font-medium text-gray-500">Units</dt>
                <dd>{formatCourseUnits(course.units)}</dd>
              </div>
            ) : null}
            <div>
              <dt className="font-medium text-gray-500">When</dt>
              <dd className="space-y-0.5">
                {course.meetingDays.map((meetingDay) => (
                  <div key={meetingDay}>
                    {meetingDay}
                    {timeRange ? ` · ${timeRange}` : ''}
                  </div>
                ))}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-gray-500">Session</dt>
              <dd>
                {formatSessionLabel(course.session, { fallYear, springYear })}
              </dd>
            </div>
            {course.room ? (
              <div>
                <dt className="font-medium text-gray-500">Room</dt>
                <dd>{course.room}</dd>
              </div>
            ) : null}
            {course.category ? (
              <div>
                <dt className="font-medium text-gray-500">Category</dt>
                <dd>{normalizeCategory(course.category)}</dd>
              </div>
            ) : null}
          </dl>
          {course.syllabusUrl ? (
            <a
              href={course.syllabusUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-xs font-medium text-yale-800 underline decoration-yale-800/30 hover:decoration-yale-800"
              onClick={(e) => e.stopPropagation()}
            >
              Syllabus
            </a>
          ) : null}
          {course.coursePageUrl ? (
            <a
              href={course.coursePageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-3 inline-block text-xs font-medium text-yale-800 underline decoration-yale-800/30 hover:decoration-yale-800"
              onClick={(e) => e.stopPropagation()}
            >
              Course page
            </a>
          ) : null}
        </div>

        {course.description ? (
          <div
            data-tooltip-description
            className="min-w-0 border-l border-gray-100 pl-3 sm:pl-4"
          >
            <p
              data-tooltip-description-label
              className="text-xs font-medium text-gray-500"
            >
              Description
            </p>
            <p
              data-tooltip-description-body
              className="mt-1 overflow-y-auto text-xs leading-relaxed text-gray-600"
              style={{ maxHeight: `min(${descriptionLines}lh, var(--tooltip-desc-max, 100vh))` }}
            >
              {course.description}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function isDesktopCalendar() {
  return window.matchMedia('(min-width: 768px)').matches
}

export default function CalendarCourseBlock({
  course,
  fallYear = null,
  springYear = null,
  colorClass,
  positionStyle,
  blockTopPx,
  gridHeight,
  isDetailOpen,
  onToggleDetail,
  onRemove = null,
}) {
  const tooltipId = useId()
  const buttonRef = useRef(null)
  const tooltipRef = useRef(null)
  const hideTimerRef = useRef(null)
  const preferAbove = blockTopPx > gridHeight * 0.55
  const [desktopTooltipOpen, setDesktopTooltipOpen] = useState(false)
  const [tooltipStyle, setTooltipStyle] = useState(null)

  const refreshTooltipStyle = useCallback(() => {
    if (!buttonRef.current) return
    setTooltipStyle(
      calendarCourseTooltipStyle(buttonRef.current, {
        above: preferAbove,
        hasDescription: Boolean(course.description),
        large: true, // Same size as the Your Plan hover box.
      }),
    )
  }, [preferAbove, course.description])

  const cancelHideTooltip = useCallback(() => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
  }, [])

  const openDesktopTooltip = useCallback(() => {
    if (!isDesktopCalendar() || !buttonRef.current) return
    cancelHideTooltip()
    refreshTooltipStyle()
    setDesktopTooltipOpen(true)
  }, [cancelHideTooltip, refreshTooltipStyle])

  const scheduleHideDesktopTooltip = useCallback(() => {
    cancelHideTooltip()
    hideTimerRef.current = window.setTimeout(() => {
      setDesktopTooltipOpen(false)
      hideTimerRef.current = null
    }, TOOLTIP_HIDE_DELAY_MS)
  }, [cancelHideTooltip])

  useEffect(() => {
    if (!isDetailOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') onToggleDetail(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isDetailOpen, onToggleDetail])

  useEffect(() => {
    if (!desktopTooltipOpen) return
    const reposition = () => refreshTooltipStyle()
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    return () => {
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
    }
  }, [desktopTooltipOpen, refreshTooltipStyle])

  useLayoutEffect(() => {
    if (!desktopTooltipOpen || !buttonRef.current || !tooltipRef.current) return

    const left = clampPortaledTooltipLeft(
      buttonRef.current,
      tooltipRef.current,
    )
    setTooltipStyle((prev) => {
      if (!prev || prev.left === left) return prev
      return { ...prev, left }
    })
  }, [desktopTooltipOpen, course, preferAbove])

  useEffect(() => () => cancelHideTooltip(), [cancelHideTooltip])

  return (
    <>
      {isDetailOpen ? (
        <CourseDetailSheet
          open={isDetailOpen}
          onClose={() => onToggleDetail(false)}
          course={course}
          fallYear={fallYear}
          springYear={springYear}
          detailId={tooltipId}
        />
      ) : null}

      {/* Hover box: the course block plus a corner × that removes it from the plan. */}
      <div
        ref={buttonRef}
        onMouseEnter={openDesktopTooltip}
        onMouseLeave={scheduleHideDesktopTooltip}
        className={`group absolute hover:z-[100] focus-within:z-[100] ${isDetailOpen ? 'z-30' : 'z-10'}`}
        style={positionStyle}
      >
      <button
        type="button"
        aria-expanded={isDetailOpen}
        aria-controls={tooltipId}
        onClick={(e) => {
          e.stopPropagation()
          if (window.matchMedia('(max-width: 767px)').matches) {
            onToggleDetail(!isDetailOpen)
          }
        }}
        onFocus={openDesktopTooltip}
        onBlur={scheduleHideDesktopTooltip}
        className={`absolute inset-0 text-center text-[10px] leading-tight text-white shadow-sm transition-shadow group-hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-yale-400 focus-visible:ring-offset-1 ${colorClass} rounded px-1 py-0.5`}
      >
        <span className="block truncate font-semibold">
          {course.courseNumber}
        </span>
        <span className="block truncate opacity-90">
          {course.startTime}–{course.endTime}
        </span>
      </button>
      {onRemove ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRemove(course.courseId)
          }}
          className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border border-gray-300 bg-white text-xs leading-none text-gray-600 opacity-0 shadow-sm hover:border-danger/40 hover:bg-danger/5 hover:text-danger focus:outline-none focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-yale-400 group-hover:opacity-100 max-md:hidden"
          aria-label={`Remove ${course.courseNumber} from plan`}
        >
          <span aria-hidden>×</span>
        </button>
      ) : null}
      </div>

      {desktopTooltipOpen && tooltipStyle
        ? createPortal(
            <div
              ref={tooltipRef}
              id={tooltipId}
              role="tooltip"
              className="overflow-y-auto rounded-lg border border-gray-200 bg-white p-4 text-left shadow-xl max-md:hidden"
              style={tooltipStyle}
              onMouseEnter={openDesktopTooltip}
              onMouseLeave={scheduleHideDesktopTooltip}
            >
              <CalendarCourseDetail
                course={course}
                fallYear={fallYear}
                springYear={springYear}
                descriptionLines={LARGE_DESCRIPTION_LINE_COUNT}
              />
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
