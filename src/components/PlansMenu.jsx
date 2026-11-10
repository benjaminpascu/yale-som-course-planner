import { useEffect, useRef, useState } from 'react'
import { PLAN_BUTTON_EDITING, SAVE_BUTTON } from '../lib/sectionTheme'
import SavedPlansPanel from './SavedPlansPanel'

export default function PlansMenu({
  plans,
  courses,
  activePlanId,
  activePlanName,
  hasSelection,
  isDirty,
  onAddPlan,
  onSelectPlan,
  onRenamePlan,
  onDuplicatePlan,
  onSavePlan,
  onDeletePlan,
  // 'right' when the button sits at the right edge (Weekly calendar bar), so the panel opens leftward.
  align = 'left',
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return

    function handleKeyDown(event) {
      if (event.key === 'Escape') setOpen(false)
    }

    function handlePointerDown(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    document.addEventListener('pointerdown', handlePointerDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [open])

  function handleSelectPlan(planId) {
    const ok = onSelectPlan(planId)
    if (ok && planId !== activePlanId) {
      setOpen(false)
    }
    return ok
  }

  const label = activePlanName ?? 'No plan selected'
  const menuId = 'plans-menu-panel'

  return (
    <div ref={rootRef} className="relative flex shrink-0">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-controls={open ? menuId : undefined}
          // Same look as the plan you're editing in Compare plans.
          className={`flex h-9 min-w-0 items-center gap-1.5 rounded-md border px-3 text-sm ${PLAN_BUTTON_EDITING}`}
        >
          <span className="font-semibold">Plan:</span>
          <span className="max-w-[12rem] truncate">{label}</span>
          <span aria-hidden>▾</span>
        </button>
        {isDirty ? (
          <span className="shrink-0 text-sm font-medium text-amber-700">unsaved</span>
        ) : null}
        {activePlanId && isDirty ? (
          <button
            type="button"
            onClick={() => onSavePlan(activePlanId)}
            className={`h-9 rounded-md px-3 text-sm font-medium ${SAVE_BUTTON}`}
          >
            Save Plan
          </button>
        ) : null}
      </div>

      {open ? (
        <div
          id={menuId}
          role="dialog"
          aria-label="Manage plans"
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full z-50 mt-2 max-h-[min(32rem,calc(100dvh-8rem))] w-[min(32rem,calc(100vw-2rem))] overflow-y-auto rounded-lg border border-yale-200 bg-white shadow-xl`}
        >
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-yale-150 bg-white px-4 py-2.5">
            <p className="text-sm font-semibold text-yale-950">Manage Plans</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded border border-yale-200 px-2 py-0.5 text-xs font-medium text-yale-800 hover:bg-yale-50"
            >
              Close
            </button>
          </div>
          <SavedPlansPanel
            variant="flat"
            plans={plans}
            courses={courses}
            activePlanId={activePlanId}
            hasSelection={hasSelection}
            isDirty={isDirty}
            onAddPlan={onAddPlan}
            onSelectPlan={handleSelectPlan}
            onRenamePlan={onRenamePlan}
            onDuplicatePlan={onDuplicatePlan}
            onSavePlan={onSavePlan}
            onDeletePlan={onDeletePlan}
          />
        </div>
      ) : null}
    </div>
  )
}
