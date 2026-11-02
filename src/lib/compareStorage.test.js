import { describe, expect, test } from 'vitest'
import {
  COMPARE_STORAGE_KEY,
  DEFAULT_CRITERIA,
  addCriterion,
  countRatingsForCriterion,
  fixWeights,
  removeCriterion,
  setCriterionWeight,
  setNote,
  setProfessorRating,
  setRating,
  createEmptyCompareStore,
  decide,
  ensureShuffledOrder,
  getTermData,
  loadCompareStore,
  persistCompareStore,
  undoLastDecision,
} from './compareStorage'

function fake(data = {}) {
  return {
    data: { ...data },
    getItem(key) {
      return key in this.data ? this.data[key] : null
    },
    setItem(key, value) {
      this.data[key] = String(value)
    },
  }
}

const FALL = '202603'
const SPRING = '202701'

describe('loadCompareStore', () => {
  test('missing key gives an empty store; a term starts with default criteria', () => {
    const { store, recovered } = loadCompareStore(fake())
    expect(recovered).toBe(false)
    const term = getTermData(store, FALL)
    expect(term.decisions).toEqual({})
    expect(term.criteria).toEqual(DEFAULT_CRITERIA)
    expect(DEFAULT_CRITERIA.map((c) => [c.name, c.weight])).toEqual([
      ['Interesting', 0.35],
      ['Useful', 0.45],
      ['Professor', 0.2],
    ])
  })

  test('corrupt JSON is backed up, not lost', () => {
    const storage = fake({ [COMPARE_STORAGE_KEY]: '{not json' })
    expect(loadCompareStore(storage).recovered).toBe(true)
    const backupKey = Object.keys(storage.data).find((k) =>
      k.startsWith(`${COMPARE_STORAGE_KEY}-backup-`),
    )
    expect(storage.data[backupKey]).toBe('{not json')
  })

  test('data saved by a newer version is left untouched and marked read-only', () => {
    const raw = JSON.stringify({ version: 3, terms: { x: {} } })
    const storage = fake({ [COMPARE_STORAGE_KEY]: raw })
    const { store, recovered, newerVersion } = loadCompareStore(storage)
    expect(newerVersion).toBe(true)
    expect(recovered).toBe(false)
    expect(store).toEqual(createEmptyCompareStore())
    expect(Object.keys(storage.data)).toEqual([COMPARE_STORAGE_KEY])
    expect(storage.data[COMPARE_STORAGE_KEY]).toBe(raw)
  })

  test('an older-version store is backed up rather than misread', () => {
    const raw = JSON.stringify({ version: 1, criteria: [] })
    const storage = fake({ [COMPARE_STORAGE_KEY]: raw })
    expect(loadCompareStore(storage).recovered).toBe(true)
    expect(Object.values(storage.data).filter((v) => v === raw)).toHaveLength(2)
  })

  test('normalize drops invalid decisions and history entries without a decision', () => {
    const raw = {
      version: 2,
      terms: {
        [FALL]: {
          decisions: { a: 'yes', b: 'nope', c: 'no' },
          history: [
            { key: 'a', previous: null },
            { key: 'b', previous: null },
            { key: 'c', previous: 'bogus' },
            { key: 'zzz', previous: null },
          ],
        },
      },
    }
    const { store } = loadCompareStore(fake({ [COMPARE_STORAGE_KEY]: JSON.stringify(raw) }))
    const term = getTermData(store, FALL)
    expect(term.decisions).toEqual({ a: 'yes', c: 'no' })
    expect(term.history).toEqual([
      { key: 'a', previous: null },
      { key: 'c', previous: null },
    ])
    expect(term.criteria).toEqual(DEFAULT_CRITERIA)
  })

  test('blocked localStorage (reading window.localStorage throws) falls back', () => {
    const had = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('SecurityError')
      },
    })
    try {
      expect(loadCompareStore().store).toEqual(createEmptyCompareStore())
      expect(persistCompareStore(createEmptyCompareStore())).toBe(false)
    } finally {
      if (had) Object.defineProperty(globalThis, 'localStorage', had)
      else delete globalThis.localStorage
    }
  })
})

