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
  { id: 'shortlist', number: 1, label: 'Shortlist', short: 'Shortlist' },
  { id: 'score', number: 2, label: 'Score and rank', short: 'Score' },
]

/**
 * Compare mode: "1 Shortlist › 2 Score and rank". The inactive step shows a
 * grey count ("98 left" / "8 courses"); phones get two equal tabs instead.
 */
export function CompareStepTabs({ step, onStepChange, leftCount, shortlistCount }) {
  const hints = {
    shortlist: step === 'score' ? `${leftCount} left` : null,
    score: step === 'shortlist' ? `${shortlistCount} courses` : null,
  }
  return (
    <ol
      className="-mx-4 grid w-[calc(100%+2rem)] grid-cols-2 self-stretch sm:mx-0 sm:flex sm:w-auto sm:flex-wrap sm:gap-2"
      aria-label="Compare steps"
    >
      {STEPS.map((s, i) => {
        const active = s.id === step
        return (
          <li key={s.id} className="flex items-stretch gap-2">
            {i > 0 ? (
              <span aria-hidden className="hidden items-center text-[#8a95a5] sm:flex">
                ›
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => onStepChange(s.id)}
              aria-current={active ? 'step' : undefined}
              className={`flex flex-1 items-center justify-center gap-2 border-b-[3px] px-3 pt-4 pb-[13px] text-sm sm:flex-none ${
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
              <span className="sm:hidden">
                {s.short}
                {s.id === 'score' ? (
                  <span className="font-normal text-[#5b6576]"> · {shortlistCount}</span>
                ) : null}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
              {hints[s.id] ? (
                <span className="hidden font-normal text-[#5b6576] sm:inline">{hints[s.id]}</span>
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
