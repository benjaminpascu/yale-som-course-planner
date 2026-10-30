import { useRef, useState } from 'react'
import { professorValue, scoreColor } from '../../lib/compareScoring'
import { setProfessorNote, setProfessorRating } from '../../lib/compareStorage'
import Popover from './Popover'
import ScoreInput from './ScoreInput'

/** First professor (+N) with the course's professor rating; click to rate. */
export default function ProfessorCell({ professors, ratings, update }) {
  const [open, setOpen] = useState(false)
  const anchorRef = useRef(null)
  const value = professorValue(professors, ratings)

  if (professors.length === 0) {
    return <span className="text-gray-400">TBA</span>
  }

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex max-w-[13rem] items-center gap-2 rounded px-1 py-0.5 text-left hover:bg-gray-50"
      >
        <span
          className="flex h-8 w-11 shrink-0 items-center justify-center rounded border border-gray-200 text-sm font-semibold tabular-nums text-gray-900"
          style={{ backgroundColor: scoreColor(value) ?? undefined }}
        >
          {value ?? ''}
        </span>
        <span className="min-w-0 truncate text-xs text-gray-700">
          {professors[0]}
          {professors.length > 1 ? (
            <span className="text-gray-400"> +{professors.length - 1}</span>
          ) : null}
        </span>
      </button>
      {open ? (
        <Popover
          anchorRef={anchorRef}
          onClose={() => setOpen(false)}
          width={320}
          label="Rate professors"
        >
          <ul className="space-y-3">
            {professors.map((name) => (
              <li key={name} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <ScoreInput
                    value={ratings[name]?.rating ?? null}
                    onCommit={(v) => update((s) => setProfessorRating(s, name, v))}
                    ariaLabel={`Rating for ${name}`}
                  />
                  <span className="font-medium text-gray-900">{name}</span>
                </div>
                <input
                  type="text"
                  defaultValue={ratings[name]?.note ?? ''}
                  onChange={(e) => update((s) => setProfessorNote(s, name, e.target.value))}
                  placeholder="Note"
                  aria-label={`Note for ${name}`}
                  className="w-full rounded border border-gray-200 px-2 py-1 text-xs focus:border-yale-800 focus:outline-none"
                />
              </li>
            ))}
          </ul>
        </Popover>
      ) : null}
    </>
  )
}
