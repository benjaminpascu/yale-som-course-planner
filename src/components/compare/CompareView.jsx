import { useCallback } from 'react'
import {
  addCriterion,
  countRatingsForCriterion,
  decide,
  fixWeights,
  removeCriterion,
  setCriterionWeight,
  setNote,
  setProfessorRating,
  setRating,
  undoLastDecision,
} from '../../lib/compareStorage'
import { PROFESSOR_CRITERION_ID, professorKey } from '../../lib/compareScoring'
import ScoreStep from './ScoreStep'
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
  const { store, update, saveFailed, recovered, dismissRecovered } = compare

  const handleDecide = useCallback(
    (key, decision) => update((s) => decide(s, termCode, key, decision)),
    [update, termCode],
  )
  const handleUndo = useCallback(
    () => update((s) => undoLastDecision(s, termCode)),
    [update, termCode],
  )

  function handleAddCriterion(name) {
    let error
    update((s) => {
      const result = addCriterion(s, termCode, name)
      error = result.error
      return result.store
    })
    return error
  }

  function handleRate(group, criterionId, value) {
    if (criterionId === PROFESSOR_CRITERION_ID) {
      const key = professorKey(group)
      if (key != null) update((s) => setProfessorRating(s, key, value))
      return
    }
    update((s) => setRating(s, termCode, group.key, criterionId, value))
  }

  function handleRemoveCriterion(criterion) {
    // Professor ratings are shared and kept, so removing that column loses nothing.
    const n =
      criterion.id === PROFESSOR_CRITERION_ID
        ? 0
        : countRatingsForCriterion(store, termCode, criterion.id)
    const ratings = n === 1 ? '1 rating' : `${n} ratings`
    if (n > 0 && !window.confirm(`Remove '${criterion.name}'? This deletes ${ratings}.`)) return
    update((s) => removeCriterion(s, termCode, criterion.id))
  }

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
        <ScoreStep
          groups={groups}
          term={term}
          professors={store.professors}
          termLabel={termLabel}
          onRate={handleRate}
          onNote={(key, text) => update((s) => setNote(s, termCode, key, text))}
          onDecide={handleDecide}
          onAddCriterion={handleAddCriterion}
          onRemoveCriterion={handleRemoveCriterion}
          onWeight={(id, weight) => update((s) => setCriterionWeight(s, termCode, id, weight))}
          onFixWeights={() => update((s) => fixWeights(s, termCode))}
          onGoToShortlist={() => onStepChange('shortlist')}
        />
      )}
    </>
  )
}
