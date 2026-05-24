import { useEffect, useMemo, useRef, useState } from 'react'
import { formatCourseUnits } from '../lib/courseDisplay'
import { IN_PLAN_SURFACE, SAVE_BUTTON, sectionTone } from '../lib/sectionTheme'
import CollapseChevron from './CollapseChevron'
import { PlanDisclaimer } from './Disclaimer'

function PlanOptionsButton({ open, onClick, planName, compact = false }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      aria-expanded={open}
      aria-label={
        open
          ? `Close options for ${planName}`
          : `Rename or delete ${planName}`
      }
      className={`flex shrink-0 items-center justify-center rounded-md text-yale-800 hover:bg-yale-100 ${
        compact
          ? 'mr-0.5 h-10 w-10 text-lg leading-none'
          : 'mr-1 h-7 w-7 text-sm font-semibold'
      }`}
    >
      <span aria-hidden>{compact ? '⋯' : '›'}</span>
    </button>
  )
}

function formatCourseCount(count) {
  if (count === 0) return 'no courses'
  if (count === 1) return '1 course'
  return `${count} courses`
}

function formatPlanSummary(courseCount, unitCount) {
  const courses = formatCourseCount(courseCount)
  if (courseCount === 0) return courses
  return `${courses} (${formatCourseUnits(unitCount)})`
}

