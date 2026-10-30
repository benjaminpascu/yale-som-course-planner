import { describe, expect, test } from 'vitest'
import {
  COMPARE_STORAGE_KEY,
  DEFAULT_CRITERIA,
  createEmptyCompareStore,
  decide,
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

  test('a store from another version is backed up rather than misread', () => {
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
          history: ['a', 'b', 'c', 'zzz'],
        },
      },
    }
    const { store } = loadCompareStore(fake({ [COMPARE_STORAGE_KEY]: JSON.stringify(raw) }))
    const term = getTermData(store, FALL)
    expect(term.decisions).toEqual({ a: 'yes', c: 'no' })
    expect(term.history).toEqual(['a', 'c'])
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
    expect(getTermData(store, FALL).history).toEqual(['a'])
  })

  test('re-deciding a course moves it to the end of history', () => {
    let store = decide(createEmptyCompareStore(), FALL, 'a', 'yes')
    store = decide(store, FALL, 'b', 'no')
    store = decide(store, FALL, 'a', 'maybe')
    expect(getTermData(store, FALL).history).toEqual(['b', 'a'])
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
