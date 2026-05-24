import { useEffect, useRef, useState } from 'react'
import { SAVE_BUTTON } from '../lib/sectionTheme'
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
  onSavePlan,
  onDeletePlan,
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
    <div ref={rootRef} className="relative shrink-0">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {activePlanId && isDirty ? (
          <button
            type="button"
            onClick={() => onSavePlan(activePlanId)}
            className={`rounded-md px-3 py-2 text-sm font-medium ${SAVE_BUTTON}`}
          >
            Save plan
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-controls={open ? menuId : undefined}
          className="flex max-w-[min(100%,22rem)] flex-col items-end rounded-md border border-yale-600 bg-yale-800 px-3 py-2 text-left hover:bg-yale-700 sm:max-w-md"
        >
          <span className="flex w-full items-center justify-end gap-1.5 text-sm font-semibold">
            Plans
            <span aria-hidden className="text-yale-200">
              ▾
            </span>
          </span>
          <span className="mt-0.5 flex w-full items-center justify-end gap-1.5 truncate text-xs text-yale-100">
            <span className="truncate">{label}</span>
            {isDirty ? (
              <span
                className="shrink-0 font-medium text-amber-300"
                title="Unsaved changes"
              >
                · unsaved
              </span>
            ) : null}
          </span>
        </button>
      </div>

      {open ? (
        <div
          id={menuId}
          role="dialog"
          aria-label="Manage plans"
          className="absolute right-0 z-50 mt-2 max-h-[min(32rem,calc(100dvh-8rem))] w-[min(32rem,calc(100vw-2rem))] overflow-y-auto rounded-lg border border-yale-200 bg-white shadow-xl"
        >
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-yale-150 bg-white px-4 py-2.5">
            <p className="text-sm font-semibold text-yale-950">Manage plans</p>
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
            onSavePlan={onSavePlan}
            onDeletePlan={onDeletePlan}
          />
        </div>
      ) : null}
    </div>
  )
}
