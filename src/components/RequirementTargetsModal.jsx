import { useEffect, useId, useState } from 'react'
import {
  REQUIREMENT_TAG_CODES,
  REQUIREMENT_TAG_LABELS,
} from '../lib/requirementTags'
import { normalizeRequirementTargets } from '../lib/requirementTargets'
import { TagDisclaimer } from './Disclaimer'
import RequirementTag from './RequirementTag'

/**
 * @param {Record<string, string>} draft
 * @param {RequirementTargets} targets
 */
function draftFromTargets(targets) {
  /** @type {Record<string, string>} */
  const draft = {}
  for (const code of REQUIREMENT_TAG_CODES) {
    const value = targets[code]
    draft[code] = value != null && value > 0 ? String(value) : ''
  }
  return draft
}

/**
 * @param {Record<string, string>} draft
 */
function targetsFromDraft(draft) {
  /** @type {import('../lib/requirementTargets.js').RequirementTargets} */
  const next = {}
  for (const code of REQUIREMENT_TAG_CODES) {
    const raw = draft[code]?.trim()
    if (!raw) continue
    const n = Number(raw)
    if (!Number.isFinite(n) || n <= 0) continue
    next[code] = n
  }
  return normalizeRequirementTargets(next)
}

export default function RequirementTargetsModal({
  open,
  targets,
  onClose,
  onSave,
}) {
  const titleId = useId()
  const [draft, setDraft] = useState(() => draftFromTargets(targets))

  useEffect(() => {
    if (open) setDraft(draftFromTargets(targets))
  }, [open, targets])

  if (!open) return null

  const handleSubmit = (event) => {
    event.preventDefault()
    onSave(targetsFromDraft(draft))
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
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
              Enter units needed per requirement. Only rows with a target show
              in your overview.
            </p>
          </div>

          <div className="px-4 pb-2 pt-2">
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
              {REQUIREMENT_TAG_CODES.map((tagCode) => {
                const label = REQUIREMENT_TAG_LABELS[tagCode] ?? tagCode
                const hasValue = (draft[tagCode] ?? '').trim() !== ''
                return (
                  <li
                    key={tagCode}
                    className="flex items-center justify-between gap-2 border-b border-gray-100 py-1.5 last:border-b-0"
                  >
                    <RequirementTag tagCode={tagCode} />
                    <div className="flex shrink-0 items-center gap-0.5">
                      <label
                        className="sr-only"
                        htmlFor={`req-target-${tagCode}`}
                      >
                        Target units for {label}
                      </label>
                      <input
                        id={`req-target-${tagCode}`}
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.5"
                        placeholder="—"
                        value={draft[tagCode] ?? ''}
                        onChange={(event) =>
                          setDraft((prev) => ({
                            ...prev,
                            [tagCode]: event.target.value,
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
                            [tagCode]: '',
                          }))
                        }
                        aria-label={`Clear ${label}`}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-gray-200 text-sm font-medium leading-none text-gray-500 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800 disabled:cursor-not-allowed disabled:border-transparent disabled:opacity-25"
                      >
                        <span aria-hidden>−</span>
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
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
