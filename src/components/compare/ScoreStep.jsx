import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { downloadCompareWorkbook } from '../../lib/compareExport'
import {
  PROFESSOR_CRITERION_ID,
  courseRatings,
  professorKey,
  rankCourses,
  ratingTone,
  weightedScore,
  weightsNeedFix,
} from '../../lib/compareScoring'
import { formatCourseHeading, formatCourseUnits } from '../../lib/courseDisplay'
import { formatSessionLabel } from '../../lib/sessionDisplay'
import HintBubble from '../HintBubble'
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

/**
 * Header and rows share one column grid on desktop (`--score-cols`, set on the
 * table), so every label sits exactly over its column. Phones stack instead:
 * course name on its own line, boxes right-aligned underneath.
 */
const GRID_ROW =
  'flex flex-wrap items-center gap-2 pr-3 pl-5 sm:grid sm:[grid-template-columns:var(--score-cols)]'
const LABEL = 'text-xs font-semibold text-[#5b6576]'
// Tips inside the table stay narrower than it on phones: poking out would make it scroll sideways.
const TABLE_TIP_MAX_W = 'max-w-[min(24rem,calc(100vw-5rem))]'

function columnCell(index, extra = '') {
  return `flex w-[72px] justify-center sm:w-auto ${index === 0 ? 'max-sm:ml-auto' : ''} ${extra}`
}

function scoreColumns(criteriaCount) {
  return `minmax(14rem, 1fr) repeat(${criteriaCount}, 7rem) 6.5rem 2.25rem`
}

function CriteriaHeader({ criteria, needsFix, onRemove, onWeight, onFixWeights, tip, onDismissTip }) {
  const total = criteria.reduce((sum, c) => sum + c.weight, 0)
  return (
    <div className={`border-b border-[#e6eaf0] pb-3 ${tip === 'cmp-weights' ? 'relative z-[45] bg-white' : ''}`}>
      {tip === 'cmp-weights' ? (
        <HintBubble
          arrow="up"
          arrowStyle={{ left: 'calc(50% - 6px)' }}
          className="absolute top-full left-1/2 mt-3 -translate-x-1/2"
          onDismiss={onDismissTip}
        >
          Weights set how much each counts. They add up to 1
        </HintBubble>
      ) : null}
      <div className={`${GRID_ROW} pt-2`}>
        <span className={`hidden sm:block ${LABEL}`}>Course</span>
        {criteria.map((c, i) => (
          <span key={c.id} className={columnCell(i, 'flex-col items-center sm:h-6 sm:flex-row')}>
            {/* Desktop: a same-width spacer keeps the name centered with × beside it. Phones: × sits under the name. */}
            {criteria.length > 1 ? <span aria-hidden className="hidden w-3.5 flex-none sm:block" /> : null}
            <span
              title={
                c.id === PROFESSOR_CRITERION_ID
                  ? `${c.name} — shared across courses with the same professor`
                  : c.name
              }
              className={`min-w-0 text-center leading-tight break-words sm:truncate ${LABEL}`}
            >
              {c.name}
            </span>
            {criteria.length > 1 ? (
              <button
                type="button"
                onClick={() => onRemove(c)}
                aria-label={`Remove ${c.name}`}
                className="flex h-5 w-6 flex-none items-center justify-center sm:h-6 sm:w-3.5"
              >
                <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="#8a95a5" strokeWidth="3" strokeLinecap="round" className="h-2.5 w-2.5">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            ) : null}
          </span>
        ))}
        <span className={`w-16 text-right sm:w-auto ${LABEL}`}>
          <span className="sm:hidden">Score</span>
          <span className="hidden sm:inline">Weighted score</span>
        </span>
        <span className="hidden w-9 sm:block" />
      </div>

      <div className={`${GRID_ROW} pt-1`}>
        <span className={`hidden sm:block ${LABEL}`}>Weight</span>
        {criteria.map((c, i) => (
          <span key={c.id} className={columnCell(i)}>
            <WeightInput
              weight={c.weight}
              onCommit={(w) => onWeight(c.id, w)}
              ariaLabel={`Weight for ${c.name}`}
            />
          </span>
        ))}
        {needsFix ? (
          <span className="flex w-16 flex-col items-end text-xs leading-tight font-semibold text-[#9a4a00] sm:w-auto">
            <span className="tabular-nums">Total {total.toFixed(2)}</span>
            <button type="button" onClick={onFixWeights} className="underline underline-offset-2">
              Rescale<span className="hidden sm:inline"> to 1</span>
            </button>
          </span>
        ) : (
          <span className="w-16 text-right text-xs text-[#5b6576] tabular-nums sm:w-auto">Total 1.00</span>
        )}
        <span className="hidden w-9 sm:block" />
      </div>
    </div>
  )
}

