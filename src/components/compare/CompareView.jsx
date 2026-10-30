import { useCallback } from 'react'
import { decide, undoLastDecision } from '../../lib/compareStorage'
import ShortlistStep from './ShortlistStep'

function RecoveredNotice({ onDismiss }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900 sm:px-8">
      <span>
        Your saved comparison couldn&apos;t be read. A backup was kept in this browser.
      </span>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 rounded border border-amber-300 bg-white px-2 py-0.5 font-medium hover:bg-amber-100"
      >
        Dismiss
      </button>
    </div>
  )
}

/** Compare mode body: step 1 Shortlist or step 2 Score and rank (from the sub bar). */
export default function CompareView({
  compare,
  groups,
  term,
  counts,
  termCode,
  termLabel,
  step,
  onStepChange,
}) {
  const { update, saveFailed, recovered, dismissRecovered } = compare

  const handleDecide = useCallback(
    (key, decision) => update((s) => decide(s, termCode, key, decision)),
    [update, termCode],
  )
  const handleUndo = useCallback(
    () => update((s) => undoLastDecision(s, termCode)),
    [update, termCode],
  )

  return (
    <>
      {recovered ? <RecoveredNotice onDismiss={dismissRecovered} /> : null}
      {saveFailed ? (
        <p className="px-4 py-2 text-xs font-medium text-red-700 sm:px-8">
          Couldn&apos;t save — this browser is blocking storage.
        </p>
      ) : null}
      {step === 'shortlist' ? (
        <ShortlistStep
          groups={groups}
          term={term}
          counts={counts}
          termLabel={termLabel}
          onDecide={handleDecide}
          onUndo={handleUndo}
          onGoToScore={() => onStepChange('score')}
        />
      ) : (
        <p className="mx-auto w-full max-w-[800px] px-4 py-12 text-center text-sm text-[#5b6576]">
          Score and rank arrives in Step 3.
        </p>
      )}
    </>
  )
}
