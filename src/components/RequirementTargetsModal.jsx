import { useEffect, useId, useState } from 'react'
import { normalizeRequirementTargets } from '../lib/requirementTargets'
import { TagDisclaimer } from './Disclaimer'
import RequirementTag from './RequirementTag'

/**
 * @param {Record<string, string>} draft
 * @param {import('../lib/requirementTargets.js').RequirementTargets} targets
 * @param {string[]} tagNames
 */
function draftFromTargets(targets, tagNames) {
  /** @type {Record<string, string>} */
  const draft = {}
  for (const name of tagNames) {
    const value = targets[name]
    draft[name] = value != null && value > 0 ? String(value) : ''
  }
  return draft
}

/**
 * @param {Record<string, string>} draft
 * @param {string[]} tagNames
 */
function targetsFromDraft(draft, tagNames) {
  /** @type {import('../lib/requirementTargets.js').RequirementTargets} */
  const next = {}
  for (const name of tagNames) {
    const raw = draft[name]?.trim()
    if (!raw) continue
    const n = Number(raw)
    if (!Number.isFinite(n) || n <= 0) continue
    next[name] = n
  }
  return normalizeRequirementTargets(next, tagNames)
}

export default function RequirementTargetsModal({
  open,
  targets,
  tagNames = [],
  onClose,
  onSave,
}) {
  const titleId = useId()
  const [draft, setDraft] = useState(() => draftFromTargets(targets, tagNames))

  useEffect(() => {
    if (open) setDraft(draftFromTargets(targets, tagNames))
  }, [open, targets, tagNames])

  if (!open) return null

  const handleSubmit = (event) => {
    event.preventDefault()
    onSave(targetsFromDraft(draft, tagNames))
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center p-4 pb-[calc(3rem+env(safe-area-inset-bottom)+1rem)] lg:items-center lg:pb-4"
      onClick={onClose}
      aria-hidden={false}
    >
      <div
        className="absolute inset-0 bg-black/40"
        aria-hidden
      />
      <div
        className="relative z-10 flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-2xl sm:max-h-none sm:overflow-visible"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="border-b border-gray-200 px-4 py-2.5">
            <h2 id={titleId} className="text-sm font-semibold text-gray-900">
              Requirement targets
            </h2>
            <p className="mt-0.5 text-xs leading-snug text-gray-600">
              Optional unit targets for progress (e.g. 2 / 6). All tags from the
              catalog always appear in the overview.
            </p>
          </div>

          <div className="px-4 pb-2 pt-2">
            {tagNames.length === 0 ? (
              <p className="py-3 text-sm text-gray-600">
                No requirement tags in this catalog yet.
              </p>
            ) : (
              <>
                <div
                  className="flex items-end justify-between gap-2 border-b border-gray-200 pb-1"
                  aria-hidden
                >
                  <span className="min-w-0 text-xs font-bold text-gray-900">
                    Requirement
                  </span>
                  <div className="flex shrink-0 items-end gap-0.5">
                    <span className="w-[4.5rem] text-center text-xs font-bold text-gray-900">
                      Units
                    </span>
                    <span className="w-7 shrink-0" />
                  </div>
                </div>
                <ul>
                  {tagNames.map((tagName) => {
                    const hasValue = (draft[tagName] ?? '').trim() !== ''
                    return (
                      <li
                        key={tagName}
                        className="flex items-center justify-between gap-2 border-b border-gray-100 py-1.5 last:border-b-0"
                      >
                        <RequirementTag tagCode={tagName} />
                        <div className="flex shrink-0 items-center gap-0.5">
                          <label
                            className="sr-only"
                            htmlFor={`req-target-${tagName}`}
                          >
                            Target units for {tagName}
                          </label>
                          <input
                            id={`req-target-${tagName}`}
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="0.5"
                            placeholder="—"
                            value={draft[tagName] ?? ''}
                            onChange={(event) =>
                              setDraft((prev) => ({
                                ...prev,
                                [tagName]: event.target.value,
                              }))
                            }
                            className="w-[4.5rem] rounded border border-gray-300 px-2 py-1 text-right text-sm tabular-nums text-gray-900 focus:border-yale-600 focus:outline-none focus:ring-1 focus:ring-yale-600"
                          />
                          <button
                            type="button"
                            disabled={!hasValue}
                            onClick={() =>
                              setDraft((prev) => ({
                                ...prev,
                                [tagName]: '',
                              }))
                            }
                            aria-label={`Clear ${tagName}`}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-gray-200 text-sm font-medium leading-none text-gray-500 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800 disabled:cursor-not-allowed disabled:border-transparent disabled:opacity-25"
                          >
                            <span aria-hidden>−</span>
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </>
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
