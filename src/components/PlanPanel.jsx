import { useMemo } from 'react'
import {
  formatCourseHeading,
  formatCourseUnits,
} from '../lib/courseDisplay'
import {
  formatSchedule,
  hasMeetingTime,
  NO_MEETING_TIME_MESSAGE,
} from '../lib/parseCourses'
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
  expanded,
  onToggle,
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
    <section
      className={`flex flex-col border-b ${planTone.section} ${
        expanded ? 'min-h-0 flex-1 overflow-hidden' : 'shrink-0'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className={`flex w-full shrink-0 cursor-pointer items-center gap-2 border-b px-4 py-3 text-left text-sm font-semibold text-yale-950 ${planTone.header}`}
      >
        <CollapseChevron open={expanded} />
        <span className="flex-1">Your plan</span>
        {showSummary ? (
          <span className="shrink-0 font-normal text-yale-800">
            {formatPlanHeaderSummary(courseCount, totalUnits)}
            {isDirty ? (
              <span className="text-red-700"> · unsaved</span>
            ) : null}
          </span>
        ) : null}
      </button>

      {expanded ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {!activePlanName || isDirty ? (
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-yale-150 px-4 py-2">
              <p className="text-xs text-yale-700">
                {!activePlanName ? (
                  'Open Plans in the header to pick or create a plan, then add courses from the catalog.'
                ) : (
                  <>
                    Unsaved changes to{' '}
                    <span className="italic">{activePlanName}</span>. Save when
                    you&apos;re done editing.
                  </>
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
          ) : null}

          {courseCount === 0 ? (
            <p className="shrink-0 border-l-2 border-yale-200 py-6 pl-5 pr-4 text-center text-sm text-gray-500 sm:pl-6">
              No courses in your plan yet. Select courses from the catalog on the
              left — they appear here and on the calendar when they have a weekly
              time.
            </p>
          ) : (
            <>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="space-y-0 border-l-2 border-yale-200 pb-3 pl-5 pr-4 pt-1 sm:pl-6">
                  {grouped.map((group, groupIndex) => (
                    <section
                      key={group.session}
                      className={
                        groupIndex > 0
                          ? 'mt-5 border-t border-yale-150 pt-4'
                          : ''
                      }
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
                                {!hasMeetingTime(course) ? (
                                  <p className="font-medium text-amber-700">
                                    {NO_MEETING_TIME_MESSAGE}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => onRemoveCourse(course.courseId)}
                              className="-mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-lg leading-none text-gray-400 hover:bg-red-50 hover:text-red-700"
                              aria-label={`Remove ${course.courseNumber} from plan`}
                            >
                              <span aria-hidden>×</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-yale-150 bg-yale-50 px-4 py-2">
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
        </div>
      ) : null}
    </section>
  )
}
