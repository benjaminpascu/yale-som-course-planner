import { REQUIREMENT_TAG_CODES } from './requirementTags.js'

const STORAGE_KEY = 'yale-som-course-planner-requirement-targets'

const VALID_TAG_SET = new Set(REQUIREMENT_TAG_CODES)

/**
 * @typedef {Partial<Record<string, number>>} RequirementTargets
 */

/** @returns {RequirementTargets} */
export function createEmptyRequirementTargets() {
  return {}
}

/**
 * @param {unknown} raw
 * @returns {RequirementTargets}
 */
export function normalizeRequirementTargets(raw) {
  if (!raw || typeof raw !== 'object') return createEmptyRequirementTargets()

  /** @type {RequirementTargets} */
  const out = {}
  for (const [key, value] of Object.entries(raw)) {
    if (!VALID_TAG_SET.has(key)) continue
    const n = typeof value === 'number' ? value : Number(value)
    if (!Number.isFinite(n) || n <= 0) continue
    out[key] = n
  }
  return out
}

/** @returns {RequirementTargets} */
export function loadRequirementTargets() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createEmptyRequirementTargets()
    return normalizeRequirementTargets(JSON.parse(raw))
  } catch {
    return createEmptyRequirementTargets()
  }
}

/** @param {RequirementTargets} targets */
export function persistRequirementTargets(targets) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeRequirementTargets(targets)))
}

/**
 * @param {RequirementTargets} targets
 * @returns {string[]}
 */
export function configuredTargetTagCodes(targets) {
  return REQUIREMENT_TAG_CODES.filter((code) => (targets[code] ?? 0) > 0)
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