export default function SavedPlansPanel({
  variant = 'flat',
  compact = false,
  plans,
  courses,
  activePlanId,
  hasSelection,
  isDirty,
  onAddPlan,
  onSelectPlan,
  onRenamePlan,
  onSavePlan,
  onDeletePlan,
}) {
  const tone = sectionTone('plan')
  const [newName, setNewName] = useState('')
  const [openMenuPlanId, setOpenMenuPlanId] = useState(null)
  const [renameDraft, setRenameDraft] = useState('')
  const newNameInputRef = useRef(null)

  const savesCurrentSelection =
    hasSelection && (!activePlanId || isDirty)

  const coursesById = useMemo(
    () => new Map(courses.map((course) => [course.courseId, course])),
    [courses],
  )

  const openPlan = useMemo(
    () => plans.find((p) => p.id === openMenuPlanId) ?? null,
    [plans, openMenuPlanId],
  )

  useEffect(() => {
    if (openPlan) {
      setRenameDraft(openPlan.name)
    }
  }, [openPlan])

  function handleAddSubmit(e) {
    e.preventDefault()
    const trimmed = newName.trim()
    if (!trimmed) return
    onAddPlan(trimmed)
    setNewName('')
    newNameInputRef.current?.focus()
  }

  function toggleMenu(planId) {
    setOpenMenuPlanId((prev) => (prev === planId ? null : planId))
  }

  function handlePlanSelect(planId) {
    if (planId === activePlanId) return
    if (!onSelectPlan(planId)) return
    setOpenMenuPlanId(null)
  }

  function handlePlanRowClick(planId) {
    if (planId !== activePlanId) {
      if (!onSelectPlan(planId)) return
    }
    toggleMenu(planId)
  }

  function handleRenameSubmit(e) {
    e.preventDefault()
    if (!openPlan) return
    onRenamePlan(openPlan.id, renameDraft)
  }

  const sectionPad = compact ? 'px-3 py-1.5' : 'px-4 py-2'
  const contentPad = compact ? 'px-3 py-2' : 'px-4 py-4'
  const contentGap = compact ? 'gap-2' : 'gap-4'
  const listIndent = compact ? 'pl-3' : 'pl-5 sm:pl-6'
  const planListGap = compact ? 'space-y-1' : 'space-y-2'

  const body = (
    <>
      {compact ? (
        <div className={`border-b border-yale-100 ${sectionPad}`}>
          <h2 className="text-xs font-semibold text-yale-950">Saved plans</h2>
          <p className="mt-0.5 text-[10px] leading-snug text-yale-700">
            Tap a plan to show it on the calendar. Use ⋯ to rename or delete.
          </p>
        </div>
      ) : null}

      <PlanDisclaimer
        className={`border-b border-yale-100 ${sectionPad} ${
          compact ? 'text-[10px] leading-snug' : ''
        }`}
      >
        {compact ? 'Plans stay in this browser only.' : undefined}
      </PlanDisclaimer>

      <div className={`flex flex-col ${contentGap} ${contentPad}`}>
        <form
          onSubmit={handleAddSubmit}
          className={`flex w-full gap-2 ${compact ? 'items-stretch' : 'items-center'}`}
        >
          <input
            ref={newNameInputRef}
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Plan name"
            className={`min-w-0 flex-1 rounded-md border border-yale-200 bg-white text-gray-900 shadow-sm focus:border-yale-500 focus:outline-none focus:ring-1 focus:ring-yale-500 ${
              compact
                ? 'min-h-10 px-2.5 py-2 text-sm'
                : 'px-3 py-1.5 text-sm'
            }`}
            aria-label="New plan name"
          />
          <button
            type="submit"
            disabled={!newName.trim()}
            className={`shrink-0 rounded-md bg-yale-800 font-medium text-white hover:bg-yale-900 disabled:cursor-not-allowed disabled:opacity-50 ${
              compact
                ? 'flex min-h-10 min-w-[4.5rem] items-center justify-center px-3 text-xs'
                : 'px-3 py-1.5 text-sm'
            }`}
          >
            {savesCurrentSelection ? (compact ? 'Save' : 'Save to plan') : 'Add'}
          </button>
        </form>

        <div className={`min-w-0 ${compact ? '' : `border-l-2 border-yale-200 ${listIndent}`}`}>
          {plans.length === 0 ? (
            <p className={compact ? 'text-xs text-yale-700' : 'text-sm text-yale-700'}>
              {hasSelection
                ? compact
                  ? 'Name your plan and tap Save to keep your current courses.'
                  : 'Name your plan and click Save to plan to keep your current course selection.'
                : compact
                  ? 'Add courses from the Courses tab, then save them to a new plan — or tap Add for an empty plan.'
                  : 'Add courses from the catalog, then name a plan and click Save to plan — or click Add to start with an empty plan.'}
            </p>
          ) : (
            <ul className={planListGap}>
              {plans.map((plan) => {
                const isActive = plan.id === activePlanId
                const menuOpen = openMenuPlanId === plan.id
                const showUnsaved = isActive && isDirty
                const savedCount = plan.courseIds.length
                const savedUnits = plan.courseIds.reduce(
                  (sum, courseId) =>
                    sum + (coursesById.get(courseId)?.units ?? 0),
                  0,
                )

                return (
                  <li
                    key={plan.id}
                    className={
                      isActive
                        ? `rounded-md ${IN_PLAN_SURFACE} ${
                            compact ? 'ring-1 ring-save-800/25' : ''
                          }`
                        : 'rounded-md border border-yale-150 bg-white'
                    }
                  >
                    <div
                      className={`flex items-center gap-0.5 rounded-md transition-colors ${
                        isActive
                          ? 'hover:bg-save-100'
                          : 'hover:bg-black/[0.03]'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          compact
                            ? handlePlanSelect(plan.id)
                            : handlePlanRowClick(plan.id)
                        }
                        aria-current={isActive ? 'true' : undefined}
                        className={`flex min-w-0 flex-1 items-center gap-2 text-left ${
                          compact ? 'py-2 pl-2 pr-1' : 'flex-wrap gap-x-2 gap-y-0.5 py-2 pl-3 pr-2'
                        }`}
                      >
                        {compact ? (
                          <span
                            aria-hidden
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                              isActive
                                ? 'border-yale-700 bg-yale-700'
                                : 'border-yale-300 bg-white'
                            }`}
                          >
                            {isActive ? (
                              <span className="h-1.5 w-1.5 rounded-full bg-white" />
                            ) : null}
                          </span>
                        ) : null}
                        <div className="min-w-0 flex-1">
                          <p
                            className={`font-medium text-gray-900 break-words ${
                              compact ? 'text-xs leading-snug' : 'text-sm'
                            }`}
                          >
                            {plan.name}
                          </p>
                          <p
                            className={
                              compact ? 'text-[10px] text-gray-500' : 'text-xs text-gray-500'
                            }
                          >
                            {compact && isActive ? (
                              <span className="font-medium text-yale-800">
                                Active ·{' '}
                              </span>
                            ) : null}
                            {formatPlanSummary(savedCount, savedUnits)}
                            {showUnsaved ? (
                              <span className="text-red-700"> · unsaved</span>
                            ) : null}
                          </p>
                        </div>
                        {!compact && isActive ? (
                          <span className="shrink-0 rounded bg-yale-600 px-1.5 py-0.5 text-xs font-medium text-white">
                            Shown in calendar
                          </span>
                        ) : null}
                      </button>
                      {showUnsaved ? (
                        <button
                          type="button"
                          onClick={() => onSavePlan(plan.id)}
                          className={`shrink-0 self-center rounded-md px-2.5 py-1 text-xs font-medium ${SAVE_BUTTON}`}
                        >
                          Save
                        </button>
                      ) : null}
                      <PlanOptionsButton
                        open={menuOpen}
                        onClick={() => toggleMenu(plan.id)}
                        planName={plan.name}
                        compact={compact}
                      />
                    </div>

                    {menuOpen ? (
                      <div
                        className={`border-t border-yale-100 bg-yale-50/80 pr-3 ${
                          compact ? 'py-2 pl-3' : 'py-3 pl-4 sm:pl-5'
                        }`}
                      >
                        {compact ? (
                          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-yale-800">
                            Plan options
                          </p>
                        ) : null}
                        <form
                          onSubmit={handleRenameSubmit}
                          className={`flex flex-wrap items-end gap-2 ${
                            compact ? 'mb-2' : 'mb-3'
                          }`}
                        >
                          <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-xs font-medium text-yale-900">
                            Rename
                            <input
                              type="text"
                              value={renameDraft}
                              onChange={(e) => setRenameDraft(e.target.value)}
                              className="rounded-md border border-yale-200 bg-white px-2.5 py-1.5 text-sm text-gray-900 focus:border-yale-500 focus:outline-none focus:ring-1 focus:ring-yale-500"
                            />
                          </label>
                          <button
                            type="submit"
                            disabled={
                              !renameDraft.trim() ||
                              renameDraft.trim() === plan.name
                            }
                            className="rounded-md border border-yale-300 bg-white px-3 py-1.5 text-xs font-medium text-yale-900 hover:bg-yale-50 disabled:opacity-50"
                          >
                            Apply name
                          </button>
                        </form>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Delete "${plan.name}"? This cannot be undone.`,
                                )
                              ) {
                                onDeletePlan(plan.id)
                                setOpenMenuPlanId(null)
                              }
                            }}
                            className="rounded-md px-3 py-1.5 text-xs font-medium text-red-800 underline hover:text-red-950"
                          >
                            Delete plan
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  )

  if (variant === 'collapsible') {
    return (
      <details className={`group border-b ${tone.section}`}>
        <summary
          className={`flex cursor-pointer list-none items-center gap-2 border-b px-4 py-3 text-sm font-semibold text-yale-950 marker:content-none [&::-webkit-details-marker]:hidden ${tone.header}`}
        >
          <CollapseChevron />
          <span className="flex-1">Saved plans</span>
        </summary>
        {body}
      </details>
    )
  }

  return <div className={tone.section}>{body}</div>
}
