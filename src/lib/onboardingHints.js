/**
 * First-visit tips: which ones this browser has already seen, and which single tip
 * to show next. Tips appear one at a time, in order; the Help button clears them all.
 */
export const HINTS_STORAGE_KEY = 'yale-som-course-planner-hints'

/**
 * Plan tips in the order they appear. `phone-courses` and `save-plan` are phone-only;
 * `your-plan`, `plans-menu`, `compare-plans` and `term-switch` are computer-only.
 */
export const PLANNER_HINTS = [
  'phone-courses',
  'add-course',
  'clash',
  'calendar-details',
  'set-targets',
  'requirements',
  'your-plan',
  'plans-menu',
  'save-plan',
  'compare-plans',
  'term-switch',
]
const NEEDS_A_COURSE = new Set([
  'calendar-details',
  'set-targets',
  'requirements',
  'your-plan',
  'plans-menu',
  'compare-plans',
  'term-switch',
])
const PHONE_ONLY = new Set(['phone-courses', 'save-plan'])
const COMPUTER_ONLY = new Set(['your-plan', 'plans-menu', 'compare-plans', 'term-switch'])
export const COMPARE_INTRO = 'compare-intro'

export function loadSeenHints(storage = globalThis.localStorage) {
  try {
    const raw = JSON.parse(storage.getItem(HINTS_STORAGE_KEY) ?? '[]')
    return new Set(Array.isArray(raw) ? raw.filter((id) => typeof id === 'string') : [])
  } catch {
    return new Set()
  }
}

export function persistSeenHints(seen, storage = globalThis.localStorage) {
  try {
    storage.setItem(HINTS_STORAGE_KEY, JSON.stringify([...seen]))
  } catch {
    // Storage blocked: tips just come back next visit.
  }
}

/**
 * The Planner tip to show now, or null. A tip whose moment hasn't come yet
 * (e.g. the clash tip before any course is added) holds back the ones after it.
 */
export function nextPlannerHint({ seen, selectedCount, hasPlan, phone, hasConflict = false }) {
  for (const id of PLANNER_HINTS) {
    if (seen.has(id)) continue
    // Only worth saying once a Conflict label is on screen; until then the others go ahead.
    if (id === 'clash' && !hasConflict) continue
    if (PHONE_ONLY.has(id) && !phone) continue
    if (COMPUTER_ONLY.has(id) && phone) continue
    if (NEEDS_A_COURSE.has(id) && selectedCount < 1) return null
    if (id === 'save-plan' && (selectedCount < 3 || hasPlan)) return null
    return id
  }
  return null
}

/**
 * Compare tips, after the intro box. Each step has its own sequence; both start with
 * two tips on the "1 Shortlist" / "2 Score and rank" tabs (this step, then the other).
 */
const STEP_TAB_HINTS = new Set(['cmp-here-shortlist', 'cmp-next-score', 'cmp-here-score', 'cmp-back-shortlist'])
export const SHORTLIST_HINTS = ['cmp-here-shortlist', 'cmp-next-score', 'cmp-decide', 'cmp-undo', 'cmp-review']
export const SCORE_HINTS = [
  'cmp-here-score',
  'cmp-back-shortlist',
  'cmp-rate',
  'cmp-weights',
  'cmp-add-criterion',
  'cmp-open-course',
  'cmp-ranking',
]

/** The Compare tip to show now, or null; same hold-back rule as the Planner tips. */
export function nextCompareHint({ seen, step, hasCard, decided, canUndo, shortlistCount }) {
  if (!seen.has(COMPARE_INTRO)) return null
  if (step === 'shortlist') {
    for (const id of SHORTLIST_HINTS) {
      if (seen.has(id)) continue
      if (STEP_TAB_HINTS.has(id)) return id
      if (!hasCard) return null
      if (id === 'cmp-undo' && !canUndo) return null
      if (id === 'cmp-review' && decided < 3) return null
      return id
    }
    return null
  }
  const next = SCORE_HINTS.find((id) => !seen.has(id)) ?? null
  if (next && !STEP_TAB_HINTS.has(next) && shortlistCount === 0) return null
  return next
}
