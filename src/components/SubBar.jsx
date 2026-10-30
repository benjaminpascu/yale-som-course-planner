/** White bar under the nav bar; its content depends on the mode. */
export function SubBar({ children, className = '' }) {
  return (
    <div
      className={`shrink-0 border-b border-[#dde3ea] bg-white px-4 sm:px-8 ${className}`}
    >
      <div className="flex min-h-14 flex-wrap items-center justify-between gap-x-6 gap-y-2">
        {children}
      </div>
    </div>
  )
}

const STEPS = [
  { id: 'shortlist', number: 1, label: 'Shortlist' },
  { id: 'score', number: 2, label: 'Score and rank' },
]

/** Compare mode: "1 Shortlist › 2 Score and rank". `hints` adds grey counts per step. */
export function CompareStepTabs({ step, onStepChange, hints = {} }) {
  return (
    <ol className="flex flex-wrap items-stretch gap-2 self-stretch" aria-label="Compare steps">
      {STEPS.map((s, i) => {
        const active = s.id === step
        return (
          <li key={s.id} className="flex items-stretch gap-2">
            {i > 0 ? (
              <span aria-hidden className="flex items-center text-[#8a95a5]">
                ›
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => onStepChange(s.id)}
              aria-current={active ? 'step' : undefined}
              className={`flex items-center gap-2 border-b-[3px] px-3 pt-4 pb-[13px] text-sm ${
                active
                  ? 'border-yale-800 font-bold text-yale-800'
                  : 'border-transparent font-semibold text-[#1a1f2b] hover:text-yale-800'
              }`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  active ? 'bg-yale-800 text-white' : 'bg-[#e3ebf5] text-yale-800'
                }`}
              >
                {s.number}
              </span>
              {s.label}
              {hints[s.id] ? (
                <span className="font-normal text-[#5b6576]">{hints[s.id]}</span>
              ) : null}
            </button>
          </li>
        )
      })}
    </ol>
  )
}

/** Fall / Spring switch for the sub bar. */
export function TermSwitch({ terms, termCode, onTermChange }) {
  if (terms.length < 2) return null
  return (
    <div
      role="group"
      aria-label="Term"
      className="inline-flex rounded-md border border-[#c5ced9] bg-white p-0.5"
    >
      {terms.map((term) => {
        const active = term.id === termCode
        return (
          <button
            key={term.id}
            type="button"
            aria-pressed={active}
            onClick={() => onTermChange(term.id)}
            className={`rounded px-3 py-1.5 text-sm font-medium ${
              active ? 'bg-yale-800 text-white' : 'text-[#1a1f2b] hover:bg-yale-50'
            }`}
          >
            {term.label}
          </button>
        )
      })}
    </div>
  )
}
