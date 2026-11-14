import { useMemo } from 'react'
import { formatCourseUnits } from '../lib/courseDisplay'
import { sectionTone } from '../lib/sectionTheme'
import {
  formatSessionLabel,
  groupCoursesBySession,
} from '../lib/sessionDisplay'
import { coursesInSemester } from '../lib/planSemester'
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
  className = '',
  selectedCourses: planCourses,
  // Only this semester's courses are listed and counted (like the calendar).
  termCode = null,
  activePlanName,
  isDirty,
  fallYear,
  springYear,
  compact = false,
  collapsible = true,
  expanded,
  onToggle,
  planEmptyHint = 'Pick or save a plan in the Plan menu',
  onRemoveCourse,
  onClearPlan,
  // Compare plans: one full-width "Your plan" bar ('header') above each plan's list ('body').
  part = 'all',
  // Computer Plan tab: no count/units on the bar (semester units = Requirements Total).
  showHeaderSummary = true,
}) {
  const selectedCourses = useMemo(
    () => coursesInSemester(planCourses, termCode),
    [planCourses, termCode],
  )
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
    ? 'space-y-0 px-3 pb-2 pt-1.5'
    : 'space-y-0 px-4 pb-3 pt-2'

  const showSummary =
    showHeaderSummary && (activePlanName != null || courseCount > 0)

  const summaryEl = showSummary ? (
    <span className="shrink-0 font-normal text-yale-800">
      {formatPlanHeaderSummary(courseCount, totalUnits)}
      {isDirty ? <span className="text-caution"> · unsaved</span> : null}
    </span>
  ) : null

  if (part === 'body' && !expanded) return null

  return (
    <section
      // Open in Compare plans: the shared bar has no bottom line of its own (the lists below
      // have theirs), so it looks like single view.
      className={`flex flex-col ${part === 'header' && expanded ? '' : 'border-b'} ${className} ${planTone.section} ${
        part === 'header' ? 'shrink-0' :
        expanded && collapsible
          ? 'min-h-0 flex-1 overflow-hidden'
          : 'shrink-0'
      }`}
    >
      {part === 'body' ? null : collapsible ? (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className={`flex w-full shrink-0 cursor-pointer items-center gap-2 border-b text-left text-xs font-semibold text-yale-950 ${headerPad} ${planTone.header}`}
        >
          <CollapseChevron open={expanded} />
          <span className="flex-1">Your Plan</span>
          {summaryEl}
        </button>
      ) : (
        <div
          className={`flex w-full shrink-0 items-center gap-2 border-b text-xs font-semibold text-yale-950 ${headerPad} ${planTone.header}`}
        >
          <span className="flex-1">Your Plan</span>
          {summaryEl}
        </div>
      )}

      {expanded && part !== 'header' ? (
        <div
          className={
            collapsible
              ? 'flex min-h-0 flex-1 flex-col overflow-hidden'
              : 'flex flex-col'
          }
        >
          {/* Unsaved changes show next to Save Plan at the top, so no line here. */}
          {!activePlanName ? (
            <div
              className={`flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-yale-150 ${toolbarPad}`}
            >
              <p className="text-xs text-yale-700">{planEmptyHint}</p>
            </div>
          ) : null}

          {courseCount === 0 ? (
            <p
              className={`shrink-0 text-center text-gray-500 ${
                compact ? 'px-3 py-4 text-xs' : 'px-4 py-6 text-sm'
              }`}
            >
              No courses yet
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
                          : formatSessionLabel(group.session)}
                      </h3>
                      {/* One flat block per session, thin lines between courses. */}
                      <ul className="overflow-hidden rounded-md border border-save-100">
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