describe('persistCompareStore', () => {
  test('round-trips decisions per term', () => {
    const storage = fake()
    const store = decide(createEmptyCompareStore(), FALL, 'MGT 537|x|ft', 'yes')
    expect(persistCompareStore(store, storage)).toBe(true)
    expect(getTermData(loadCompareStore(storage).store, FALL).decisions).toEqual({
      'MGT 537|x|ft': 'yes',
    })
  })

  test('returns false when storage throws', () => {
    const full = {
      setItem() {
        throw new Error('quota')
      },
    }
    expect(persistCompareStore(createEmptyCompareStore(), full)).toBe(false)
  })
})

describe('decide and undo', () => {
  test('decisions are kept per term', () => {
    let store = decide(createEmptyCompareStore(), FALL, 'a', 'yes')
    store = decide(store, SPRING, 'a', 'no')
    expect(getTermData(store, FALL).decisions.a).toBe('yes')
    expect(getTermData(store, SPRING).decisions.a).toBe('no')
  })

  test('undo removes the most recent decision only', () => {
    let store = decide(createEmptyCompareStore(), FALL, 'a', 'yes')
    store = decide(store, FALL, 'b', 'maybe')
    store = undoLastDecision(store, FALL)
    expect(getTermData(store, FALL).decisions).toEqual({ a: 'yes' })
    expect(getTermData(store, FALL).history).toEqual([{ key: 'a', previous: null }])
  })

  test('undo after changing a decision restores the previous one', () => {
    let store = decide(createEmptyCompareStore(), FALL, 'a', 'yes')
    store = decide(store, FALL, 'b', 'no')
    store = decide(store, FALL, 'a', 'maybe')
    store = undoLastDecision(store, FALL)
    expect(getTermData(store, FALL).decisions).toEqual({ a: 'yes', b: 'no' })
    store = undoLastDecision(store, FALL)
    store = undoLastDecision(store, FALL)
    expect(getTermData(store, FALL).decisions).toEqual({})
  })

  test('undo with nothing to undo returns the same store', () => {
    const store = createEmptyCompareStore()
    expect(undoLastDecision(store, FALL)).toBe(store)
  })

  test('updaters do not mutate the input store', () => {
    const before = createEmptyCompareStore()
    decide(before, FALL, 'a', 'yes')
    expect(before).toEqual(createEmptyCompareStore())
  })
})

describe('ensureShuffledOrder', () => {
  // Deterministic "random": always picks the last remaining slot, so the
  // shuffle reverses the list and new keys are inserted at the front.
  const lastSlot = () => 0.999

  test('creates a shuffled order once for all courses in the term', () => {
    const store = ensureShuffledOrder(createEmptyCompareStore(), FALL, ['a', 'b', 'c'], lastSlot)
    const order = getTermData(store, FALL).order
    expect([...order].sort()).toEqual(['a', 'b', 'c'])
  })

  test('returns the same store when every course already has a place', () => {
    const store = ensureShuffledOrder(createEmptyCompareStore(), FALL, ['a', 'b', 'c'], Math.random)
    expect(ensureShuffledOrder(store, FALL, ['c', 'a', 'b'], Math.random)).toBe(store)
  })

  test('new courses are added without reshuffling existing ones', () => {
    let store = ensureShuffledOrder(createEmptyCompareStore(), FALL, ['a', 'b', 'c'], Math.random)
    const before = getTermData(store, FALL).order
    store = ensureShuffledOrder(store, FALL, ['a', 'b', 'c', 'd'], Math.random)
    const after = getTermData(store, FALL).order
    expect(after).toHaveLength(4)
    expect(after.filter((k) => k !== 'd')).toEqual(before)
  })

  test('courses that left the catalog keep their place (data is never pruned)', () => {
    let store = ensureShuffledOrder(createEmptyCompareStore(), FALL, ['a', 'b'], Math.random)
    store = ensureShuffledOrder(store, FALL, ['a'], Math.random)
    expect([...getTermData(store, FALL).order].sort()).toEqual(['a', 'b'])
  })

  test('order is saved per term and survives a reload', () => {
    const storage = fake()
    const store = ensureShuffledOrder(createEmptyCompareStore(), SPRING, ['x', 'y'], lastSlot)
    persistCompareStore(store, storage)
    expect(getTermData(loadCompareStore(storage).store, SPRING).order).toEqual(
      getTermData(store, SPRING).order,
    )
    expect(getTermData(store, FALL).order).toEqual([])
  })
})

