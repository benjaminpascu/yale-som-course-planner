import { useMemo } from 'react'
import { formatCourseHeading } from '../lib/courseDisplay'
import { formatSchedule, hasMeetingTime } from '../lib/parseCourses'
import { IN_PLAN_SURFACE, sectionTone } from '../lib/sectionTheme'
import { formatSessionLabel } from '../lib/sessionDisplay'
import CollapseChevron from './CollapseChevron'
import { PlanDisclaimer } from './Disclaimer'

const DRAFT_VALUE = '__draft__'
const NEW_PLAN_VALUE = '__new__'

function formatTotalUnits(total) {
  if (total === 1) return '1 unit total'
  return `${total} units total`
}

export default function PlanPanel({
  selectedCourses,
  plans,
  activePlanId,
  activePlanName,
  isDirty,
  onNewPlan,
  onSelectPlan,
  onSavePlan,
  onRenamePlan,
  onDeletePlan,
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
  const selectValue = activePlanId ?? DRAFT_VALUE
  const hasSavedPlan = Boolean(activePlanId)

  function handleMenuChange(e) {
    const value = e.target.value
    if (value === NEW_PLAN_VALUE) {
      onNewPlan()
      return
    }
    if (value === DRAFT_VALUE) return
    onSelectPlan(value)
  }

  const summaryHint = hasSavedPlan
    ? activePlanName
    : sorted.length > 0
      ? `${sorted.length} course${sorted.length === 1 ? '' : 's'} (not saved)`
      : null

  return (
    <details className={`group border-b ${planTone.section}`} open>
      <summary
        className={`flex cursor-pointer list-none items-center gap-2 border-b px-4 py-3 text-sm font-semibold text-yale-950 marker:content-none [&::-webkit-details-marker]:hidden ${planTone.header}`}
      >
        <CollapseChevron />
        <span className="flex-1">Your plan</span>
        {isDirty ? (
          <span className="font-normal text-amber-800">(unsaved)</span>
        ) : null}
        {summaryHint ? (
          <span className="font-normal text-yale-800">{summaryHint}</span>
        ) : null}
      </summary>

      <div className="border-b border-yale-150 px-4 py-2">
        <p className="text-xs text-yale-700">
          {hasSavedPlan
            ? `“${activePlanName}”${isDirty ? ' — unsaved changes' : ''}. Pick another plan or add courses below.`
            : 'Add courses below, then Save to name and store this plan in your browser.'}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-yale-150 px-4 py-3">
        <select
          value={selectValue}
          onChange={handleMenuChange}
          className="min-w-[10rem] flex-1 rounded-md border border-yale-200 bg-white px-2.5 py-1.5 text-sm text-gray-900 shadow-sm focus:border-yale-500 focus:outline-none focus:ring-1 focus:ring-yale-500"
          aria-label="Switch plan"
        >
          {!hasSavedPlan ? (
            <option value={DRAFT_VALUE}>New plan (not saved yet)</option>
          ) : null}
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {p.id === activePlanId && isDirty ? ' *' : ''}
            </option>
          ))}
          <option value={NEW_PLAN_VALUE}>+ New plan…</option>
        </select>

        <button
          type="button"
          onClick={onSavePlan}
          className="rounded-md bg-yale-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-yale-900"
        >
          Save
        </button>

        {hasSavedPlan ? (
          <>
            <button
              type="button"
              onClick={onRenamePlan}
              className="text-xs font-medium text-yale-800 underline hover:text-yale-950"
            >
              Rename
            </button>
            <button
              type="button"
              onClick={onDeletePlan}
              className="text-xs font-medium text-red-800 underline hover:text-red-950"
            >
              Delete
            </button>
          </>
        ) : null}

        {sorted.length > 0 ? (
          <button
            type="button"
            onClick={onClearPlan}
            className="text-xs font-medium text-gray-600 underline hover:text-gray-900"
          >
            Clear courses
          </button>
        ) : null}
      </div>

      <PlanDisclaimer className="border-b border-yale-100 px-4 py-2" />

      {sorted.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-gray-500">
          No courses yet. Select courses from the catalog below — they will
          appear here and on the calendar when they have a weekly time.
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
                    {formatCourseHeading(course)}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {formatSchedule(course)} ·{' '}
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
          </p>
        </>
      )}
    </details>
  )
}
