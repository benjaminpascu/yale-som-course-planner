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
  compact = false,
  collapsible = true,
  expanded,
  onToggle,
  planEmptyHint = 'Open Plans in the header to pick or create a plan, then add courses from the catalog.',
  catalogSelectHint = 'the catalog on the left',
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
  const headerPad = compact ? 'px-3 py-1.5' : 'px-4 py-2'
  const toolbarPad = compact ? 'px-3 py-1.5' : 'px-4 py-2'
  const listWrapClass = compact
    ? 'space-y-0 border-l-2 border-yale-200 pb-2 pl-3 pr-3 pt-0.5'
    : 'space-y-0 border-l-2 border-yale-200 pb-3 pl-5 pr-4 pt-1 sm:pl-6'

  const showSummary =
    activePlanName != null || courseCount > 0

  const summaryEl = showSummary ? (
    <span className="shrink-0 font-normal text-yale-800">
      {formatPlanHeaderSummary(courseCount, totalUnits)}
      {isDirty ? <span className="text-red-700"> · unsaved</span> : null}
    </span>
  ) : null

  return (
    <section
      className={`flex flex-col border-b ${planTone.section} ${
        expanded && collapsible
          ? 'min-h-0 flex-1 overflow-hidden'
          : 'shrink-0'
      }`}
    >
      {collapsible ? (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className={`flex w-full shrink-0 cursor-pointer items-center gap-2 border-b text-left text-xs font-semibold text-yale-950 ${headerPad} ${planTone.header}`}
        >
          <CollapseChevron open={expanded} />
          <span className="flex-1">Your plan</span>
          {summaryEl}
        </button>
      ) : (
        <div
          className={`flex w-full shrink-0 items-center gap-2 border-b text-xs font-semibold text-yale-950 ${headerPad} ${planTone.header}`}
        >
          <span className="flex-1">Your plan</span>
          {summaryEl}
        </div>
      )}

      {expanded ? (
        <div
          className={
            collapsible
              ? 'flex min-h-0 flex-1 flex-col overflow-hidden'
              : 'flex flex-col'
          }
        >
          {!activePlanName || isDirty ? (
            <div
              className={`flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-yale-150 ${toolbarPad}`}
            >
              <p className="text-xs text-yale-700">
                {!activePlanName ? planEmptyHint : (
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
            <p
              className={`shrink-0 border-l-2 border-yale-200 text-center text-gray-500 ${
                compact
                  ? 'py-4 pl-3 pr-3 text-xs'
                  : 'py-6 pl-5 pr-4 text-sm sm:pl-6'
              }`}
            >
              No courses in your plan yet. Select courses from {catalogSelectHint}{' '}
              — they appear here and on the calendar when they have a weekly
              time.
            </p>
          ) : (
            <>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <div className={listWrapClass}>
                  {grouped.map((group, groupIndex) => (
                    <section
                      key={group.session}
                      className={
                        groupIndex > 0
                          ? compact
                            ? 'mt-3 border-t border-yale-150 pt-2'
                            : 'mt-5 border-t border-yale-150 pt-4'
                          : ''
                      }
                    >
                      <h3
                        className={`font-semibold uppercase tracking-wide text-yale-800 ${
                          compact
                            ? 'mb-1 text-[10px]'
                            : 'mb-2 text-xs'
                        }`}
                      >
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
                            className={`flex items-start rounded-md shadow-sm ${IN_PLAN_SURFACE} ${
                              compact
                                ? 'mb-1 gap-1.5 px-2 py-1.5 text-xs'
                                : 'mb-2 gap-2 px-3 py-2 text-sm'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <p className="font-medium leading-snug text-gray-900">
                                {formatCourseHeading(course)}
                              </p>
                              <div
                                className={`mt-0.5 space-y-0.5 ${
                                  compact ? 'pl-2 text-[10px]' : 'pl-3 text-xs'
                                }`}
                              >
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
                              className={`-mr-1 flex shrink-0 items-center justify-center rounded-md leading-none text-gray-400 hover:bg-red-50 hover:text-red-700 ${
                                compact
                                  ? 'h-6 w-6 text-base'
                                  : 'h-7 w-7 text-lg'
                              }`}
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
              <div
                className={`flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-yale-150 bg-yale-50 ${toolbarPad}`}
              >
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
