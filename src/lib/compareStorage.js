/**
 * Compare Courses data in localStorage. All updaters are pure (return a new
 * store). Data for courses or professors missing from the catalog is kept.
 */

export const COMPARE_STORAGE_KEY = 'yale-som-course-planner-compare'
const STORE_VERSION = 1
const PROFESSOR_CRITERION = {
  id: 'professor',
  name: 'Professor',
  weight: 5,
  kind: 'professor',
}

export function createDefaultCompareStore() {
  return {
    version: STORE_VERSION,
    criteria: [
      { id: 'interesting', name: 'Interesting', weight: 5, kind: 'manual' },
      { id: 'useful', name: 'Useful', weight: 5, kind: 'manual' },
      { ...PROFESSOR_CRITERION },
    ],
    selected: {},
    scores: {},
    notes: {},
    professors: {},
  }
}

function isPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value)
}

function isScore(value) {
  return Number.isInteger(value) && value >= 1 && value <= 10
}

function clampWeight(weight) {
  return Math.min(10, Math.max(0, Math.round(Number(weight) || 0)))
}

function normalizeCriteria(raw) {
  if (!Array.isArray(raw)) return createDefaultCompareStore().criteria
  const criteria = []
  let hasProfessor = false
  for (const c of raw) {
    if (!isPlainObject(c) || typeof c.id !== 'string' || typeof c.name !== 'string') continue
    if (!c.name.trim()) continue
    const kind = c.kind === 'professor' ? 'professor' : 'manual'
    if (kind === 'professor') {
      if (hasProfessor) continue
      hasProfessor = true
    }
    criteria.push({ id: c.id, name: c.name.trim(), weight: clampWeight(c.weight), kind })
  }
  if (!hasProfessor) criteria.push({ ...PROFESSOR_CRITERION })
  return criteria
}

function normalizeSelected(raw) {
  if (!isPlainObject(raw)) return {}
  return Object.fromEntries(
    Object.entries(raw)
      .filter(([, keys]) => Array.isArray(keys))
      .map(([term, keys]) => [term, [...new Set(keys.filter((k) => typeof k === 'string'))]]),
  )
}

function normalizeScores(raw) {
  if (!isPlainObject(raw)) return {}
  const scores = {}
  for (const [key, byCriterion] of Object.entries(raw)) {
    if (!isPlainObject(byCriterion)) continue
    const kept = Object.fromEntries(
      Object.entries(byCriterion).filter(([, value]) => isScore(value)),
    )
    if (Object.keys(kept).length > 0) scores[key] = kept
  }
  return scores
}

function normalizeNotes(raw) {
  if (!isPlainObject(raw)) return {}
  return Object.fromEntries(
    Object.entries(raw).filter(([, note]) => typeof note === 'string' && note.trim()),
  )
}

function normalizeProfessors(raw) {
  if (!isPlainObject(raw)) return {}
  const professors = {}
  for (const [name, entry] of Object.entries(raw)) {
    if (!isPlainObject(entry)) continue
    const kept = {}
    if (isScore(entry.rating)) kept.rating = entry.rating
    if (typeof entry.note === 'string' && entry.note.trim()) kept.note = entry.note
    if (Object.keys(kept).length > 0) professors[name] = kept
  }
  return professors
}

function normalizeStore(raw) {
  return {
    version: STORE_VERSION,
    criteria: normalizeCriteria(raw.criteria),
    selected: normalizeSelected(raw.selected),
    scores: normalizeScores(raw.scores),
    notes: normalizeNotes(raw.notes),
    professors: normalizeProfessors(raw.professors),
  }
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
    return { store: createDefaultCompareStore(), recovered: false }
  }
  if (text == null) return { store: createDefaultCompareStore(), recovered: false }

  let raw
  try {
    raw = JSON.parse(text)
  } catch {
    raw = undefined
  }
  if (!isPlainObject(raw) || !(Number(raw.version) <= STORE_VERSION)) {
    backUp(storage, text)
    return { store: createDefaultCompareStore(), recovered: true }
  }
  return { store: normalizeStore(raw), recovered: false }
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

export function toggleSelected(store, termCode, key) {
  const current = store.selected[termCode] ?? []
  const next = current.includes(key)
    ? current.filter((k) => k !== key)
    : [...current, key]
  return { ...store, selected: { ...store.selected, [termCode]: next } }
}

export function setScore(store, key, criterionId, value) {
  const course = { ...(store.scores[key] ?? {}) }
  if (value == null) delete course[criterionId]
  else course[criterionId] = value
  const scores = { ...store.scores }
  if (Object.keys(course).length === 0) delete scores[key]
  else scores[key] = course
  return { ...store, scores }
}

export function setNote(store, key, text) {
  const notes = { ...store.notes }
  if (text.trim()) notes[key] = text
  else delete notes[key]
  return { ...store, notes }
}

function updateProfessor(store, name, field, value) {
  const entry = { ...(store.professors[name] ?? {}) }
  if (value == null) delete entry[field]
  else entry[field] = value
  const professors = { ...store.professors }
  if (Object.keys(entry).length === 0) delete professors[name]
  else professors[name] = entry
  return { ...store, professors }
}

export function setProfessorRating(store, name, value) {
  return updateProfessor(store, name, 'rating', value)
}

export function setProfessorNote(store, name, text) {
  return updateProfessor(store, name, 'note', text.trim() ? text : null)
}

function validateName(store, name, exceptId = null) {
  const trimmed = name.trim()
  if (!trimmed) return { error: 'empty' }
  const lower = trimmed.toLowerCase()
  if (store.criteria.some((c) => c.id !== exceptId && c.name.toLowerCase() === lower)) {
    return { error: 'duplicate' }
  }
  return { name: trimmed }
}

function newCriterionId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `criterion-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/** @returns {{ store: object, error?: 'empty' | 'duplicate' }} */
export function addCriterion(store, name) {
  const check = validateName(store, name)
  if (check.error) return { store, error: check.error }
  const criterion = { id: newCriterionId(), name: check.name, weight: 5, kind: 'manual' }
  return { store: { ...store, criteria: [...store.criteria, criterion] } }
}

/** @returns {{ store: object, error?: 'empty' | 'duplicate' }} */
export function renameCriterion(store, id, name) {
  const target = store.criteria.find((c) => c.id === id)
  if (!target || target.kind === 'professor') return { store }
  const check = validateName(store, name, id)
  if (check.error) return { store, error: check.error }
  return {
    store: {
      ...store,
      criteria: store.criteria.map((c) => (c.id === id ? { ...c, name: check.name } : c)),
    },
  }
}

export function setCriterionWeight(store, id, weight) {
  return {
    ...store,
    criteria: store.criteria.map((c) =>
      c.id === id ? { ...c, weight: clampWeight(weight) } : c,
    ),
  }
}

export function countScoresForCriterion(store, id) {
  return Object.values(store.scores).filter((byCriterion) => id in byCriterion).length
}

export function deleteCriterion(store, id) {
  const target = store.criteria.find((c) => c.id === id)
  if (!target || target.kind === 'professor') return store
  let next = { ...store, criteria: store.criteria.filter((c) => c.id !== id) }
  for (const key of Object.keys(store.scores)) {
    if (id in store.scores[key]) next = setScore(next, key, id, null)
  }
  return next
}
