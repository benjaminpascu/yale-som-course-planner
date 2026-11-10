/**
 * Select Requirements: which lines the Requirements bar shows (Semester Total,
 * Year Total, and each requirement tag from the catalog) and an optional unit
 * target for each. Saved in this browser and shared by every plan.
 */
import { normalizeRequirementTargets, REQUIREMENT_TARGETS_KEY } from './requirementTargets.js'
import { computePlanUnitTotal, computeTagUnitTotals, courseSemester } from './tagUnitTracker.js'

export const REQUIREMENT_SETTINGS_KEY = 'yale-som-course-planner-requirements'

/** Semester Total on, Year Total off, no requirements (most MBAs need none). */
export function defaultRequirementSettings() {
  return {
    semester: { on: true, target: null },
    year: { on: false, target: null },
    tags: {},
  }
}

function normalizeTarget(value) {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) && n > 0 ? n : null
}

function normalizeLine(raw, fallbackOn) {
  if (!raw || typeof raw !== 'object') return { on: fallbackOn, target: null }
  return { on: raw.on === true, target: normalizeTarget(raw.target) }
}

/** Clean saved data: unknown requirements and bad targets are dropped. */
export function normalizeRequirementSettings(raw, knownTags) {
  if (!raw || typeof raw !== 'object') return defaultRequirementSettings()
  const known = new Set(knownTags)
  const tags = {}
  for (const [name, line] of Object.entries(raw.tags ?? {})) {
    if (!known.has(name)) continue
    tags[name] = normalizeLine(line, false)
  }
  return {
    semester: normalizeLine(raw.semester, true),
    year: normalizeLine(raw.year, false),
    tags,
  }
}

/**
 * Saved choices, or (first time) the defaults with every requirement that already
 * had a target ticked, so nobody's setup disappears.
 */
export function loadRequirementSettings(knownTags, storage = globalThis.localStorage) {
  try {
    const saved = storage.getItem(REQUIREMENT_SETTINGS_KEY)
    if (saved) return normalizeRequirementSettings(JSON.parse(saved), knownTags)
  } catch {
    return defaultRequirementSettings()
  }
  const settings = defaultRequirementSettings()
  try {
    const old = normalizeRequirementTargets(
      JSON.parse(storage.getItem(REQUIREMENT_TARGETS_KEY) ?? '{}'),
      knownTags,
    )
    for (const [name, target] of Object.entries(old)) settings.tags[name] = { on: true, target }
  } catch {
    // Old targets unreadable: start from the defaults.
  }
  return settings
}

export function persistRequirementSettings(settings, knownTags, storage = globalThis.localStorage) {
  try {
    storage.setItem(
      REQUIREMENT_SETTINGS_KEY,
      JSON.stringify(normalizeRequirementSettings(settings, knownTags)),
    )
  } catch {
    // Storage blocked: choices last until the page is closed.
  }
}

/**
 * The Requirements bar's lines, in order: Semester, Year, then ticked requirements
 * in catalog order. Semester and requirements count the semester being viewed;
 * Year counts the whole plan.
 */
export function requirementRows({ planCourses, semester, tagNames, settings }) {
  const semesterCourses = planCourses.filter((c) => courseSemester(c) === semester)
  const rows = []
  if (settings.semester.on) {
    rows.push({ ...computePlanUnitTotal(semesterCourses, 'Semester'), targetUnits: settings.semester.target })
  }
  if (settings.year.on) {
    rows.push({ ...computePlanUnitTotal(planCourses, 'Year'), targetUnits: settings.year.target })
  }
  const ticked = tagNames.filter((name) => settings.tags[name]?.on)
  for (const row of computeTagUnitTotals(semesterCourses, ticked)) {
    rows.push({ ...row, targetUnits: settings.tags[row.tagCode].target })
  }
  return rows
}
