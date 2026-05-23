import { useMemo } from 'react'
import { normalizeCategory } from '../lib/categoryDisplay'
import {
  formatCourseHeading,
  formatCourseUnits,
  parseTimeToMinutes,
} from '../lib/courseDisplay'
import { hasMeetingTime } from '../lib/parseCourses'
import { formatSessionLabel } from '../lib/sessionDisplay'
import { sectionTone } from '../lib/sectionTheme'
import SectionHeader from './SectionHeader'

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr']
const START_HOUR = 8
const END_HOUR = 21
const MINUTES_PER_SLOT = 15
const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60
const PX_PER_MINUTE = 0.85
const GRID_HEIGHT = TOTAL_MINUTES * PX_PER_MINUTE

const CATEGORY_COLORS = [
  'bg-yale-800',
  'bg-yale-700',
  'bg-yale-600',
  'bg-slate-700',
  'bg-slate-600',
  'bg-gray-700',
  'bg-gray-600',
  'bg-yale-900',
]

function blockColor(category) {
  const key = category || 'default'
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = (hash + key.charCodeAt(i) * (i + 1)) % CATEGORY_COLORS.length
  }
  return CATEGORY_COLORS[hash]
}

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

export default function WeeklyCalendar({
  selectedCourses,
  hasSelection,
  onRemoveCourse,
}) {
  const timedCourses = useMemo(
    () => selectedCourses.filter(hasMeetingTime),
    [selectedCourses],
  )

  const untimedCount = selectedCourses.length - timedCourses.length

  const hourLabels = useMemo(() => {
    const labels = []
    for (let h = START_HOUR; h <= END_HOUR; h++) {
      labels.push({ hour: h, top: (h - START_HOUR) * 60 * PX_PER_MINUTE })
    }
    return labels
  }, [])

  const calendarTone = sectionTone('calendar')

  if (!hasSelection) {
    return (
      <section
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
      className={`flex shrink-0 flex-col border-b ${calendarTone.section}`}
    >
      <SectionHeader
        tone="calendar"
        title="Weekly calendar"
        subtitle={
          <>
            {timedCourses.length} on calendar
            {untimedCount > 0
              ? ` · ${untimedCount} in plan without weekly time`
              : ''}
          </>
        }
      />

      {timedCourses.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-gray-600">
          None of your selected courses have a weekly meeting time, so nothing
          appears on the grid. They still count in your plan and requirements
          below.
        </p>
      ) : (
        <div className="w-full px-2 py-2 sm:px-4 sm:py-3">
          <div
            className={`grid w-full overflow-hidden rounded-lg border shadow-sm ${calendarTone.inset}`}
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

            <div className="relative border-r border-gray-100" style={{ height: GRID_HEIGHT }}>
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
                {timedCourses.flatMap((course) => {
                  if (!course.meetingDays.includes(day)) return []
                  return (
                    <button
                      key={`${course.courseId}-${day}`}
                      type="button"
                      title={`${formatCourseHeading(course)}\n${formatSessionLabel(course.session)} · ${course.faculty || 'Faculty TBA'}${course.room ? ` · ${course.room}` : ''}`}
                      onClick={() => onRemoveCourse(course.courseId)}
                      className={`absolute inset-x-0.5 z-10 overflow-hidden rounded px-1 py-0.5 text-left text-[10px] leading-tight text-white shadow-sm hover:ring-2 hover:ring-white/80 ${blockColor(normalizeCategory(course.category))}`}
                      style={{
                        top: topPx(course.startTime),
                        height: heightPx(course.startTime, course.endTime),
                      }}
                    >
                      <span className="block truncate font-semibold">
                        {course.courseNumber} ({formatCourseUnits(course.units)})
                      </span>
                      <span className="block truncate opacity-90">
                        {course.startTime}–{course.endTime}
                      </span>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
