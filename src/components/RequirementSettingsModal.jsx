import { useEffect, useId, useState } from 'react'
import { TagDisclaimer } from './Disclaimer'
import RequirementTag from './RequirementTag'

/** Editable copy of the settings: targets as text so the boxes can be empty. */
function draftFromSettings(settings, tagNames) {
  const line = (l) => ({ on: Boolean(l?.on), target: l?.target ? String(l.target) : '' })
  const tags = {}
  for (const name of tagNames) tags[name] = line(settings.tags[name])
  return { semester: line(settings.semester), year: line(settings.year), tags }
}

function settingsFromDraft(draft) {
  const line = (l) => {
    const n = Number(l.target.trim())
    return { on: l.on, target: l.target.trim() && Number.isFinite(n) && n > 0 ? n : null }
  }
  const tags = {}
  for (const [name, l] of Object.entries(draft.tags)) tags[name] = line(l)
  return { semester: line(draft.semester), year: line(draft.year), tags }
}

/** One tickable line with its optional target ("target [ 8 ] units"). */
function SettingLine({ id, label, line, onChange }) {
  return (
    <li className="flex items-center gap-3 border-b border-gray-100 py-2 last:border-b-0">
      <input
        id={`${id}-on`}
        type="checkbox"
        checked={line.on}
        onChange={(e) => onChange({ ...line, on: e.target.checked })}
        className="h-4 w-4 shrink-0 cursor-pointer accent-yale-800"
      />
      <label htmlFor={`${id}-on`} className="min-w-0 flex-1 cursor-pointer text-sm text-gray-900">
        {label}
      </label>
      <span className={`flex shrink-0 items-center gap-1.5 text-xs ${line.on ? 'text-gray-600' : 'text-gray-400'}`}>
        <label htmlFor={`${id}-target`}>target</label>
        <input
          id={`${id}-target`}
          // Plain text box (no up/down arrows); anything that isn't a positive number is ignored.
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="—"
          disabled={!line.on}
          value={line.target}
          onChange={(e) => onChange({ ...line, target: e.target.value })}
          className="w-16 rounded border border-gray-300 px-2 py-1 text-right text-sm tabular-nums text-gray-900 focus:border-yale-600 focus:outline-none focus:ring-1 focus:ring-yale-600 disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
        />
        units
      </span>
    </li>
  )
}

/**
 * Select Requirements: tick which totals and requirements the Requirements bar
 * shows, and set an optional unit target for each.
 */
export default function RequirementSettingsModal({ open, settings, tagNames = [], onClose, onSave }) {
  const titleId = useId()
  const [draft, setDraft] = useState(() => draftFromSettings(settings, tagNames))

  useEffect(() => {
    if (open) setDraft(draftFromSettings(settings, tagNames))
  }, [open, settings, tagNames])

  if (!open) return null

  const handleSubmit = (event) => {
    event.preventDefault()
    onSave(settingsFromDraft(draft))
    onClose()
  }

  const sectionTitle = 'mb-1 text-[11px] font-semibold uppercase tracking-wide text-yale-700'

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
              Select Requirements
            </h2>
          </div>

          <div className="px-4 pt-3">
            <p className={sectionTitle}>Totals</p>
            <ul>
              <SettingLine
                id="req-semester"
                label="Semester Total"
                line={draft.semester}
                onChange={(semester) => setDraft((d) => ({ ...d, semester }))}
              />
              <SettingLine
                id="req-year"
                label="Year Total"
                line={draft.year}
                onChange={(year) => setDraft((d) => ({ ...d, year }))}
              />
            </ul>
          </div>

          <div className="px-4 pb-2 pt-3">
            <p className={sectionTitle}>Requirements</p>
            {tagNames.length === 0 ? (
              <p className="py-2 text-sm text-gray-600">No requirements in this catalog yet.</p>
            ) : (
              <ul>
                {tagNames.map((name) => (
                  <SettingLine
                    key={name}
                    id={`req-tag-${name.replace(/\W+/g, '-')}`}
                    label={<RequirementTag tagCode={name} />}
                    line={draft.tags[name]}
                    onChange={(line) =>
                      setDraft((d) => ({ ...d, tags: { ...d.tags, [name]: line } }))
                    }
                  />
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-gray-200 bg-gray-50 px-4 py-2.5">
            <TagDisclaimer className="text-[11px] leading-snug" />
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
