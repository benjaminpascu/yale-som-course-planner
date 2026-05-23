import { useEffect, useId } from 'react'
import { normalizeCategory } from '../lib/categoryDisplay'
import {
  formatCourseHeading,
  formatCourseUnits,
  formatTimeLabel,
} from '../lib/courseDisplay'
import { formatSessionLabel } from '../lib/sessionDisplay'

export function CalendarCourseDetail({
  course,
  fallYear = null,
  springYear = null,
}) {
  const timeRange =
    course.startTime && course.endTime
      ? `${formatTimeLabel(course.startTime)} – ${formatTimeLabel(course.endTime)}`
      : null

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold leading-snug text-gray-900">
        {formatCourseHeading(course)}
      </p>

      <div
        className={
          course.description
            ? 'grid grid-cols-[minmax(0,9.5rem)_1fr] gap-3 sm:gap-4'
            : ''
        }
      >
        <div className="min-w-0 space-y-2">
          <dl className="space-y-1.5 text-xs text-gray-700">
            <div>
              <dt className="font-medium text-gray-500">Faculty</dt>
              <dd>{course.faculty || 'Faculty TBA'}</dd>
            </div>
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
        </div>

        {course.description ? (
          <div className="min-w-0 border-l border-gray-100 pl-3 sm:pl-4">
            <p className="text-xs font-medium text-gray-500">Description</p>
            <p className="mt-1 max-h-48 overflow-y-auto text-xs leading-relaxed text-gray-600">
              {course.description}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
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
}) {
  const tooltipId = useId()
  const preferAbove = blockTopPx > gridHeight * 0.55

  useEffect(() => {
    if (!isDetailOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') onToggleDetail(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isDetailOpen, onToggleDetail])

  return (
    <>
      {isDetailOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/30 md:hidden"
            aria-label="Close course details"
            onClick={() => onToggleDetail(false)}
          />
          <div
            className="fixed inset-x-0 bottom-0 z-50 max-h-[min(85vh,32rem)] overflow-y-auto rounded-t-xl border-t border-gray-200 bg-white px-4 pb-6 pt-4 shadow-2xl md:hidden"
            role="dialog"
            aria-labelledby={tooltipId}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-200" />
            <div id={tooltipId}>
              <CalendarCourseDetail
                course={course}
                fallYear={fallYear}
                springYear={springYear}
              />
            </div>
            <p className="mt-3 text-center text-[11px] text-gray-400">
              Tap outside to close
            </p>
          </div>
        </>
      ) : null}

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
        className={`absolute text-left text-[10px] leading-tight text-white shadow-sm transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-yale-400 focus-visible:ring-offset-1 ${colorClass} ${isDetailOpen ? 'z-30' : 'z-10'} group overflow-visible rounded px-1 py-0.5`}
        style={positionStyle}
      >
        <span className="block truncate font-semibold">
          {course.courseNumber} ({formatCourseUnits(course.units)})
        </span>
        <span className="block truncate opacity-90">
          {course.startTime}–{course.endTime}
        </span>

        <div
          id={tooltipId}
          role="tooltip"
          className={`absolute z-50 hidden max-h-80 w-[min(34rem,calc(100vw-2rem))] overflow-y-auto rounded-lg border border-gray-200 bg-white p-3 text-left shadow-xl group-hover:block group-focus-visible:block max-md:!hidden ${
            preferAbove ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
          style={{ left: 0 }}
        >
          <CalendarCourseDetail
            course={course}
            fallYear={fallYear}
            springYear={springYear}
          />
        </div>
      </button>
    </>
  )
}
