import { normalizeWeights } from './compareScoring'

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

export function setRating(store, termCode, key, criterionId, value) {
  return updateTerm(store, termCode, (term) => {
    const course = { ...(term.ratings[key] ?? {}) }
    if (value == null) delete course[criterionId]
    else course[criterionId] = value
    const ratings = { ...term.ratings }
    if (Object.keys(course).length === 0) delete ratings[key]
    else ratings[key] = course
    return { ...term, ratings }
  })
}

export function setNote(store, termCode, key, text) {
  return updateTerm(store, termCode, (term) => {
    const notes = { ...term.notes }
    if (text.trim()) notes[key] = text
    else delete notes[key]
    return { ...term, notes }
  })
}

function newCriterionId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `criterion-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * New criterion gets 1/(n+1); the others shrink by n/(n+1), so the total stays 1.
 *
 * @returns {{ store: object, error?: 'empty' | 'duplicate' }}
 */
export function addCriterion(store, termCode, name) {
  const trimmed = name.trim()
  if (!trimmed) return { store, error: 'empty' }
  const { criteria } = getTermData(store, termCode)
  if (criteria.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
    return { store, error: 'duplicate' }
  }
  const n = criteria.length
  const next = [
    ...criteria.map((c) => ({ ...c, weight: (c.weight * n) / (n + 1) })),
    { id: newCriterionId(), name: trimmed, weight: 1 / (n + 1) },
  ]
  return { store: updateTerm(store, termCode, (term) => ({ ...term, criteria: next })) }
}

export function countRatingsForCriterion(store, termCode, criterionId) {
  return Object.values(getTermData(store, termCode).ratings).filter((r) => criterionId in r)
    .length
}

/** Removes a criterion and its ratings, rescaling the rest. At least one always stays. */
export function removeCriterion(store, termCode, criterionId) {
  const term = getTermData(store, termCode)
  if (term.criteria.length <= 1 || !term.criteria.some((c) => c.id === criterionId)) {
    return store
  }
  const ratings = {}
  for (const [key, byCriterion] of Object.entries(term.ratings)) {
    const kept = { ...byCriterion }
    delete kept[criterionId]
    if (Object.keys(kept).length > 0) ratings[key] = kept
  }
  return updateTerm(store, termCode, (t) => ({
    ...t,
    criteria: normalizeWeights(t.criteria.filter((c) => c.id !== criterionId)),
    ratings,
  }))
}

/** Stores a typed weight as-is; "Fix weights" rescales if the total isn't 1. */
export function setCriterionWeight(store, termCode, criterionId, weight) {
  return updateTerm(store, termCode, (term) => ({
    ...term,
    criteria: term.criteria.map((c) => (c.id === criterionId ? { ...c, weight } : c)),
  }))
}

export function fixWeights(store, termCode) {
  return updateTerm(store, termCode, (term) => ({
    ...term,
    criteria: normalizeWeights(term.criteria),
  }))
}
