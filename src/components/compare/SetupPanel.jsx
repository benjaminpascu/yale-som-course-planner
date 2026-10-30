import { useEffect, useMemo, useState } from 'react'
import { uniqueProfessors } from '../../lib/compareGroups'
import { weightShares } from '../../lib/compareScoring'
import {
  addCriterion,
  countScoresForCriterion,
  deleteCriterion,
  renameCriterion,
  setCriterionWeight,
  setProfessorNote,
  setProfessorRating,
} from '../../lib/compareStorage'
import ScoreInput from './ScoreInput'

const NAME_ERRORS = {
  empty: 'Enter a name.',
  duplicate: 'That name already exists.',
}

const SMALL_BUTTON =
  'rounded border border-yale-300 bg-white px-2.5 py-1 text-xs font-medium text-yale-900 hover:bg-yale-50'

function CriterionRow({ criterion, share, store, update }) {
  const [name, setName] = useState(criterion.name)
  const [error, setError] = useState(null)
  const isProfessor = criterion.kind === 'professor'

  useEffect(() => setName(criterion.name), [criterion.name])

  function commitName() {
    if (name === criterion.name) return
    let result
    update((s) => {
      result = renameCriterion(s, criterion.id, name)
      return result.store
    })
    if (result?.error) setError(NAME_ERRORS[result.error])
    else setError(null)
  }

  function handleDelete() {
    const n = countScoresForCriterion(store, criterion.id)
    const what = n === 0 ? 'This removes no scores.' : `This removes ${n} score${n === 1 ? '' : 's'}.`
    if (window.confirm(`Delete '${criterion.name}'? ${what}`)) {
      update((s) => deleteCriterion(s, criterion.id))
    }
  }

  return (
    <li className="py-2.5">
      <div className="flex items-center gap-3">
        {isProfessor ? (
          <span className="w-36 shrink-0 px-2 text-sm font-medium text-gray-900">
            {criterion.name}
          </span>
        ) : (
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            aria-label={`Name of ${criterion.name}`}
            aria-invalid={error ? true : undefined}
            className="w-36 shrink-0 rounded border border-gray-200 px-2 py-1 text-sm focus:border-yale-800 focus:outline-none"
          />
        )}
        <input
          type="range"
          min={0}
          max={10}
          step={1}
          value={criterion.weight}
          onChange={(e) =>
            update((s) => setCriterionWeight(s, criterion.id, Number(e.target.value)))
          }
          aria-label={`Weight of ${criterion.name}`}
          className="min-w-0 flex-1 accent-yale-800"
        />
        <span className="w-10 shrink-0 text-right text-sm font-semibold tabular-nums text-gray-900">
          {share}%
        </span>
        {isProfessor ? (
          <span className="w-6 shrink-0" />
        ) : (
          <button
            type="button"
            onClick={handleDelete}
            aria-label={`Delete ${criterion.name}`}
            className="w-6 shrink-0 rounded text-base leading-none text-gray-400 hover:text-red-700"
          >
            ×
          </button>
        )}
      </div>
      {error ? <p className="mt-1 pl-2 text-xs text-red-700">{error}</p> : null}
    </li>
  )
}

function CriteriaTab({ store, update }) {
  const [newName, setNewName] = useState('')
  const [error, setError] = useState(null)
  const shares = weightShares(store.criteria)

  function handleAdd(event) {
    event.preventDefault()
    let result
    update((s) => {
      result = addCriterion(s, newName)
      return result.store
    })
    if (result?.error) {
      setError(NAME_ERRORS[result.error])
    } else {
      setError(null)
      setNewName('')
    }
  }

  return (
    <div className="px-4 py-2">
      <ul className="divide-y divide-gray-100">
        {store.criteria.map((c) => (
          <CriterionRow
            key={c.id}
            criterion={c}
            share={shares[c.id]}
            store={store}
            update={update}
          />
        ))}
      </ul>
      <form onSubmit={handleAdd} className="mt-3 flex items-center gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New criterion"
          aria-label="New criterion name"
          className="w-48 rounded border border-gray-200 px-2 py-1 text-sm focus:border-yale-800 focus:outline-none"
        />
        <button type="submit" className={SMALL_BUTTON}>
          Add
        </button>
      </form>
      {error ? <p className="mt-1 text-xs text-red-700">{error}</p> : null}
    </div>
  )
}

