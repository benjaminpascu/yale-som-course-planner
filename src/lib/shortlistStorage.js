/**
 * Shortlist: course sections a student starred, one list per semester,
 * shared by every plan. Saved in this browser. IDs are never checked against
 * the catalog, so other schools' courses (which load later) keep their stars.
 *
 * Store: { version: 1, terms: { [termCode]: courseId[] } }
 */
export const SHORTLIST_STORAGE_KEY = 'yale-som-course-planner-shortlist'
const STORE_VERSION = 1

export function createEmptyShortlistStore() {
  return { version: STORE_VERSION, terms: {} }
}

function normalizeStore(raw) {
  if (!raw || typeof raw !== 'object' || !raw.terms || typeof raw.terms !== 'object') {
    return createEmptyShortlistStore()
  }
  const terms = {}
  for (const [termCode, ids] of Object.entries(raw.terms)) {
    if (!Array.isArray(ids)) continue
    terms[termCode] = [...new Set(ids.filter((id) => typeof id === 'string' && id))]
  }
  return { version: STORE_VERSION, terms }
}

export function loadShortlistStore(storage = globalThis.localStorage) {
  try {
    const raw = storage.getItem(SHORTLIST_STORAGE_KEY)
    return raw ? normalizeStore(JSON.parse(raw)) : createEmptyShortlistStore()
  } catch {
    return createEmptyShortlistStore()
  }
}

export function persistShortlistStore(store, storage = globalThis.localStorage) {
  try {
    storage.setItem(SHORTLIST_STORAGE_KEY, JSON.stringify(store))
  } catch {
    // Storage blocked: stars last until the page is closed.
  }
}

export function getShortlist(store, termCode) {
  return store.terms[termCode] ?? []
}

/** Stars the course if it isn't starred in that semester, otherwise unstars it. */
export function toggleShortlisted(store, termCode, courseId) {
  const ids = getShortlist(store, termCode)
  const next = ids.includes(courseId) ? ids.filter((id) => id !== courseId) : [...ids, courseId]
  return { ...store, terms: { ...store.terms, [termCode]: next } }
}
