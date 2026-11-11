import { useEffect, useRef, useState } from 'react'
import { shortlistCard, shortlistQueue } from '../../lib/compareShortlist'
import HintBubble from '../HintBubble'
import NoDescription from '../NoDescription'
import ReviewPanel from './ReviewPanel'

const DECISION_LABELS = { yes: 'Interested', maybe: 'Maybe', no: 'Not interested' }
const SWIPE_DISTANCE = 80

const BUTTONS = [
  {
    decision: 'no',
    label: 'Not interested',
    short: 'Not',
    keycap: '←',
    className: 'border-[#c4321f] bg-[#fdeceb] text-[#8f1d14]',
    icon: 'M6 6l12 12M18 6L6 18',
  },
  {
    decision: 'maybe',
    label: 'Maybe',
    short: 'Maybe',
    keycap: '↓',
    className: 'border-[#c58a00] bg-[#fff4d6] text-[#6b4700]',
    icon: 'M5 12h14',
  },
  {
    decision: 'yes',
    label: 'Interested',
    short: 'Interested',
    keycap: '→',
    className: 'border-[#1e7a3c] bg-[#e5f3e8] text-[#145c2c]',
    icon: 'M5 12.5l4.5 4.5L19 7.5',
  },
]

const KEY_DECISIONS = { ArrowLeft: 'no', ArrowDown: 'maybe', ArrowRight: 'yes' }

function isTyping(target) {
  return target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName)
}