function ProfessorRow({ name, entry, update }) {
  return (
    <li className="flex items-center gap-3 py-1.5">
      <ScoreInput
        value={entry?.rating ?? null}
        onCommit={(v) => update((s) => setProfessorRating(s, name, v))}
        ariaLabel={`Rating for ${name}`}
      />
      <span className="w-44 shrink-0 truncate text-sm text-gray-900">{name}</span>
      <input
        type="text"
        defaultValue={entry?.note ?? ''}
        onChange={(e) => update((s) => setProfessorNote(s, name, e.target.value))}
        placeholder="Note"
        aria-label={`Note for ${name}`}
        className="min-w-0 flex-1 rounded border border-gray-200 px-2 py-1 text-xs focus:border-yale-800 focus:outline-none"
      />
    </li>
  )
}

function ProfessorsTab({ store, update, allCourses, comparedProfessors }) {
  const [search, setSearch] = useState('')
  const all = useMemo(() => uniqueProfessors(allCourses), [allCourses])
  const compared = useMemo(() => [...comparedProfessors].sort((a, b) => a.localeCompare(b)), [
    comparedProfessors,
  ])
  const comparedSet = useMemo(() => new Set(compared), [compared])
  const query = search.trim().toLowerCase()
  const matches = (name) => !query || name.toLowerCase().includes(query)
  const first = compared.filter(matches)
  const rest = all.filter((name) => !comparedSet.has(name) && matches(name))

  return (
    <div className="px-4 py-3">
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search professors"
        aria-label="Search professors"
        className="w-full rounded-md border border-yale-200 bg-yale-50/80 px-2.5 py-1.5 text-xs focus:border-yale-800 focus:bg-white focus:outline-none"
      />
      <ul className="mt-2">
        {first.map((name) => (
          <ProfessorRow key={name} name={name} entry={store.professors[name]} update={update} />
        ))}
      </ul>
      {first.length > 0 && rest.length > 0 ? <hr className="my-2 border-gray-200" /> : null}
      <ul>
        {rest.map((name) => (
          <ProfessorRow key={name} name={name} entry={store.professors[name]} update={update} />
        ))}
      </ul>
    </div>
  )
}

const TABS = [
  { id: 'criteria', label: 'Criteria' },
  { id: 'professors', label: 'Professors' },
]

/** Right-side drawer: criteria + weights, and professor ratings. */
export default function SetupPanel({
  open,
  onClose,
  store,
  update,
  allCourses,
  comparedProfessors,
}) {
  const [tab, setTab] = useState('criteria')

  useEffect(() => {
    if (!open) return
    function handleKey(event) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-black/35" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Set up"
        onClick={(event) => event.stopPropagation()}
        className="flex h-full w-[min(36rem,100vw)] flex-col bg-white shadow-2xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-gray-100 px-4 py-2.5">
          <div className="flex gap-4" role="tablist">
            {TABS.map((t) => {
              const active = t.id === tab
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(t.id)}
                  className={`border-b-2 pb-0.5 text-sm font-semibold ${
                    active
                      ? 'border-yale-800 text-yale-950'
                      : 'border-transparent text-yale-700 hover:text-yale-950'
                  }`}
                >
                  {t.label}
                </button>
              )
            })}
          </div>
          <button type="button" onClick={onClose} className={SMALL_BUTTON}>
            Close
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {tab === 'criteria' ? (
            <CriteriaTab store={store} update={update} />
          ) : (
            <ProfessorsTab
              store={store}
              update={update}
              allCourses={allCourses}
              comparedProfessors={comparedProfessors}
            />
          )}
        </div>
      </div>
    </div>
  )
}
