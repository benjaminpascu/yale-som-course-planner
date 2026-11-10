/** Old (pre Nov 2026) per-requirement targets; read once to tick those requirements in Select Requirements. */
export const REQUIREMENT_TARGETS_KEY = 'yale-som-course-planner-requirement-targets'

/**
 * @typedef {Partial<Record<string, number>>} RequirementTargets
 */

/** @returns {RequirementTargets} */
export function createEmptyRequirementTargets() {
  return {}
}

/**
 * @param {unknown} raw
 * @param {Iterable<string>} [knownTags] — when provided, drop targets for unknown names
 * @returns {RequirementTargets}
 */
export function normalizeRequirementTargets(raw, knownTags) {
  if (!raw || typeof raw !== 'object') return createEmptyRequirementTargets()

  const known =
    knownTags == null ? null : new Set([...knownTags].map((t) => String(t)))

  /** @type {RequirementTargets} */
  const out = {}
  for (const [key, value] of Object.entries(raw)) {
    const name = key.trim()
    if (!name) continue
    if (known && !known.has(name)) continue
    const n = typeof value === 'number' ? value : Number(value)
    if (!Number.isFinite(n) || n <= 0) continue
    out[name] = n
  }
  return out
}

/**
 * Compact progress label, e.g. `2 / 6 units`.
 *
 * @param {number} earned
 * @param {number} target
 */
export function formatRequirementProgress(earned, target) {
  const earnedLabel = earned === 1 ? '1' : String(earned)
  const targetLabel = target === 1 ? '1' : String(target)
  const unitWord = target === 1 ? 'unit' : 'units'
  return `${earnedLabel} / ${targetLabel} ${unitWord}`
}
