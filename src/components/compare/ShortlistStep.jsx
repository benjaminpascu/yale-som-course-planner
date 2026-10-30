import { useEffect, useRef, useState } from 'react'
import { shortlistCard, shortlistQueue } from '../../lib/compareShortlist'

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
      className="flex flex-col gap-5 rounded-xl border border-[#dde3ea] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:px-9 sm:py-8 lg:min-h-[300px] lg:flex-1"
    >
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

      <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
        <div className="min-w-0 flex-[999_1_320px]">
          <h2 className="text-xl leading-tight font-bold tracking-[-0.01em] lg:text-[28px]">
            {card.heading} <span className="whitespace-nowrap">{card.units}</span>
          </h2>
          <p className="mt-1.5 text-base text-[#5b6576]">{card.professors}</p>
        </div>
        <div className="flex flex-none flex-col items-start gap-1 sm:items-end">
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
            <span className="text-sm text-amber-700">No time defined</span>
          )}
        </div>
      </div>

      <div className="border-t border-[#e6eaf0]" />
      {/* Desktop: the card fills the space left on screen, so the page itself never scrolls
          and the buttons stay put; only a long description scrolls inside the card. */}
      <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
        {card.description ? (
          <p className="max-w-[72ch] text-base leading-[1.65]">{card.description}</p>
        ) : null}
      </div>
      {card.syllabusUrl ? (
        <a
          href={card.syllabusUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 self-start text-sm font-semibold text-yale-800 underline underline-offset-2 hover:text-yale-950"
        >
          Syllabus
          <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="h-3 w-3">
            <path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6" />
          </svg>
        </a>
      ) : null}
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

function Progress({ counts }) {
  const pct = counts.total ? Math.round((counts.decided / counts.total) * 100) : 0
  const tiles = [
    { n: counts.yes, label: 'Interested', className: 'text-[#145c2c]' },
    { n: counts.maybe, label: 'Maybe', className: 'text-[#6b4700]' },
    { n: counts.no, label: 'Not interested', className: 'text-[#8f1d14]' },
  ]
  return (
    <section aria-label="Progress" className="flex shrink-0 flex-col gap-3 border-t border-[#dde3ea] pt-4">
      <div className="flex items-center gap-3 text-sm text-[#5b6576]">
        <span className="whitespace-nowrap tabular-nums">
          {counts.decided} of {counts.total} decided
        </span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#dde3ea]">
          <div className="h-1.5 bg-yale-800" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-lg border border-[#dde3ea] bg-white px-3 py-2.5">
            <div className={`text-xl font-bold tabular-nums ${t.className}`}>{t.n}</div>
            <div className="text-xs text-[#5b6576]">{t.label}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

/**
 * Compare step 1: one course at a time — Not interested / Maybe / Interested.
 * Arrow keys (← ↓ →) and, on phones, swiping the card left/right decide too.
 */
export default function ShortlistStep({ groups, term, counts, termLabel, onDecide, onUndo, onGoToScore }) {
  const rootRef = useRef(null)
  const current = shortlistQueue(groups, term.decisions)[0] ?? null
  const lastKey = term.history[term.history.length - 1]
  const lastGroup = lastKey ? groups.find((g) => g.key === lastKey) : null
  const lastLine = lastGroup
    ? `${lastGroup.courseNumber} marked ${DECISION_LABELS[term.decisions[lastKey]]}`
    : ''

  useEffect(() => {
    function handleKey(event) {
      const decision = KEY_DECISIONS[event.key]
      if (!decision || !current) return
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
      if (isTyping(event.target) || !rootRef.current?.offsetParent) return
      event.preventDefault()
      onDecide(current.key, decision)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [current, onDecide])

  return (
    <div
      ref={rootRef}
      className="mx-auto flex w-full max-w-[880px] flex-col gap-4 px-3 py-4 sm:px-8 sm:pt-8 sm:pb-14 lg:min-h-0 lg:flex-1 lg:pt-6 lg:pb-6"
    >
      {current ? (
        <>
          <CourseCard
            key={current.key}
            card={shortlistCard(current)}
            onSwipe={(decision) => onDecide(current.key, decision)}
          />
          <div className="sticky bottom-[calc(3rem+env(safe-area-inset-bottom))] z-10 -mx-3 flex shrink-0 flex-col gap-1 border-t border-[#dde3ea] bg-white px-4 pt-3 pb-2 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
            <DecisionButtons onDecide={(d) => onDecide(current.key, d)} />
            <div className="flex min-h-9 items-center justify-between gap-2 text-sm text-[#5b6576]">
              <span>{lastLine}</span>
              {lastGroup ? (
                <button type="button" onClick={onUndo} className="h-9 px-1 font-semibold text-yale-800">
                  Undo
                </button>
              ) : null}
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
          {lastGroup ? (
            <button type="button" onClick={onUndo} className="h-9 text-sm font-semibold text-yale-800">
              Undo last
            </button>
          ) : null}
        </div>
      )}
      <Progress counts={counts} />
    </div>
  )
}
