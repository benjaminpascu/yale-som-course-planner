const STORAGE_KEY = 'yale-som-course-planner-requirement-targets'

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
 * @param {Iterable<string>} [knownTags]
 * @returns {RequirementTargets}
 */
export function loadRequirementTargets(knownTags) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createEmptyRequirementTargets()
    return normalizeRequirementTargets(JSON.parse(raw), knownTags)
  } catch {
    return createEmptyRequirementTargets()
  }
}

/**
 * @param {RequirementTargets} targets
 * @param {Iterable<string>} [knownTags]
 */
export function persistRequirementTargets(targets, knownTags) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(normalizeRequirementTargets(targets, knownTags)),
  )
}

/**
 * @param {RequirementTargets} targets
 * @param {string[]} knownTags
 * @returns {string[]}
 */
export function configuredTargetTagCodes(targets, knownTags) {
  return knownTags.filter((name) => (targets[name] ?? 0) > 0)
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
