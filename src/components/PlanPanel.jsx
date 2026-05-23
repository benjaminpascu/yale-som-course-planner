import { useMemo } from 'react'
import {
  formatCourseHeading,
  formatCourseUnits,
} from '../lib/courseDisplay'
import { formatSchedule, hasMeetingTime } from '../lib/parseCourses'
import { IN_PLAN_SURFACE, SAVE_BUTTON, sectionTone } from '../lib/sectionTheme'
import {
  formatSessionLabel,
  groupCoursesBySession,
} from '../lib/sessionDisplay'
import CollapseChevron from './CollapseChevron'

function formatTotalUnits(total) {
  if (total === 1) return '1 unit total'
  return `${total} units total`
}

function formatCourseCount(count) {
  if (count === 1) return '1 course'
  return `${count} courses`
}

function formatPlanHeaderSummary(courseCount, totalUnits) {
  return `${formatCourseCount(courseCount)} (${formatCourseUnits(totalUnits)})`
}

export default function PlanPanel({
  selectedCourses,
  activePlanName,
  isDirty,
  fallYear,
  springYear,
  onSavePlan,
  onRemoveCourse,
  onClearPlan,
}) {
  const grouped = useMemo(
    () => groupCoursesBySession(selectedCourses),
    [selectedCourses],
  )

  const courseCount = selectedCourses.length

  const totalUnits = useMemo(
    () => selectedCourses.reduce((sum, c) => sum + c.units, 0),
    [selectedCourses],
  )

  const planTone = sectionTone('plan')

  const showSummary =
    activePlanName != null || courseCount > 0

  return (
    <details className={`group border-b ${planTone.section}`} open>
      <summary
        className={`flex cursor-pointer list-none items-center gap-2 border-b px-4 py-3 text-sm font-semibold text-yale-950 marker:content-none [&::-webkit-details-marker]:hidden ${planTone.header}`}
      >
        <CollapseChevron />
        <span className="flex-1">
          Current plan
          {activePlanName != null ? ` (${activePlanName})` : ''}
        </span>
        {showSummary ? (
          <span className="shrink-0 font-normal text-yale-800">
            {formatPlanHeaderSummary(courseCount, totalUnits)}
            {isDirty ? (
              <span className="text-red-700"> · unsaved</span>
            ) : null}
          </span>
        ) : null}
      </summary>

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-yale-150 px-4 py-2">
        <p className="text-xs text-yale-700">
          {activePlanName ? (
            isDirty ? (
              <>
                Unsaved changes to your plan, named{' '}
                <span className="italic">{activePlanName}</span>. Add or remove courses below, then save.
              </>
            ) : (
              <>
                Courses in your plan, named <span className="italic">{activePlanName}</span>.
              </>
            )
          ) : (
            'Click a saved plan above to show it on the calendar, then add courses here.'
          )}
        </p>
        {activePlanName && isDirty ? (
          <button
            type="button"
            onClick={onSavePlan}
            className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium ${SAVE_BUTTON}`}
          >
            Save plan
          </button>
        ) : null}
      </div>

      {courseCount === 0 ? (
        <p className="border-l-2 border-yale-200 py-6 pl-5 pr-4 text-center text-sm text-gray-500 sm:pl-6">
          No courses in the active plan. Select courses from the catalog below
          — they appear here and on the calendar when they have a weekly time.
        </p>
      ) : (
        <>
          <div className="space-y-0 border-l-2 border-yale-200 pb-3 pl-5 pr-4 pt-1 sm:pl-6">
            {grouped.map((group, groupIndex) => (
              <section
                key={group.session}
                className={groupIndex > 0 ? 'mt-5 border-t border-yale-150 pt-4' : ''}
              >
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-yale-800">
                  {group.session === 'Other'
                    ? 'Other'
                    : formatSessionLabel(group.session, {
                        fallYear,
                        springYear,
                      })}
                </h3>
                <ul className="space-y-0">
                  {group.courses.map((course) => (
                    <li
                      key={course.courseId}
                      className={`mb-2 flex items-start gap-2 rounded-md px-3 py-2 text-sm shadow-sm ${IN_PLAN_SURFACE}`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900">
                          {formatCourseHeading(course)}
                        </p>
                        <div className="mt-0.5 space-y-0.5 pl-3 text-xs">
                          <p className="text-gray-500">
                            {formatSchedule(course)}
                          </p>
                          {!hasMeetingTime(course) && (
                            <p className="text-amber-700">
                              Not on calendar (no weekly time)
                            </p>
                          )}
                        </div>
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
              </section>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-yale-150 bg-yale-50 px-4 py-2">
            <p className="text-xs text-yale-900">
              {courseCount} course{courseCount === 1 ? '' : 's'} ·{' '}
              {formatTotalUnits(totalUnits)}
            </p>
            <button
              type="button"
              onClick={onClearPlan}
              className="text-xs font-medium text-gray-600 underline hover:text-gray-900"
            >
              Clear all courses
            </button>
          </div>
        </>
      )}
    </details>
  )
}