describe('ratings and notes', () => {
  test('setRating stores per term; null removes; empty course entry removed', () => {
    let store = setRating(createEmptyCompareStore(), FALL, 'a', 'useful', 7)
    expect(getTermData(store, FALL).ratings).toEqual({ a: { useful: 7 } })
    expect(getTermData(store, SPRING).ratings).toEqual({})
    store = setRating(store, FALL, 'a', 'useful', null)
    expect(getTermData(store, FALL).ratings).toEqual({})
  })

  test('setNote keeps text verbatim; blank removes', () => {
    let store = setNote(createEmptyCompareStore(), FALL, 'a', ' ask second-years\nre quizzes ')
    expect(getTermData(store, FALL).notes.a).toBe(' ask second-years\nre quizzes ')
    store = setNote(store, FALL, 'a', '  ')
    expect(getTermData(store, FALL).notes.a).toBeUndefined()
  })
})

const weights = (store) => getTermData(store, FALL).criteria.map((c) => Number(c.weight.toFixed(4)))

describe('criteria', () => {
  test('adding a criterion gives it 1/(n+1) and scales the others so the total stays 1', () => {
    const { store, error } = addCriterion(createEmptyCompareStore(), FALL, ' Workload ')
    expect(error).toBeUndefined()
    const criteria = getTermData(store, FALL).criteria
    expect(criteria.at(-1).name).toBe('Workload')
    expect(weights(store)).toEqual([0.2625, 0.3375, 0.15, 0.25])
  })

  test('adding rejects empty and duplicate names', () => {
    const store = createEmptyCompareStore()
    expect(addCriterion(store, FALL, '  ').error).toBe('empty')
    expect(addCriterion(store, FALL, 'useful').error).toBe('duplicate')
    expect(addCriterion(store, FALL, 'useful').store).toBe(store)
  })

  test('removing a criterion rescales the rest and deletes its ratings', () => {
    let store = setRating(createEmptyCompareStore(), FALL, 'a', 'useful', 7)
    store = setRating(store, FALL, 'a', 'interesting', 9)
    expect(countRatingsForCriterion(store, FALL, 'useful')).toBe(1)
    store = removeCriterion(store, FALL, 'useful')
    expect(getTermData(store, FALL).criteria.map((c) => c.id)).toEqual(['interesting', 'professor'])
    expect(weights(store)).toEqual([0.6364, 0.3636])
    expect(getTermData(store, FALL).ratings).toEqual({ a: { interesting: 9 } })
  })

  test('the last criterion cannot be removed', () => {
    let store = removeCriterion(createEmptyCompareStore(), FALL, 'useful')
    store = removeCriterion(store, FALL, 'professor')
    expect(removeCriterion(store, FALL, 'interesting')).toBe(store)
  })

  test('typed weights are kept as typed until "Fix weights" rescales them', () => {
    let store = setCriterionWeight(createEmptyCompareStore(), FALL, 'interesting', 0.55)
    expect(weights(store)).toEqual([0.55, 0.45, 0.2])
    store = fixWeights(store, FALL)
    expect(weights(store)).toEqual([0.4583, 0.375, 0.1667])
  })
})

describe('shared professor ratings', () => {
  test('stored once per professor, for every term, and saved', () => {
    const storage = fake()
    let store = setProfessorRating(createEmptyCompareStore(), 'Zimmerman, Seth', 8)
    expect(store.professors).toEqual({ 'Zimmerman, Seth': 8 })
    persistCompareStore(store, storage)
    expect(loadCompareStore(storage).store.professors).toEqual({ 'Zimmerman, Seth': 8 })
    store = setProfessorRating(store, 'Zimmerman, Seth', null)
    expect(store.professors).toEqual({})
  })

  test('invalid stored professor ratings are dropped', () => {
    const raw = { version: 2, terms: {}, professors: { a: 11, b: 4, c: 'x' } }
    const { store } = loadCompareStore(fake({ [COMPARE_STORAGE_KEY]: JSON.stringify(raw) }))
    expect(store.professors).toEqual({ b: 4 })
  })

  test('removing the Professor column keeps the shared professor ratings', () => {
    let store = setProfessorRating(createEmptyCompareStore(), 'Zimmerman, Seth', 8)
    store = removeCriterion(store, FALL, 'professor')
    expect(store.professors).toEqual({ 'Zimmerman, Seth': 8 })
  })

  test('re-adding a criterion named "Professor" makes it the shared professor column again', () => {
    let store = removeCriterion(createEmptyCompareStore(), FALL, 'professor')
    store = addCriterion(store, FALL, 'professor').store
    expect(getTermData(store, FALL).criteria.at(-1)).toMatchObject({ id: 'professor', name: 'professor' })
  })
})
