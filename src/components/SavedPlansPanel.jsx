import { useEffect, useMemo, useRef, useState } from 'react'
import { formatCourseUnits } from '../lib/courseDisplay'
import { IN_PLAN_SURFACE, SAVE_BUTTON, sectionTone } from '../lib/sectionTheme'
import CollapseChevron from './CollapseChevron'
import { PlanDisclaimer } from './Disclaimer'

function PlanExpandButton({ open, onClick, planName }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      aria-expanded={open}
      aria-label={
        open ? `Hide options for ${planName}` : `Show options for ${planName}`
      }
      className="mr-1 flex h-7 w-7 shrink-0 self-center items-center justify-center rounded text-yale-800"
    >
      <span
        aria-hidden
        className={`inline-flex items-center justify-center text-sm font-semibold leading-none transition-transform duration-200 ${
          open ? '-rotate-90' : ''
        }`}
      >
        ›
      </span>
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

  return (
    <details className={`group border-b ${tone.section}`}>
      <summary
        className={`flex cursor-pointer list-none items-center gap-2 border-b px-4 py-3 text-sm font-semibold text-yale-950 marker:content-none [&::-webkit-details-marker]:hidden ${tone.header}`}
      >
        <CollapseChevron />
        <span className="flex-1">Saved plans</span>
        {plans.length > 0 ? (
          <span className="font-normal text-yale-800">
            {plans.length} saved
          </span>
        ) : null}
      </summary>

      <PlanDisclaimer className="border-b border-yale-100 px-4 py-2" />

      <div className="flex flex-col gap-4 px-4 py-4">
        <form
          onSubmit={handleAddSubmit}
          className="flex w-full items-center gap-2"
        >
          <input
            ref={newNameInputRef}
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Plan name"
            className="min-w-0 flex-1 rounded-md border border-yale-200 bg-white px-3 py-1.5 text-sm text-gray-900 shadow-sm focus:border-yale-500 focus:outline-none focus:ring-1 focus:ring-yale-500"
            aria-label="New plan name"
          />
          <button
            type="submit"
            disabled={!newName.trim()}
            className="shrink-0 rounded-md bg-yale-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-yale-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {savesCurrentSelection ? 'Save to plan' : 'Add'}
          </button>
        </form>

        <div className="min-w-0 border-l-2 border-yale-200 pl-5 sm:pl-6">
          {plans.length === 0 ? (
            <p className="text-sm text-yale-700">
              {hasSelection
                ? 'Name your plan and click Save to plan to keep your current course selection.'
                : 'Add courses from the catalog below, then name a plan and click Save to plan — or click Add to start with an empty plan.'}
            </p>
          ) : (
            <ul className="space-y-2">
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
                        ? `rounded-md ${IN_PLAN_SURFACE}`
                        : 'rounded-md border border-yale-150 bg-white'
                    }
                  >
                    <div
                      className={`flex items-center gap-0.5 rounded-md transition-colors ${
                        isActive
                          ? 'hover:bg-yale-selected-hover'
                          : 'hover:bg-black/[0.03]'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handlePlanRowClick(plan.id)}
                        aria-expanded={menuOpen}
                        aria-current={isActive ? 'true' : undefined}
                        className="flex min-w-0 flex-1 flex-nowrap items-center gap-2 py-2 pl-3 pr-2 text-left"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-900">
                            {plan.name}
                            {showUnsaved ? (
                              <span className="ml-1 font-normal text-red-700">
                                (unsaved)
                              </span>
                            ) : null}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatPlanSummary(savedCount, savedUnits)}
                          </p>
                        </div>
                        {isActive ? (
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
                      <PlanExpandButton
                        open={menuOpen}
                        onClick={() => toggleMenu(plan.id)}
                        planName={plan.name}
                      />
                    </div>

                    {menuOpen ? (
                      <div className="border-t border-yale-100 bg-yale-50/80 py-3 pl-4 pr-3 sm:pl-5">
                        <form
                          onSubmit={handleRenameSubmit}
                          className="mb-3 flex flex-wrap items-end gap-2"
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
    </details>
  )
}
