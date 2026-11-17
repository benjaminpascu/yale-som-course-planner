import { useEffect, useId, useRef, useState } from 'react'
import { parseUnitCount } from '../lib/requirementSettings'

/** Editable copy: numbers as text so the boxes can be empty. */
function draftFromNonSom(nonSom) {
  const bySchool = {}
  for (const [code, units] of Object.entries(nonSom?.bySchool ?? {})) bySchool[code] = String(units)
  return { units: String(nonSom?.units ?? 0), bySchool }
}

function nonSomFromDraft(draft) {
  const bySchool = {}
  for (const [code, text] of Object.entries(draft.bySchool)) {
    const n = parseUnitCount(text)
    if (n != null) bySchool[code] = n
  }
  return { units: parseUnitCount(draft.units) ?? 0, bySchool }
}

/** "label ... [ 2 ] units". */
function UnitLine({ id, label, value, placeholder, onChange, inputRef, indent = false }) {
  return (
    <li className={`flex items-center gap-3 border-b border-gray-100 py-2 last:border-b-0 ${indent ? 'pl-4' : ''}`}>
      <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer text-sm text-gray-900">
        {label}
      </label>
      <span className="flex shrink-0 items-center gap-1.5 text-xs text-gray-600">
        <input
          ref={inputRef}
          id={id}
          // Plain text box (no up/down arrows); anything that isn't zero or more is ignored.
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-16 rounded border border-gray-300 px-2 py-1 text-right text-sm tabular-nums text-gray-900 placeholder:text-gray-400 focus:border-yale-600 focus:outline-none focus:ring-1 focus:ring-yale-600"
        />
        units
      </span>
    </li>
  )
}

/**
 * Non-SOM Units: how many SOM units one course from another school counts.
 * "All schools" applies to every non-SOM course; each school in the plan gets its
 * own line, and a blank line uses the All schools number. Numbers for schools not
 * listed are kept as they were.
 *
 * @param {{
 *   open: boolean,
 *   nonSom: { units: number, bySchool: Record<string, number> },
 *   schools: { id: string, label: string }[],
 *   onClose: () => void,
 *   onSave: (nonSom: { units: number, bySchool: Record<string, number> }) => void,
 * }} props
 */
export default function NonSomUnitsModal({ open, nonSom, schools = [], onClose, onSave }) {
  const titleId = useId()
  const [draft, setDraft] = useState(() => draftFromNonSom(nonSom))
  const firstInputRef = useRef(null)

  useEffect(() => {
    if (!open) return
    setDraft(draftFromNonSom(nonSom))
    firstInputRef.current?.focus()
    firstInputRef.current?.select()
  }, [open, nonSom])

  if (!open) return null

  const handleSubmit = (event) => {
    event.preventDefault()
    onSave(nonSomFromDraft(draft))
    onClose()
  }

  const allSchoolsPlaceholder = String(parseUnitCount(draft.units) ?? 0)

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center p-4 pb-[calc(3rem+env(safe-area-inset-bottom)+1rem)] lg:items-center lg:pb-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40" aria-hidden />
      <div
        className="relative z-10 flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="border-b border-gray-200 px-4 py-2.5">
            <h2 id={titleId} className="text-sm font-semibold text-gray-900">
              Non-SOM Units
            </h2>
          </div>

          <div className="px-4 pb-2 pt-3">
            <p className="mb-2 text-xs leading-snug text-gray-600">
              How many SOM units one course from each school counts for you.
            </p>
            <ul>
              <UnitLine
                id="non-som-all"
                label="All schools"
                value={draft.units}
                placeholder="0"
                inputRef={firstInputRef}
                onChange={(units) => setDraft((d) => ({ ...d, units }))}
              />
              {schools.map((school) => (
                <UnitLine
                  key={school.id}
                  id={`non-som-${school.id}`}
                  label={school.label}
                  value={draft.bySchool[school.id] ?? ''}
                  placeholder={allSchoolsPlaceholder}
                  indent
                  onChange={(value) =>
                    setDraft((d) => ({ ...d, bySchool: { ...d.bySchool, [school.id]: value } }))
                  }
                />
              ))}
            </ul>
          </div>

          <div className="border-t border-gray-200 bg-gray-50 px-4 py-2.5">
            {/* Same look as the note at the bottom of Select Requirements. */}
            <p className="text-[11px] leading-snug text-amber-900/90">
              Check with the registrar how courses from other schools count toward your SOM units.
            </p>
            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded bg-yale-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-yale-800"
              >
                Save
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
