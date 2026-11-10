import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { PLAN_BUTTON_EDITING, SAVE_BUTTON } from '../lib/sectionTheme'
import { downloadPlanExport, parsePlanImport } from '../lib/planTransfer'
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
  onImportPlans,
  // 'right' when the button sits at the right edge (Weekly calendar bar), so the panel opens leftward.
  align = 'left',
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const panelRef = useRef(null)
  // Where the panel floats. It renders on the page itself (not inside the calendar box,
  // which cuts off anything that spills out), pinned under the button.
  const [panelPos, setPanelPos] = useState(null)
  const fileInputRef = useRef(null)
  // null | { choose: plans } (add or replace?) | { note, missing } | { error }
  const [importState, setImportState] = useState(null)

  const coursesById = useMemo(
    () => new Map(courses.map((course) => [course.courseId, course])),
    [courses],
  )

  useEffect(() => {
    if (!open) setImportState(null)
  }, [open])

  async function handleFileChosen(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    let imported
    try {
      imported = parsePlanImport(await file.text())
    } catch (err) {
      setImportState({ error: err.message })
      return
    }
    if (plans.length === 0) finishImport(imported, 'add')
    else setImportState({ choose: imported })
  }

  function finishImport(imported, mode) {
    const missing = onImportPlans(imported, mode)
    const count = imported.length
    setImportState({ note: `Imported ${count} ${count === 1 ? 'plan' : 'plans'}`, missing })
  }

  useEffect(() => {
    if (!open) return

    function handleKeyDown(event) {
      if (event.key === 'Escape') setOpen(false)
    }

    function handlePointerDown(event) {
      const inside =
        rootRef.current?.contains(event.target) || panelRef.current?.contains(event.target)
      if (!inside) setOpen(false)
    }

    window.addEventListener('keydown', handleKeyDown)
    document.addEventListener('pointerdown', handlePointerDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [open])

  useLayoutEffect(() => {
    if (!open) {
      setPanelPos(null)
      return
    }

    function place() {
      const rect = rootRef.current?.getBoundingClientRect()
      if (!rect) return
      const top = rect.bottom + 8
      setPanelPos({
        top,
        maxHeight: Math.max(160, window.innerHeight - top - 16),
        ...(align === 'right'
          ? { right: Math.max(16, window.innerWidth - rect.right) }
          : { left: Math.max(16, rect.left) }),
      })
    }

    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, align])

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
        {isDirty ? (
          <span className="shrink-0 text-sm font-medium text-amber-700">unsaved</span>
        ) : null}
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

      {open && panelPos ? createPortal(
        <div
          ref={panelRef}
          id={menuId}
          role="dialog"
          aria-label="Manage plans"
          style={panelPos}
          className="fixed z-50 w-[min(32rem,calc(100vw-2rem))] overflow-y-auto rounded-lg border border-yale-200 bg-white shadow-xl"
        >
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-yale-150 bg-white px-4 py-2.5">
            <p className="text-sm font-semibold text-yale-950">Manage Plans</p>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => downloadPlanExport(plans, coursesById)}
                disabled={plans.length === 0}
                className="rounded border border-yale-200 px-2 py-0.5 text-xs font-medium text-yale-800 hover:bg-yale-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Export
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded border border-yale-200 px-2 py-0.5 text-xs font-medium text-yale-800 hover:bg-yale-50"
              >
                Import
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileChosen}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded border border-yale-200 px-2 py-0.5 text-xs font-medium text-yale-800 hover:bg-yale-50"
              >
                Close
              </button>
            </div>
          </div>
          {importState?.choose ? (
            <div className="flex flex-wrap items-center gap-2 border-b border-yale-150 bg-yale-50 px-4 py-2.5">
              <p className="mr-auto text-sm font-medium text-yale-950">
                Import {importState.choose.length}{' '}
                {importState.choose.length === 1 ? 'plan' : 'plans'}
              </p>
              <button
                type="button"
                onClick={() => finishImport(importState.choose, 'add')}
                className="rounded-md bg-yale-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-yale-900"
              >
                Add to my plans
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Replace all your plans? This cannot be undone.')) {
                    finishImport(importState.choose, 'replace')
                  }
                }}
                className="rounded-md border border-red-900 bg-red-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-950"
              >
                Replace my plans
              </button>
              <button
                type="button"
                onClick={() => setImportState(null)}
                className="rounded-md border border-yale-300 bg-white px-3 py-1.5 text-xs font-medium text-yale-900 hover:bg-yale-50"
              >
                Cancel
              </button>
            </div>
          ) : null}
          {importState?.note || importState?.error ? (
            <div className="flex items-start gap-2 border-b border-yale-150 bg-yale-50 px-4 py-2.5 text-sm">
              <div className="min-w-0 flex-1">
                {importState.error ? (
                  <p className="text-red-800">{importState.error}</p>
                ) : (
                  <p className="text-yale-950">{importState.note}</p>
                )}
                {importState.missing?.length ? (
                  <p className="mt-1 text-amber-800">
                    Left out, no longer in the catalog: {importState.missing.join(', ')}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setImportState(null)}
                aria-label="Dismiss"
                className="shrink-0 rounded px-1 text-yale-700 hover:bg-yale-100"
              >
                ×
              </button>
            </div>
          ) : null}
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
        </div>,
        document.body,
      ) : null}
    </div>
  )
}
