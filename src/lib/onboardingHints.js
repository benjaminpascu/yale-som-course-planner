/**
 * First-visit tips: which ones this browser has already seen, and which single tip
 * to show next. Tips appear one at a time, in order; the Help button clears them all.
 */
export const HINTS_STORAGE_KEY = 'yale-som-course-planner-hints'

/**
 * Planner tips in the order they appear. `phone-courses` is phone-only; `your-plan`
 * is computer-only (phones manage the plan in the Plans tab).
 */
export const PLANNER_HINTS = [
  'phone-courses',
  'add-course',
  'clash',
  'calendar-details',
  'requirements',
  'set-targets',
  'your-plan',
  'save-plan',
]
const NEEDS_A_COURSE = new Set(['clash', 'calendar-details', 'requirements', 'set-targets', 'your-plan'])
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
export function nextPlannerHint({ seen, selectedCount, hasPlan, phone }) {
  for (const id of PLANNER_HINTS) {
    if (seen.has(id)) continue
    if (id === 'phone-courses' && !phone) continue
    if (id === 'your-plan' && phone) continue
    if (NEEDS_A_COURSE.has(id) && selectedCount < 1) return null
    if (id === 'save-plan' && (selectedCount < 3 || hasPlan)) return null
    return id
  }
  return null
}
