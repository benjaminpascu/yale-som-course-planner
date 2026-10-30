import { describe, expect, test } from 'vitest'
import {
  COMPARE_STORAGE_KEY,
  addCriterion,
  countScoresForCriterion,
  createDefaultCompareStore,
  deleteCriterion,
  loadCompareStore,
  persistCompareStore,
  renameCriterion,
  setCriterionWeight,
  setNote,
  setProfessorNote,
  setProfessorRating,
  setScore,
  toggleSelected,
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

describe('loadCompareStore', () => {
  test('missing key gives defaults with three criteria', () => {
    const { store, recovered } = loadCompareStore(fake())
    expect(store.criteria.map((c) => c.name)).toEqual(['Interesting', 'Useful', 'Professor'])
    expect(store.criteria.map((c) => c.weight)).toEqual([5, 5, 5])
    expect(recovered).toBe(false)
  })

  test('corrupt JSON is backed up, not lost', () => {
    const storage = fake({ [COMPARE_STORAGE_KEY]: '{not json' })
    const { recovered, store } = loadCompareStore(storage)
    expect(recovered).toBe(true)
    expect(store.criteria).toHaveLength(3)
    const backupKey = Object.keys(storage.data).find((k) =>
      k.startsWith(`${COMPARE_STORAGE_KEY}-backup-`),
    )
    expect(storage.data[backupKey]).toBe('{not json')
  })

  test('newer version is backed up rather than misread', () => {
    const raw = JSON.stringify({ version: 2 })
    const storage = fake({ [COMPARE_STORAGE_KEY]: raw })
    expect(loadCompareStore(storage).recovered).toBe(true)
    expect(Object.values(storage.data).filter((v) => v === raw)).toHaveLength(2)
  })

  test('normalize drops out-of-range scores and restores missing professor criterion', () => {
    const raw = {
      version: 1,
      criteria: [{ id: 'x', name: 'X', weight: 5, kind: 'manual' }],
      selected: {},
      scores: { k: { x: 11, y: 4, z: 7.5 } },
      notes: {},
      professors: {},
    }
    const { store } = loadCompareStore(fake({ [COMPARE_STORAGE_KEY]: JSON.stringify(raw) }))
    expect(store.scores.k).toEqual({ y: 4 })
    expect(store.criteria.filter((c) => c.kind === 'professor')).toHaveLength(1)
    expect(store.criteria[0]).toMatchObject({ id: 'x', name: 'X' })
  })

  test('localStorage that throws on read gives defaults', () => {
    const broken = {
      getItem() {
        throw new Error('blocked')
      },
      setItem() {},
    }
    expect(loadCompareStore(broken).store.criteria).toHaveLength(3)
  })
})

describe('persistCompareStore', () => {
  test('round-trip keeps scores for courses not in the catalog', () => {
    const storage = fake()
    const store = setScore(createDefaultCompareStore(), 'MGT 999|gone|ft', 'interesting', 7)
    expect(persistCompareStore(store, storage)).toBe(true)
    expect(loadCompareStore(storage).store.scores['MGT 999|gone|ft']).toEqual({
      interesting: 7,
    })
  })

  test('returns false when storage throws', () => {
    const full = {
      setItem() {
        throw new Error('quota')
      },
    }
    expect(persistCompareStore(createDefaultCompareStore(), full)).toBe(false)
  })
})

describe('updaters', () => {
  test('toggleSelected is per term and keeps scores', () => {
    let store = setScore(createDefaultCompareStore(), 'k', 'useful', 5)
    store = toggleSelected(store, '202609', 'k')
    expect(store.selected).toEqual({ 202609: ['k'] })
    store = toggleSelected(store, '202609', 'k')
    expect(store.selected['202609']).toEqual([])
    expect(store.scores.k).toEqual({ useful: 5 })
  })

  test('setScore null removes the score and empty course entry', () => {
    let store = setScore(createDefaultCompareStore(), 'k', 'useful', 5)
    store = setScore(store, 'k', 'useful', null)
    expect(store.scores.k).toBeUndefined()
  })

  test('updaters do not mutate the input store', () => {
    const before = createDefaultCompareStore()
    setScore(before, 'k', 'useful', 5)
    toggleSelected(before, '202609', 'k')
    expect(before.scores).toEqual({})
    expect(before.selected).toEqual({})
  })

  test('setNote keeps text verbatim and blank removes', () => {
    let store = setNote(createDefaultCompareStore(), 'k', ' line one\nline two ')
    expect(store.notes.k).toBe(' line one\nline two ')
    store = setNote(store, 'k', '   ')
    expect(store.notes.k).toBeUndefined()
  })

  test('professor rating and note are independent', () => {
    let store = setProfessorRating(createDefaultCompareStore(), 'Pinker, Edi', 8)
    store = setProfessorNote(store, 'Pinker, Edi', 'great')
    expect(store.professors['Pinker, Edi']).toEqual({ rating: 8, note: 'great' })
    store = setProfessorRating(store, 'Pinker, Edi', null)
    expect(store.professors['Pinker, Edi']).toEqual({ note: 'great' })
    store = setProfessorNote(store, 'Pinker, Edi', '')
    expect(store.professors['Pinker, Edi']).toBeUndefined()
  })

  test('deleteCriterion removes its scores; count first', () => {
    let store = setScore(setScore(createDefaultCompareStore(), 'a', 'useful', 5), 'b', 'useful', 6)
    store = setScore(store, 'a', 'interesting', 9)
    expect(countScoresForCriterion(store, 'useful')).toBe(2)
    store = deleteCriterion(store, 'useful')
    expect(store.criteria.some((c) => c.id === 'useful')).toBe(false)
    expect(store.scores.a).toEqual({ interesting: 9 })
    expect(store.scores.b).toBeUndefined()
  })

  test('professor criterion cannot be deleted or renamed', () => {
    const store = createDefaultCompareStore()
    expect(deleteCriterion(store, 'professor')).toBe(store)
    expect(renameCriterion(store, 'professor', 'Prof').store).toBe(store)
  })

  test('addCriterion rejects empty and duplicate names', () => {
    const store = createDefaultCompareStore()
    expect(addCriterion(store, '  ').error).toBe('empty')
    expect(addCriterion(store, 'useful').error).toBe('duplicate')
    const added = addCriterion(store, ' Networking ').store.criteria.at(-1)
    expect(added).toMatchObject({ name: 'Networking', weight: 5, kind: 'manual' })
    expect(typeof added.id).toBe('string')
  })

  test('renameCriterion keeps id and validates', () => {
    const store = createDefaultCompareStore()
    expect(renameCriterion(store, 'useful', 'Interesting').error).toBe('duplicate')
    expect(renameCriterion(store, 'useful', '').error).toBe('empty')
    const renamed = renameCriterion(store, 'useful', 'Career value').store
    expect(renamed.criteria.find((c) => c.id === 'useful').name).toBe('Career value')
  })

  test('setCriterionWeight clamps to 0..10', () => {
    let store = setCriterionWeight(createDefaultCompareStore(), 'useful', 12)
    expect(store.criteria.find((c) => c.id === 'useful').weight).toBe(10)
    store = setCriterionWeight(store, 'professor', 0)
    expect(store.criteria.find((c) => c.id === 'professor').weight).toBe(0)
  })
})
