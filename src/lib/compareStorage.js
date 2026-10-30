/**
 * Compare Courses data in localStorage, kept separately per term. All
 * updaters are pure (return a new store). Data for courses missing from the
 * catalog is kept, never pruned.
 *
 * Store: { version: 2, terms: { [termCode]: TermData } }
 * TermData: {
 *   decisions: { [courseKey]: 'yes' | 'maybe' | 'no' },
 *   history:   courseKey[]            // decision order, newest last (undo)
 *   order:     courseKey[]            // Shortlist order, shuffled once per term
 *   criteria:  { id, name, weight }[] // weights are decimals meant to sum to 1
 *   ratings:   { [courseKey]: { [criterionId]: 1..10 } }
 *   notes:     { [courseKey]: string }
 * }
 */

export const COMPARE_STORAGE_KEY = 'yale-som-course-planner-compare'
const STORE_VERSION = 2
const DECISIONS = new Set(['yes', 'maybe', 'no'])

export const DEFAULT_CRITERIA = [
  { id: 'interesting', name: 'Interesting', weight: 0.35 },
  { id: 'useful', name: 'Useful', weight: 0.45 },
  { id: 'professor', name: 'Professor', weight: 0.2 },
]

export function createEmptyCompareStore() {
  return { version: STORE_VERSION, terms: {} }
}

function createEmptyTermData() {
  return {
    decisions: {},
    history: [],
    order: [],
    criteria: DEFAULT_CRITERIA.map((c) => ({ ...c })),
    ratings: {},
    notes: {},
  }
}

export function getTermData(store, termCode) {
  return store.terms[termCode] ?? createEmptyTermData()
}

function updateTerm(store, termCode, fn) {
  return {
    ...store,
    terms: { ...store.terms, [termCode]: fn(getTermData(store, termCode)) },
  }
}

function isPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value)
}

function isRating(value) {
  return Number.isInteger(value) && value >= 1 && value <= 10
}

function normalizeCriteria(raw) {
  if (!Array.isArray(raw)) return createEmptyTermData().criteria
  const criteria = raw
    .filter((c) => isPlainObject(c) && typeof c.id === 'string' && typeof c.name === 'string')
    .filter((c) => c.name.trim())
    .map((c) => ({
      id: c.id,
      name: c.name.trim(),
      weight: Number.isFinite(c.weight) && c.weight >= 0 ? c.weight : 0,
    }))
  return criteria.length > 0 ? criteria : createEmptyTermData().criteria
}

function normalizeTerm(raw) {
  if (!isPlainObject(raw)) return createEmptyTermData()
  const decisions = Object.fromEntries(
    Object.entries(isPlainObject(raw.decisions) ? raw.decisions : {}).filter(([, d]) =>
      DECISIONS.has(d),
    ),
  )
  const history = Array.isArray(raw.history)
    ? raw.history.filter((key) => typeof key === 'string' && key in decisions)
    : []
  const ratings = {}
  for (const [key, byCriterion] of Object.entries(isPlainObject(raw.ratings) ? raw.ratings : {})) {
    if (!isPlainObject(byCriterion)) continue
    const kept = Object.fromEntries(Object.entries(byCriterion).filter(([, v]) => isRating(v)))
    if (Object.keys(kept).length > 0) ratings[key] = kept
  }
  const notes = Object.fromEntries(
    Object.entries(isPlainObject(raw.notes) ? raw.notes : {}).filter(
      ([, note]) => typeof note === 'string' && note.trim(),
    ),
  )
  const order = Array.isArray(raw.order)
    ? [...new Set(raw.order.filter((key) => typeof key === 'string'))]
    : []
  return { decisions, history, order, criteria: normalizeCriteria(raw.criteria), ratings, notes }
}

function backUp(storage, text) {
  try {
    storage.setItem(`${COMPARE_STORAGE_KEY}-backup-${Date.now()}`, text)
  } catch {
    // Nothing more we can do; the original text is still under the main key.
  }
}

/**
 * Reading `window.localStorage` itself throws when the browser blocks site
 * data, so it is resolved inside the try (never as a default parameter).
 *
 * @returns {{ store: object, recovered: boolean }}
 */
export function loadCompareStore(storage) {
  let text
  try {
    storage = storage ?? globalThis.localStorage
    text = storage.getItem(COMPARE_STORAGE_KEY)
  } catch {
    return { store: createEmptyCompareStore(), recovered: false }
  }
  if (text == null) return { store: createEmptyCompareStore(), recovered: false }

  let raw
  try {
    raw = JSON.parse(text)
  } catch {
    raw = undefined
  }
  if (!isPlainObject(raw) || raw.version !== STORE_VERSION) {
    backUp(storage, text)
    return { store: createEmptyCompareStore(), recovered: true }
  }
  const terms = Object.fromEntries(
    Object.entries(isPlainObject(raw.terms) ? raw.terms : {}).map(([term, data]) => [
      term,
      normalizeTerm(data),
    ]),
  )
  return { store: { version: STORE_VERSION, terms }, recovered: false }
}

/** @returns {boolean} false when the browser refused to save */
export function persistCompareStore(store, storage) {
  try {
    storage = storage ?? globalThis.localStorage
    storage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(store))
    return true
  } catch {
    return false
  }
}

/** Mark a course 'yes' (interested), 'maybe' or 'no'; newest decision goes last for undo. */
export function decide(store, termCode, key, decision) {
  return updateTerm(store, termCode, (term) => ({
    ...term,
    decisions: { ...term.decisions, [key]: decision },
    history: [...term.history.filter((k) => k !== key), key],
  }))
}

export function undoLastDecision(store, termCode) {
  const term = getTermData(store, termCode)
  if (term.history.length === 0) return store
  const last = term.history[term.history.length - 1]
  return updateTerm(store, termCode, (t) => {
    const decisions = { ...t.decisions }
    delete decisions[last]
    return { ...t, decisions, history: t.history.slice(0, -1) }
  })
}

/**
 * Give every course in the term a place in the Shortlist order. The first
 * time, the whole list is shuffled; later, only new courses are slotted in at
 * random places, so reloads and Undo never reshuffle what's already there.
 *
 * @param {() => number} random  Math.random, injectable for tests
 */
export function ensureShuffledOrder(store, termCode, keys, random) {
  const term = getTermData(store, termCode)
  const placed = new Set(term.order)
  const missing = keys.filter((key) => !placed.has(key))
  if (missing.length === 0) return store
  const order = [...term.order]
  for (const key of missing) {
    order.splice(Math.floor(random() * (order.length + 1)), 0, key)
  }
  return updateTerm(store, termCode, (t) => ({ ...t, order }))
}