function CourseCard({ card, onSwipe }) {
  const [dragX, setDragX] = useState(0)
  const touch = useRef(null)

  function handleTouchStart(event) {
    const t = event.touches[0]
    touch.current = { x: t.clientX, y: t.clientY, horizontal: null }
  }

  function handleTouchMove(event) {
    if (!touch.current) return
    const t = event.touches[0]
    const dx = t.clientX - touch.current.x
    const dy = t.clientY - touch.current.y
    if (touch.current.horizontal === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      touch.current.horizontal = Math.abs(dx) > Math.abs(dy)
    }
    if (touch.current.horizontal) setDragX(dx)
  }

  function handleTouchEnd() {
    if (dragX <= -SWIPE_DISTANCE) onSwipe('no')
    else if (dragX >= SWIPE_DISTANCE) onSwipe('yes')
    touch.current = null
    setDragX(0)
  }

  return (
    <article
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: dragX ? `translateX(${dragX}px) rotate(${dragX / 40}deg)` : undefined,
        transition: dragX ? 'none' : 'transform 150ms ease-out',
      }}
      className="flex flex-col gap-4 rounded-xl border border-[#dde3ea] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:px-9 sm:py-6 lg:min-h-[300px] lg:flex-1"
    >
      {/* Top row: session, tags and category on the left; meeting days and time on the right. */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {card.session ? (
            <span className="rounded border border-[#c5ced9] px-2 py-0.5 text-xs font-medium">
              {card.session}
            </span>
          ) : null}
          {card.tags.map((tag) => (
            <span key={tag} className="rounded bg-[#e3ebf5] px-2 py-0.5 text-xs font-semibold text-yale-800">
              {tag}
            </span>
          ))}
          {card.category ? <span className="ml-1 text-xs text-[#5b6576]">{card.category}</span> : null}
        </div>
        <div className="flex items-center gap-3">
          <span className="sr-only">{card.daysLabel}</span>
          <div aria-hidden className="flex gap-2.5 text-sm tracking-[0.02em]">
            {card.days.map((d, i) =>
              d.on ? (
                <span key={i} className="border-b-2 border-yale-800 pb-0.5 font-bold text-yale-800">
                  {d.letter}
                </span>
              ) : (
                <span key={i} className="pb-1 font-medium text-[#b5bdc8]">
                  {d.letter}
                </span>
              ),
            )}
          </div>
          {card.time ? (
            <span className="text-sm font-semibold tabular-nums">{card.time}</span>
          ) : (
            <span className="text-sm text-caution">No time defined</span>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-xl leading-tight font-bold tracking-[-0.01em] lg:text-[28px]">
          {card.heading} <span className="whitespace-nowrap">{card.units}</span>
        </h2>
        <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <p className="text-base text-[#5b6576]">{card.professors}</p>
          {card.syllabusUrl ? (
            <a
              href={card.syllabusUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex shrink-0 items-center gap-1.5 text-sm font-semibold text-yale-800 underline underline-offset-2 hover:text-yale-950"
            >
              Syllabus
              <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="h-3 w-3">
                <path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6" />
              </svg>
            </a>
          ) : null}
        </div>
      </div>

      <div className="border-t border-[#e6eaf0]" />
      {/* Desktop: the card fills the space left on screen, so the page itself never scrolls
          and the buttons stay put; only a long description scrolls inside the card. */}
      <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
        {card.description ? (
          <p className="text-base leading-normal">{card.description}</p>
        ) : (
          <NoDescription className="text-base" />
        )}
      </div>
    </article>
  )
}

function DecisionButtons({ onDecide }) {
  return (
    <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
      {BUTTONS.map((b) => (
        <button
          key={b.decision}
          type="button"
          onClick={() => onDecide(b.decision)}
          className={`flex h-[60px] flex-col items-center justify-center gap-0.5 rounded-[10px] border-2 text-sm font-bold sm:h-16 sm:flex-row sm:gap-2.5 sm:text-base ${b.className}`}
        >
          <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 sm:h-[18px] sm:w-[18px]">
            <path d={b.icon} />
          </svg>
          <span className="sm:hidden">{b.short}</span>
          <span className="hidden sm:inline">{b.label}</span>
          <kbd
            aria-label={`Shortcut: ${b.keycap}`}
            className="hidden h-6 min-w-6 items-center justify-center rounded border border-current/40 px-1 font-sans text-xs font-semibold opacity-80 lg:inline-flex"
          >
            {b.keycap}
          </kbd>
        </button>
      ))}
    </div>
  )
}

/** Desktop-only progress column to the right of the card (phones skip it). Rows open the review panel. */
function Progress({ counts, onReview, tip, onDismissTip }) {
  const pct = counts.total ? Math.round((counts.decided / counts.total) * 100) : 0
  const rows = [
    { decision: 'yes', n: counts.yes, label: 'Interested', dot: 'bg-[#1e7a3c]', text: 'text-[#145c2c]' },
    { decision: 'maybe', n: counts.maybe, label: 'Maybe', dot: 'bg-[#c58a00]', text: 'text-[#6b4700]' },
    { decision: 'no', n: counts.no, label: 'Not interested', dot: 'bg-[#c4321f]', text: 'text-[#8f1d14]' },
  ]
  return (
    <aside
      aria-label="Progress"
      className={`hidden w-44 shrink-0 flex-col gap-3 self-start pt-1 lg:flex ${
        tip === 'cmp-review' ? 'relative z-[45]' : ''
      }`}
    >
      {tip === 'cmp-review' ? (
        <HintBubble arrow="right" className="absolute top-16 right-full mr-4" onDismiss={onDismissTip}>
          Click “Interested”, “Maybe” or “Not interested” to see or move those courses
        </HintBubble>
      ) : null}
      <p className="text-sm text-[#5b6576] tabular-nums">
        <span className="font-semibold text-[#1a1f2b]">{counts.decided}</span> of {counts.total} decided
      </p>
      <div className="h-1.5 overflow-hidden rounded-full bg-[#dde3ea]">
        <div className="h-1.5 bg-yale-800" style={{ width: `${pct}%` }} />
      </div>
      <ul className="-mx-2 flex flex-col text-sm">
        {rows.map((r) => (
          <li key={r.label}>
            <button
              type="button"
              onClick={() => onReview(r.decision)}
              title={`Review ${r.label.toLowerCase()} courses`}
              className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1 hover:bg-white"
            >
              <span className="flex items-center gap-2 text-[#5b6576]">
                <span aria-hidden className={`h-2 w-2 rounded-full ${r.dot}`} />
                {r.label}
              </span>
              <span className={`font-semibold tabular-nums ${r.text}`}>{r.n}</span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  )
}

/**
 * Compare step 1: one course at a time — Not interested / Maybe / Interested.
 * Arrow keys (← ↓ →) and, on phones, swiping the card left/right decide too;
 * Cmd/Ctrl+Z undoes the last decision.
 */
// Tips about the button bar sit just above it (right side, arrow down), so they stay on screen
// at every size; below the bar can fall off the bottom of the screen.
const ABOVE_BAR_TIP = 'absolute right-3 bottom-full mb-3 sm:right-0'
const ABOVE_BAR_ARROW = 'right-6 -bottom-[7px] border-r-[1.5px] border-b-[1.5px]'
const UNDO_KEYS =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? 'Cmd+Z' : 'Ctrl+Z'

export default function ShortlistStep({
  groups,
  term,
  counts,
  termLabel,
  onDecide,
  onUndo,
  onGoToScore,
  tip = null,
  onDismissTip,
}) {
  const rootRef = useRef(null)
  const [reviewing, setReviewing] = useState(null)
  const current = shortlistQueue(groups, term.decisions)[0] ?? null
  const lastKey = term.history[term.history.length - 1]?.key
  const lastGroup = lastKey ? groups.find((g) => g.key === lastKey) : null
  const lastLine = lastGroup
    ? `${lastGroup.courseNumber} marked ${DECISION_LABELS[term.decisions[lastKey]]}`
    : ''

  const canUndo = Boolean(lastGroup)
  const barTip = tip === 'cmp-decide' || tip === 'cmp-undo' || tip === 'cmp-review'

  // Opening Review is what the review tip asks for.
  useEffect(() => {
    if (reviewing && tip === 'cmp-review') onDismissTip?.()
  }, [reviewing, tip, onDismissTip])

  useEffect(() => {
    function handleKey(event) {
      // Shortcuts pause while typing or while any pop-up (Contact, Review…) is open.
      if (isTyping(event.target) || !rootRef.current?.offsetParent) return
      if (document.querySelector('[role="dialog"]')) return
      const undo =
        (event.metaKey || event.ctrlKey) && !event.shiftKey && !event.altKey && event.key.toLowerCase() === 'z'
      if (undo) {
        if (!canUndo) return
        event.preventDefault()
        onUndo()
        return
      }
      const decision = KEY_DECISIONS[event.key]
      if (!decision || !current) return
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
      event.preventDefault()
      onDecide(current.key, decision)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [current, canUndo, onDecide, onUndo])

  return (
    <div
      ref={rootRef}
      className="mx-auto flex w-full max-w-[1100px] gap-6 px-3 py-4 sm:px-8 sm:pt-8 sm:pb-14 lg:min-h-0 lg:flex-1 lg:pt-6 lg:pb-6"
    >
      <div className="mx-auto flex w-full max-w-[880px] min-w-0 flex-col gap-4 lg:min-h-0">
        {current ? (
          <>
            <CourseCard
              key={current.key}
              card={shortlistCard(current)}
              onSwipe={(decision) => onDecide(current.key, decision)}
            />
            <div
              className={`sticky bottom-[calc(3rem+env(safe-area-inset-bottom))] -mx-3 flex shrink-0 flex-col gap-1 border-t border-[#dde3ea] bg-white px-4 pt-3 pb-2 sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 ${
                barTip ? `sm:relative ${tip === 'cmp-review' ? 'z-[45] lg:z-auto' : 'z-[45]'}` : 'z-10 sm:static'
              }`}
            >
              {tip === 'cmp-decide' ? (
                <HintBubble
                  arrow="down"
                  arrowStyle={{ left: 'calc(50% - 6px)' }}
                  className="absolute bottom-full left-1/2 mb-3 -translate-x-1/2"
                  onDismiss={onDismissTip}
                >
                  <span className="lg:hidden">Or swipe the card left or right to choose</span>
                  <span className="hidden lg:inline">Or press ← ↓ → to choose “Not interested”, “Maybe” or “Interested”</span>
                </HintBubble>
              ) : null}
              {tip === 'cmp-undo' ? (
                <HintBubble arrowClassName={ABOVE_BAR_ARROW} className={ABOVE_BAR_TIP} onDismiss={onDismissTip}>
                  <span className="lg:hidden">Changed your mind? Tap Undo</span>
                  <span className="hidden lg:inline">Changed your mind? Undo, or {UNDO_KEYS}</span>
                </HintBubble>
              ) : null}
              {tip === 'cmp-review' ? (
                <HintBubble
                  arrowClassName={ABOVE_BAR_ARROW}
                  className={`${ABOVE_BAR_TIP} lg:hidden`}
                  onDismiss={onDismissTip}
                >
                  Tap <b>Review</b> to see or move courses
                </HintBubble>
              ) : null}
              <DecisionButtons onDecide={(d) => onDecide(current.key, d)} />
              <div className="flex min-h-9 items-center justify-between gap-2 text-sm text-[#5b6576]">
                <span className="min-w-0 truncate">{lastLine}</span>
                <span className="flex shrink-0 items-center gap-3">
                  {counts.decided > 0 ? (
                    <button
                      type="button"
                      onClick={() => setReviewing('no')}
                      className="h-9 px-1 font-semibold text-yale-800 lg:hidden"
                    >
                      Review
                    </button>
                  ) : null}
                  {lastGroup ? (
                    <button type="button" onClick={onUndo} className="h-9 px-1 font-semibold text-yale-800">
                      Undo
                    </button>
                  ) : null}
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-[#dde3ea] bg-white px-9 py-12 text-center">
            <h2 className="text-xl font-bold">Every {termLabel} course decided</h2>
            <p className="text-sm text-[#5b6576]">
              {counts.yes} interested · {counts.maybe} maybe
            </p>
            <button
              type="button"
              onClick={onGoToScore}
              className="flex h-12 items-center rounded-lg bg-yale-800 px-5 text-sm font-semibold text-white hover:bg-yale-900"
            >
              Score and rank them
            </button>
            <span className="flex items-center gap-4">
              <button type="button" onClick={() => setReviewing('no')} className="h-9 text-sm font-semibold text-yale-800">
                Review decisions
              </button>
              {lastGroup ? (
                <button type="button" onClick={onUndo} className="h-9 text-sm font-semibold text-yale-800">
                  Undo last
                </button>
              ) : null}
            </span>
          </div>
        )}
      </div>
      <Progress counts={counts} onReview={setReviewing} tip={tip} onDismissTip={onDismissTip} />
      {reviewing ? (
        <ReviewPanel
          initialDecision={reviewing}
          groups={groups}
          term={term}
          counts={counts}
          onDecide={onDecide}
          onClose={() => setReviewing(null)}
        />
      ) : null}
    </div>
  )
}