/** Note box: starts at two lines, grows with the text, and can be dragged taller. */
function NoteBox({ courseNumber, value, onChange }) {
  const ref = useRef(null)
  const grow = () => {
    const el = ref.current
    if (el && el.scrollHeight > el.clientHeight) el.style.height = `${el.scrollHeight + 2}px`
  }
  useLayoutEffect(grow, [])
  return (
    <textarea
      ref={ref}
      rows={2}
      defaultValue={value}
      onChange={(e) => {
        onChange(e.target.value)
        grow()
      }}
      placeholder="Add a note"
      aria-label={`Note for ${courseNumber}`}
      className="min-h-16 w-full resize-y rounded-md border border-[#c5ced9] bg-white px-2.5 py-2 text-sm leading-relaxed"
    />
  )
}

function ScoreRow({
  group,
  term,
  professors,
  rowIndex,
  open,
  onToggle,
  onRate,
  onNote,
  onDecide,
  rowRef,
  tip = null,
  onDismissTip,
}) {
  const { criteria, notes, decisions } = term
  const course = courseRatings(group, term, professors)
  const noProfessor = professorKey(group) == null
  const score = weightedScore(course, criteria)
  const note = notes[group.key] ?? ''
  const first = group.sections[0]
  const isYes = decisions[group.key] === 'yes'
  const sub = [formatSessionLabel(group.sessions[0]), group.professors.join(' / ')]
    .filter(Boolean)
    .join(' · ')

  return (
    <div
      ref={rowRef}
      className={`border-t border-[#e6eaf0] ${open ? 'bg-[#f8fafc]' : 'bg-white'} ${
        tip === 'cmp-rate' || tip === 'cmp-open-course' ? 'relative z-[45]' : ''
      }`}
    >
      {/* The whole summary line toggles the row; its own boxes, buttons and links keep their behavior. */}
      <div
        onClick={(event) => {
          if (event.target.closest('input, button, a')) return
          onToggle()
        }}
        className={`${GRID_ROW} cursor-pointer py-3 hover:bg-[#f8fafc]`}
      >
        <div
          className={`flex min-w-0 basis-full flex-col gap-0.5 sm:basis-auto ${tip === 'cmp-open-course' ? 'relative' : ''}`}
        >
          {tip === 'cmp-open-course' ? (
            <HintBubble
              arrow="down"
              arrowStyle={{ left: '1.5rem' }}
              className="absolute bottom-full left-0 mb-3"
              maxWidthClass={TABLE_TIP_MAX_W}
              onDismiss={onDismissTip}
            >
              <span className="sm:hidden">Tap a course for its description and notes</span>
              <span className="hidden sm:inline">Click a course for its description and notes</span>
            </HintBubble>
          ) : null}
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            className="text-left text-sm leading-snug font-bold text-[#1a1f2b] hover:text-yale-800"
          >
            {formatCourseHeading(group)}
          </button>
          {sub ? <span className="text-xs text-[#5b6576]">{sub}</span> : null}
          {note && !open ? <span className="text-xs text-[#1a1f2b] italic">{note}</span> : null}
        </div>
        {criteria.map((c, colIndex) => (
          <span
            key={c.id}
            className={`${columnCell(colIndex)} ${tip === 'cmp-rate' && colIndex === 0 ? 'relative' : ''}`}
          >
            {tip === 'cmp-rate' && colIndex === 0 ? (
              // Phones: the first box sits near the left edge, so the tip starts there instead of centering.
              <HintBubble
                arrowClassName="-bottom-[7px] left-6 border-r-[1.5px] border-b-[1.5px] sm:left-[calc(50%-6px)]"
                className="absolute bottom-full left-0 mb-3 sm:left-1/2 sm:-translate-x-1/2"
                maxWidthClass={TABLE_TIP_MAX_W}
                onDismiss={onDismissTip}
              >
                Rate each course 1–10 on each criterion (10 = best)
              </HintBubble>
            ) : null}
            <RatingInput
              value={course[c.id] ?? null}
              onCommit={(v) => onRate(group, c.id, v)}
              ariaLabel={`${c.name} rating for ${group.courseNumber}`}
              rowIndex={rowIndex}
              colIndex={colIndex}
              disabled={c.id === PROFESSOR_CRITERION_ID && noProfessor}
            />
          </span>
        ))}
        <span className="w-16 text-right text-xl font-bold text-yale-800 tabular-nums sm:w-auto">
          {score == null ? '–' : score.toFixed(1)}
        </span>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-label="Description and note"
          className="hidden h-9 w-9 items-center justify-center sm:flex"
        >
          <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="#5b6576" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`h-[18px] w-[18px] ${open ? 'rotate-180' : ''}`}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>

      {open ? (
        <div className="flex flex-col gap-3 px-5 pb-4">
          <p className="text-sm leading-relaxed">
            {first.description ? (
              <>{first.description} </>
            ) : (
              <span className="text-gray-500 italic">No description provided. </span>
            )}
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
          <NoteBox courseNumber={group.courseNumber} value={note} onChange={(text) => onNote(group.key, text)} />
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => onDecide(group.key, isYes ? 'maybe' : 'yes')}
              className="h-8 rounded-md border border-[#c5ced9] bg-white px-3 text-sm font-medium text-[#1a1f2b] hover:bg-yale-50"
            >
              {isYes ? 'Move to Maybe' : 'Move to Interested'}
            </button>
            <button
              type="button"
              onClick={() => onDecide(group.key, 'no')}
              className="h-8 rounded-md border border-[#c5ced9] bg-white px-3 text-sm font-medium text-[#1a1f2b] hover:border-[#c4321f] hover:bg-[#fdeceb] hover:text-[#8f1d14]"
            >
              Remove
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function ExportButton({ groups, term, professors, termLabel }) {
  const [state, setState] = useState('idle')
  async function handleExport() {
    setState('busy')
    try {
      await downloadCompareWorkbook({ groups, term, professors, termLabel })
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

function RankingCard({ shortlist, term, professors, termLabel, onOpen, tip, onDismissTip }) {
  const { ranked, unscored } = rankCourses(
    shortlist,
    (group) => courseRatings(group, term, professors),
    term.criteria,
  )
  return (
    <aside
      className={`flex min-w-0 flex-[1_1_300px] flex-col self-start rounded-lg border border-[#dde3ea] bg-white lg:max-w-[360px] ${
        tip === 'cmp-ranking' ? 'relative z-[45]' : ''
      }`}
    >
      {tip === 'cmp-ranking' ? (
        <>
          {/* Computers: under the card, lined up with its right edge so it never passes the page edge. */}
          <div className="hidden lg:block">
            <HintBubble
              arrowClassName="-top-[7px] right-6 border-t-[1.5px] border-l-[1.5px]"
              className="absolute top-full right-0 mt-3"
              onDismiss={onDismissTip}
            >
              Your ranking updates as you rate. Export to Excel here
            </HintBubble>
          </div>
          {/* Narrower screens: the card sits further down, so the tip floats above the bottom bar. */}
          <div className="lg:hidden">
            <HintBubble
              className="fixed bottom-[calc(3.75rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2"
              onDismiss={onDismissTip}
            >
              Scroll down for your ranking and Excel export
            </HintBubble>
          </div>
        </>
      ) : null}
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
                  <span className="leading-snug font-semibold">
                    {group.title} ({formatCourseUnits(group.units)})
                  </span>
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
        <ExportButton groups={shortlist} term={term} professors={professors} termLabel={termLabel} />
      </div>
    </aside>
  )
}

/** Compare step 2: rate shortlisted courses per criterion; see them ranked. */
export default function ScoreStep({
  groups,
  term,
  professors,
  termLabel,
  onRate,
  onNote,
  onDecide,
  onAddCriterion,
  onRemoveCriterion,
  onWeight,
  onFixWeights,
  onGoToShortlist,
  tip = null,
  onDismissTip,
}) {
  const [openKey, setOpenKey] = useState(null)

  // Opening a course is what the "open a course" tip asks for.
  useEffect(() => {
    if (openKey && tip === 'cmp-open-course') onDismissTip?.()
  }, [openKey, tip, onDismissTip])
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
        <div
          className="sm:min-w-[700px]"
          style={{ '--score-cols': scoreColumns(term.criteria.length) }}
          data-rating-grid
        >
          <div className="relative flex items-center justify-between gap-3 pt-4 pr-3 pb-2 pl-5">
            <h2 className="text-base font-bold">Your shortlist</h2>
            <button
              type="button"
              onClick={() => setAdding(true)}
              className={`h-8 rounded-md bg-save-800 px-3 text-sm font-semibold text-white hover:bg-save-900 ${
                tip === 'cmp-add-criterion' ? 'relative z-[45]' : ''
              }`}
            >
              + Add criterion
            </button>
            {tip === 'cmp-add-criterion' ? (
              <HintBubble
                arrow="up"
                arrowStyle={{ left: 'auto', right: '1.5rem' }}
                className="absolute top-full right-3 mt-1"
                onDismiss={onDismissTip}
              >
                Add your own criterion, like Workload
              </HintBubble>
            ) : null}
          </div>
          {adding ? <AddCriterionRow onAdd={onAddCriterion} onClose={() => setAdding(false)} /> : null}
          <CriteriaHeader
            criteria={term.criteria}
            needsFix={weightsNeedFix(term.criteria)}
            onRemove={onRemoveCriterion}
            onWeight={onWeight}
            onFixWeights={onFixWeights}
            tip={tip}
            onDismissTip={onDismissTip}
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
                  professors={professors}
                  rowIndex={rowIndex++}
                  open={openKey === group.key}
                  onToggle={() => setOpenKey((k) => (k === group.key ? null : group.key))}
                  onRate={onRate}
                  onNote={onNote}
                  onDecide={onDecide}
                  tip={group === shortlist[0] ? tip : null}
                  onDismissTip={onDismissTip}
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
      <RankingCard
        shortlist={shortlist}
        term={term}
        professors={professors}
        termLabel={termLabel}
        onOpen={openFromRanking}
        tip={tip}
        onDismissTip={onDismissTip}
      />
    </div>
  )
}
