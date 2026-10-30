import { useEffect, useState } from 'react'
import { normalizeCategory } from '../../lib/categoryDisplay'
import { reviewList } from '../../lib/compareShortlist'

const TABS = [
  { decision: 'yes', label: 'Interested' },
  { decision: 'maybe', label: 'Maybe' },
  { decision: 'no', label: 'Not interested' },
]

const MOVE_BUTTONS = {
  yes: { label: 'Interested', className: 'border-[#1e7a3c] bg-[#e5f3e8] text-[#145c2c]' },
  maybe: { label: 'Maybe', className: 'border-[#c58a00] bg-[#fff4d6] text-[#6b4700]' },
  no: { label: 'Not interested', className: 'border-[#c4321f] bg-[#fdeceb] text-[#8f1d14]' },
}

function ReviewItem({ group, decision, onDecide }) {
  const [open, setOpen] = useState(false)
  const first = group.sections[0]
  const sub = [group.professors.join(' / '), normalizeCategory(first.category)]
    .filter(Boolean)
    .join(' · ')

  return (
    <li className="border-t border-[#eef1f5] py-3">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="min-w-0 flex-1 text-left"
        >
          <span className="block text-sm leading-snug font-semibold text-[#1a1f2b]">
            {group.courseNumber} — {group.title}
          </span>
          {sub ? <span className="mt-0.5 block text-xs text-[#5b6576]">{sub}</span> : null}
        </button>
        <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row">
          {TABS.filter((t) => t.decision !== decision).map((t) => (
            <button
              key={t.decision}
              type="button"
              onClick={() => onDecide(group.key, t.decision)}
              className={`h-8 rounded-md border px-2.5 text-xs font-semibold whitespace-nowrap ${MOVE_BUTTONS[t.decision].className}`}
            >
              {MOVE_BUTTONS[t.decision].label}
            </button>
          ))}
        </div>
      </div>
      {open && first.description ? (
        <p className="mt-2 text-sm leading-normal text-[#1a1f2b]">{first.description}</p>
      ) : null}
    </li>
  )
}

/** Right-side drawer to review past Shortlist decisions and move courses between them. */
export default function ReviewPanel({ initialDecision, groups, term, counts, onDecide, onClose }) {
  const [decision, setDecision] = useState(initialDecision)
  const [query, setQuery] = useState('')
  const items = reviewList(groups, term.decisions, decision, query)
  const tabCounts = { yes: counts.yes, maybe: counts.maybe, no: counts.no }

  useEffect(() => {
    function handleKey(event) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-black/35" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Review decisions"
        onClick={(event) => event.stopPropagation()}
        className="flex h-full w-[min(36rem,100vw)] flex-col bg-white shadow-2xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#dde3ea] px-5 py-3">
          <h2 className="text-base font-bold">Review decisions</h2>
          <button
            type="button"
            onClick={onClose}
            className="h-8 rounded-md border border-[#c5ced9] px-3 text-sm font-medium text-[#1a1f2b] hover:bg-yale-50"
          >
            Close
          </button>
        </div>

        <div className="flex shrink-0 flex-col gap-3 border-b border-[#dde3ea] px-5 py-3">
          <div role="tablist" className="grid grid-cols-3 rounded-md border border-[#c5ced9] p-0.5">
            {TABS.map((t) => {
              const active = t.decision === decision
              return (
                <button
                  key={t.decision}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setDecision(t.decision)}
                  className={`rounded px-2 py-1.5 text-sm font-medium ${
                    active ? 'bg-yale-800 text-white' : 'text-[#1a1f2b] hover:bg-yale-50'
                  }`}
                >
                  {t.label} <span className="tabular-nums opacity-80">{tabCounts[t.decision]}</span>
                </button>
              )
            })}
          </div>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search number, title or professor"
            aria-label="Search decided courses"
            className="h-9 rounded-md border border-[#c5ced9] bg-[#f5f7fa] px-2.5 text-sm focus:border-yale-800 focus:bg-white focus:outline-none"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5">
          {items.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#5b6576]">
              {query ? 'No matching courses.' : 'No courses here yet.'}
            </p>
          ) : (
            <ul>
              {items.map((group) => (
                <ReviewItem key={group.key} group={group} decision={decision} onDecide={onDecide} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
