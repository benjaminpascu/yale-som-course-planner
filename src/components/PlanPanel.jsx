import { useMemo } from 'react'
import { formatCourseUnits } from '../lib/courseDisplay'
import { SAVE_BUTTON, sectionTone } from '../lib/sectionTheme'
import {
  formatSessionLabel,
  groupCoursesBySession,
} from '../lib/sessionDisplay'
import CollapseChevron from './CollapseChevron'
import PlanCourseRow from './PlanCourseRow'

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
                          <PlanCourseRow
                            key={course.courseId}
                            course={course}
                            fallYear={fallYear}
                            springYear={springYear}
                            compact={compact}
                            onRemoveCourse={onRemoveCourse}
                          />
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
