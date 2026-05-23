import { useMemo } from 'react'
import { formatSchedule, hasMeetingTime } from '../lib/parseCourses'
import { IN_PLAN_SURFACE, sectionTone } from '../lib/sectionTheme'
import { formatSessionLabel } from '../lib/sessionDisplay'
import SectionHeader from './SectionHeader'

function formatTotalUnits(total) {
  if (total === 1) return '1 unit total'
  return `${total} units total`
}

export default function PlanPanel({
  selectedCourses,
  onRemoveCourse,
  onClearPlan,
}) {
  const sorted = useMemo(
    () =>
      [...selectedCourses].sort((a, b) =>
        a.courseNumber.localeCompare(b.courseNumber),
      ),
    [selectedCourses],
  )

  const totalUnits = useMemo(
    () => selectedCourses.reduce((sum, c) => sum + c.units, 0),
    [selectedCourses],
  )

  const planTone = sectionTone('plan')

  return (
    <section className={`flex shrink-0 flex-col border-b ${planTone.section}`}>
      <SectionHeader
        tone="plan"
        title="Your plan"
        subtitle="Click courses in the catalog to add or remove them."
      >
        {sorted.length > 0 ? (
          <button
            type="button"
            onClick={onClearPlan}
            className="shrink-0 text-xs font-medium text-yale-800 underline hover:text-yale-950"
          >
            Clear all
          </button>
        ) : null}
      </SectionHeader>

      {sorted.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-gray-500">
          No courses in your plan yet. Select courses from the catalog below —
          they will appear here and on the calendar above when they have a
          weekly time.
        </p>
      ) : (
        <>
          <ul className="space-y-0 px-1 pb-3 pt-1">
            {sorted.map((course) => (
              <li
                key={course.courseId}
                className={`mx-3 mb-2 flex items-start gap-2 rounded-md px-3 py-2 text-sm shadow-sm ${IN_PLAN_SURFACE}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900">
                    {course.courseNumber}
                  </p>
                  <p className="truncate text-gray-600">{course.title}</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {formatSchedule(course)} · {course.units} unit
                    {course.units === 1 ? '' : 's'} ·{' '}
                    {formatSessionLabel(course.session)}
                  </p>
                  {!hasMeetingTime(course) && (
                    <p className="mt-0.5 text-xs text-amber-700">
                      Not on calendar (no weekly time)
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveCourse(course.courseId)}
                  className="shrink-0 rounded px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  aria-label={`Remove ${course.courseNumber} from plan`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <p className="border-t border-yale-150 bg-yale-50 px-4 py-2 text-xs text-yale-900">
            {sorted.length} course{sorted.length === 1 ? '' : 's'} ·{' '}
            {formatTotalUnits(totalUnits)}
            <span className="text-gray-400">
              {' '}
              · Saving named plans comes in a later update
            </span>
          </p>
        </>
      )}
    </section>
  )
}
