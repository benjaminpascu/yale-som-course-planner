import { useEffect, useRef, useState } from 'react'
import { downloadCompareWorkbook } from '../../lib/compareExport'
import { rankCourses, ratingTone, weightedScore, weightsNeedFix } from '../../lib/compareScoring'
import { formatSessionLabel } from '../../lib/sessionDisplay'
import RatingInput from './RatingInput'
import WeightInput from './WeightInput'

const NAME_ERRORS = { empty: 'Enter a name.', duplicate: 'That name already exists.' }

function AddCriterionRow({ onAdd, onClose }) {
  const [name, setName] = useState('')
  const [error, setError] = useState(null)

  function submit(event) {
    event.preventDefault()
    const result = onAdd(name)
    if (result) setError(NAME_ERRORS[result])
    else onClose()
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-wrap items-center gap-2 border-b border-[#e6eaf0] bg-[#f5f7fa] px-5 py-3"
    >
      <label htmlFor="new-criterion" className="text-xs font-semibold text-[#5b6576]">
        New criterion
      </label>
      <input
        id="new-criterion"
        autoFocus
        value={name}
        onChange={(e) => {
          setName(e.target.value)
          setError(null)
        }}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
        placeholder="Workload, career fit, friends taking it"
        className="h-9 max-w-[360px] flex-[1_1_240px] rounded-md border border-[#c5ced9] bg-white px-2.5 text-sm"
      />
      <button type="submit" className="h-9 rounded-md bg-yale-800 px-3.5 text-sm font-semibold text-white hover:bg-yale-900">
        Add
      </button>
      <button type="button" onClick={onClose} className="h-9 px-2 text-sm text-[#5b6576]">
        Cancel
      </button>
      {error ? <p className="w-full text-xs text-red-700">{error}</p> : null}
    </form>
  )
}

function CriteriaHeader({ criteria, needsFix, onRemove, onWeight, onFixWeights }) {
  const total = criteria.reduce((sum, c) => sum + c.weight, 0)
  return (
    <div className="py-3.5 pr-3 pl-5">
      <div className="flex items-end gap-2">
        <span className="hidden min-w-[14rem] flex-1 pb-2 text-right text-xs font-semibold text-[#5b6576] sm:block">
          Weights
        </span>
        {criteria.map((c, i) => (
          <div
            key={c.id}
            className={`flex w-[72px] flex-col items-center gap-1 sm:w-24 ${i === 0 ? 'max-sm:ml-auto' : ''}`}
          >
            <span className="flex max-w-24 items-center gap-0.5">
              <span className="truncate text-xs font-semibold text-[#5b6576]">{c.name}</span>
              {criteria.length > 1 ? (
                <button
                  type="button"
                  onClick={() => onRemove(c)}
                  aria-label={`Remove ${c.name}`}
                  className="flex h-6 w-6 flex-none items-center justify-center"
                >
                  <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="#8a95a5" strokeWidth="3" strokeLinecap="round" className="h-2.5 w-2.5">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              ) : null}
            </span>
            <WeightInput
              weight={c.weight}
              onCommit={(w) => onWeight(c.id, w)}
              ariaLabel={`Weight for ${c.name}`}
            />
          </div>
        ))}
        <span className="w-16 pb-2 text-right text-xs font-semibold whitespace-nowrap text-[#5b6576] sm:w-28">
          <span className="sm:hidden">Score</span>
          <span className="hidden sm:inline">Weighted score</span>
        </span>
        <span className="w-9" />
      </div>
      {needsFix ? (
        <p className="mt-2 flex flex-wrap justify-end gap-x-2 text-xs text-[#9a4a00]">
          <span>Weights add up to {total.toFixed(2)}, not 1.00.</span>
          <button type="button" onClick={onFixWeights} className="font-semibold underline underline-offset-2">
            Rescale to 1.00
          </button>
        </p>
      ) : null}
    </div>
  )
}

function ScoreRow({ group, term, rowIndex, open, onToggle, onRate, onNote, onDecide, rowRef }) {
  const { criteria, ratings, notes, decisions } = term
  const course = ratings[group.key] ?? {}
  const score = weightedScore(course, criteria)
  const note = notes[group.key] ?? ''
  const first = group.sections[0]
  const isYes = decisions[group.key] === 'yes'
  const sub = [formatSessionLabel(group.sessions[0]), group.professors.join(' / ')]
    .filter(Boolean)
    .join(' · ')

  return (
    <div ref={rowRef} className={`border-t border-[#e6eaf0] ${open ? 'bg-[#f8fafc]' : 'bg-white'}`}>
      {/* The whole summary line toggles the row; its own boxes, buttons and links keep their behavior. */}
      <div
        onClick={(event) => {
          if (event.target.closest('input, button, a')) return
          onToggle()
        }}
        className="flex cursor-pointer flex-wrap items-center gap-2 py-3 pr-3 pl-5 hover:bg-[#f8fafc] sm:flex-nowrap"
      >
        <div className="flex basis-full flex-col gap-0.5 sm:min-w-[14rem] sm:flex-1 sm:basis-auto">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            className="text-left text-sm leading-snug font-bold text-[#1a1f2b] hover:text-yale-800"
          >
            {group.courseNumber} — {group.title}
          </button>
          {sub ? <span className="text-xs text-[#5b6576]">{sub}</span> : null}
          {note && !open ? <span className="text-xs text-[#1a1f2b] italic">{note}</span> : null}
        </div>
        {criteria.map((c, colIndex) => (
          <span
            key={c.id}
            className={`flex w-[72px] justify-center sm:w-24 ${colIndex === 0 ? 'max-sm:ml-auto' : ''}`}
          >
            <RatingInput
              value={course[c.id] ?? null}
              onCommit={(v) => onRate(group.key, c.id, v)}
              ariaLabel={`${c.name} rating for ${group.courseNumber}`}
              rowIndex={rowIndex}
              colIndex={colIndex}
            />
          </span>
        ))}
        <span className="w-16 text-right text-xl font-bold text-yale-800 tabular-nums sm:w-28">
          {score == null ? '–' : score.toFixed(1)}
        </span>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-label="Description and note"
          className="flex h-9 w-9 items-center justify-center"
        >
          <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="#5b6576" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`h-[18px] w-[18px] ${open ? 'rotate-180' : ''}`}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>

      {open ? (
        <div className="flex flex-col gap-3 px-5 pb-4">
          <p className="max-w-[76ch] text-sm leading-relaxed">
            {first.description}{' '}
            {first.syllabusUrl ? (
              <a
                href={first.syllabusUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold whitespace-nowrap text-yale-800 underline underline-offset-2"
              >
                Syllabus ↗
              </a>
            ) : null}
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <input
              defaultValue={note}
              onChange={(e) => onNote(group.key, e.target.value)}
              placeholder="Add a note"
              aria-label={`Note for ${group.courseNumber}`}
              className="h-9 max-w-[520px] flex-[1_1_280px] rounded-md border border-[#c5ced9] bg-white px-2.5 text-sm"
            />
            <span className="ml-auto flex items-center gap-1 text-sm text-[#5b6576]">
              <button type="button" onClick={() => onDecide(group.key, isYes ? 'maybe' : 'yes')} className="h-8 px-2 hover:text-yale-800">
                {isYes ? 'Move to Maybe' : 'Move to Interested'}
              </button>
              <span aria-hidden>·</span>
              <button type="button" onClick={() => onDecide(group.key, 'no')} className="h-8 px-2 hover:text-yale-800">
                Remove
              </button>
            </span>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function ExportButton({ groups, term, termLabel }) {
  const [state, setState] = useState('idle')
  async function handleExport() {
    setState('busy')
    try {
      await downloadCompareWorkbook({ groups, term, termLabel })
      setState('idle')
    } catch (err) {
      console.error('Excel export failed', err)
      setState('failed')
    }
  }
  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={state === 'busy'}
      className={`h-10 w-full rounded-md border bg-white text-sm font-semibold hover:bg-yale-50 ${
        state === 'failed' ? 'border-red-400 text-red-700' : 'border-[#c5ced9] text-[#1a1f2b]'
      }`}
    >
      {state === 'busy' ? 'Exporting…' : state === 'failed' ? 'Export failed — try again' : 'Export to Excel'}
    </button>
  )
}

function RankingCard({ shortlist, term, termLabel, onOpen }) {
  const { ranked, unscored } = rankCourses(shortlist, term.ratings, term.criteria)
  return (
    <aside className="flex min-w-0 flex-[1_1_300px] flex-col self-start rounded-lg border border-[#dde3ea] bg-white lg:max-w-[360px]">
      <h2 className="px-5 pt-3.5 pb-2.5 text-base font-bold">Ranking</h2>
      <ol>
        {ranked.map(({ group, score }, i) => {
          const tone = ratingTone(score)
          return (
            <li key={group.key} className="border-t border-[#eef1f5]">
              <button
                type="button"
                onClick={() => onOpen(group.key)}
                className="flex w-full items-center gap-3 px-5 py-2.5 text-left text-sm hover:bg-[#f8fafc]"
              >
                <span className="w-5 font-semibold text-[#5b6576] tabular-nums">{i + 1}</span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="leading-snug font-semibold">{group.title}</span>
                  <span className="text-xs text-[#5b6576]">{group.courseNumber}</span>
                </span>
                <span
                  className="flex h-9 w-14 flex-none items-center justify-center rounded-md border text-base font-bold tabular-nums"
                  style={{ backgroundColor: tone.bg, color: tone.fg, borderColor: tone.bd }}
                >
                  {score.toFixed(1)}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
      {unscored > 0 ? (
        <p className="border-t border-[#eef1f5] px-5 py-2.5 text-xs text-[#5b6576]">
          {unscored === 1 ? '1 course not scored yet' : `${unscored} courses not scored yet`}
        </p>
      ) : null}
      <div className="border-t border-[#e6eaf0] px-5 py-3.5">
        <ExportButton groups={shortlist} term={term} termLabel={termLabel} />
      </div>
    </aside>
  )
}

/** Compare step 2: rate shortlisted courses per criterion; see them ranked. */
export default function ScoreStep({
  groups,
  term,
  termLabel,
  onRate,
  onNote,
  onDecide,
  onAddCriterion,
  onRemoveCriterion,
  onWeight,
  onFixWeights,
  onGoToShortlist,
}) {
  const [openKey, setOpenKey] = useState(null)
  const [adding, setAdding] = useState(false)
  const rowRefs = useRef(new Map())
  const scrollTo = useRef(null)

  const interested = groups.filter((g) => term.decisions[g.key] === 'yes')
  const maybe = groups.filter((g) => term.decisions[g.key] === 'maybe')
  const shortlist = [...interested, ...maybe]

  useEffect(() => {
    if (!scrollTo.current) return
    rowRefs.current.get(scrollTo.current)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    scrollTo.current = null
  }, [openKey])

  if (shortlist.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-[800px] flex-col items-center gap-4 px-4 py-12 text-center">
        <h2 className="text-xl font-bold">Your shortlist is empty</h2>
        <p className="text-sm text-[#5b6576]">Mark courses Interested or Maybe in step 1 to score them here.</p>
        <button
          type="button"
          onClick={onGoToShortlist}
          className="flex h-12 items-center rounded-lg bg-yale-800 px-5 text-sm font-semibold text-white hover:bg-yale-900"
        >
          Go to Shortlist
        </button>
      </div>
    )
  }

  function openFromRanking(key) {
    scrollTo.current = key
    setOpenKey(key)
  }

  let rowIndex = 0
  const sections = [
    { name: 'Interested', items: interested },
    { name: 'Maybe', items: maybe },
  ].filter((s) => s.items.length > 0)

  return (
    <div className="mx-auto flex w-full max-w-[1376px] flex-wrap items-start gap-6 px-3 pt-6 pb-14 sm:px-8">
      <main className="min-w-0 flex-[999_1_640px] overflow-x-auto rounded-lg border border-[#dde3ea] bg-white">
        <div className="sm:min-w-[700px]" data-rating-grid>
          <div className="flex items-center justify-between gap-3 pt-3 pr-3 pb-1 pl-5">
            <h2 className="text-base font-bold">Your shortlist</h2>
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="h-9 rounded-md bg-save-800 px-3.5 text-sm font-semibold text-white hover:bg-save-900"
            >
              + Add criterion
            </button>
          </div>
          {adding ? <AddCriterionRow onAdd={onAddCriterion} onClose={() => setAdding(false)} /> : null}
          <CriteriaHeader
            criteria={term.criteria}
            needsFix={weightsNeedFix(term.criteria)}
            onRemove={onRemoveCriterion}
            onWeight={onWeight}
            onFixWeights={onFixWeights}
          />
          {sections.map((s) => (
            <div key={s.name}>
              <div className="border-t border-[#e6eaf0] bg-[#f5f7fa] px-5 pt-2.5 pb-2 text-xs font-bold text-[#5b6576]">
                {s.name} · {s.items.length}
              </div>
              {s.items.map((group) => (
                <ScoreRow
                  key={group.key}
                  group={group}
                  term={term}
                  rowIndex={rowIndex++}
                  open={openKey === group.key}
                  onToggle={() => setOpenKey((k) => (k === group.key ? null : group.key))}
                  onRate={onRate}
                  onNote={onNote}
                  onDecide={onDecide}
                  rowRef={(el) => {
                    if (el) rowRefs.current.set(group.key, el)
                    else rowRefs.current.delete(group.key)
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </main>
      <RankingCard shortlist={shortlist} term={term} termLabel={termLabel} onOpen={openFromRanking} />
    </div>
  )
}
