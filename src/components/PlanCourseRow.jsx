import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import {
  TOOLTIP_HIDE_DELAY_MS,
  calendarCourseTooltipStyle,
  clampPortaledTooltipLeft,
} from '../lib/portaledTooltip'
import { formatCourseHeading } from '../lib/courseDisplay'
import {
  formatSchedule,
  hasMeetingTime,
  NO_MEETING_TIME_MESSAGE,
} from '../lib/parseCourses'
import { IN_PLAN_SURFACE } from '../lib/sectionTheme'
import { CalendarCourseDetail } from './CalendarCourseBlock'
import CourseDetailSheet from './CourseDetailSheet'

function isDesktopDetail() {
  return window.matchMedia('(min-width: 768px)').matches
}

export default function PlanCourseRow({
  course,
  fallYear,
  springYear,
  compact = false,
  onRemoveCourse,
}) {
  const detailId = useId()
  const triggerRef = useRef(null)
  const tooltipRef = useRef(null)
  const hideTimerRef = useRef(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [desktopTooltipOpen, setDesktopTooltipOpen] = useState(false)
  const [tooltipStyle, setTooltipStyle] = useState(null)

  const preferAbove = useCallback(() => {
    if (!triggerRef.current) return true
    const rect = triggerRef.current.getBoundingClientRect()
    return rect.top > window.innerHeight * 0.45
  }, [])

  const refreshTooltipStyle = useCallback(() => {
    if (!triggerRef.current) return
    setTooltipStyle(
      calendarCourseTooltipStyle(triggerRef.current, {
        above: preferAbove(),
        hasDescription: Boolean(course.description),
      }),
    )
  }, [course.description, preferAbove])

  const cancelHideTooltip = useCallback(() => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
  }, [])

  const openDesktopTooltip = useCallback(() => {
    if (!isDesktopDetail() || !triggerRef.current) return
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
    if (!desktopTooltipOpen || !triggerRef.current || !tooltipRef.current) {
      return
    }
    const left = clampPortaledTooltipLeft(
      triggerRef.current,
      tooltipRef.current,
    )
    setTooltipStyle((prev) => {
      if (!prev || prev.left === left) return prev
      return { ...prev, left }
    })
  }, [desktopTooltipOpen, course])

  useEffect(() => () => cancelHideTooltip(), [cancelHideTooltip])

  return (
    <>
      <CourseDetailSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        course={course}
        fallYear={fallYear}
        springYear={springYear}
        detailId={detailId}
        hideFromClass={compact ? 'lg:hidden' : 'md:hidden'}
      />

      <li
        className={`flex items-start rounded-md shadow-sm ${IN_PLAN_SURFACE} ${
          compact
            ? 'mb-1 gap-1.5 px-2 py-1.5 text-xs'
            : 'mb-2 gap-2 px-3 py-2 text-sm'
        }`}
      >
        <button
          ref={triggerRef}
          type="button"
          aria-expanded={sheetOpen || desktopTooltipOpen}
          aria-controls={detailId}
          aria-label={`View details for ${course.courseNumber}`}
          onClick={() => {
            if (
              compact ||
              window.matchMedia('(max-width: 767px)').matches
            ) {
              setSheetOpen((open) => !open)
            }
          }}
          onMouseEnter={openDesktopTooltip}
          onMouseLeave={scheduleHideDesktopTooltip}
          onFocus={openDesktopTooltip}
          onBlur={scheduleHideDesktopTooltip}
          className={`min-w-0 flex-1 rounded-md text-left transition-colors hover:bg-save-100/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-yale-400 focus-visible:ring-offset-1 ${
            compact ? '-my-1.5 -ml-2 py-1.5 pl-2 pr-1' : '-my-2 -ml-3 py-2 pl-3 pr-1'
          }`}
        >
          <p className="font-medium leading-snug text-gray-900">
            {formatCourseHeading(course)}
          </p>
          <div
            className={`mt-0.5 space-y-0.5 ${
              compact ? 'pl-2 text-[10px]' : 'pl-3 text-xs'
            }`}
          >
            <p className="text-gray-500">{formatSchedule(course)}</p>
            {!hasMeetingTime(course) ? (
              <p className="font-medium text-amber-700">
                {NO_MEETING_TIME_MESSAGE}
              </p>
            ) : null}
          </div>
        </button>
        <button
          type="button"
          onClick={() => onRemoveCourse(course.courseId)}
          className={`-mr-1 flex shrink-0 items-center justify-center rounded-md leading-none text-gray-400 hover:bg-red-50 hover:text-red-700 ${
            compact ? 'h-6 w-6 text-base' : 'h-7 w-7 text-lg'
          }`}
          aria-label={`Remove ${course.courseNumber} from plan`}
        >
          <span aria-hidden>×</span>
        </button>
      </li>

      {desktopTooltipOpen && tooltipStyle
        ? createPortal(
            <div
              ref={tooltipRef}
              id={detailId}
              role="tooltip"
              className="rounded-lg border border-gray-200 bg-white p-3 text-left shadow-xl max-md:hidden"
              style={tooltipStyle}
              onMouseEnter={openDesktopTooltip}
              onMouseLeave={scheduleHideDesktopTooltip}
            >
              <CalendarCourseDetail
                course={course}
                fallYear={fallYear}
                springYear={springYear}
              />
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
