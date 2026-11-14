import { describe, expect, test } from 'vitest'
import {
  SHORTLIST_STORAGE_KEY,
  createEmptyShortlistStore,
  getShortlist,
  loadShortlistStore,
  persistShortlistStore,
  toggleShortlisted,
} from './shortlistStorage'

function memoryStorage(initial = {}) {
  const data = { ...initial }
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = String(v)
    },
    data,
  }
}

describe('toggleShortlisted', () => {
  test('stars a course, then a second toggle unstars it', () => {
    const once = toggleShortlisted(createEmptyShortlistStore(), '202701', 'A')
    expect(getShortlist(once, '202701')).toEqual(['A'])
    expect(getShortlist(toggleShortlisted(once, '202701', 'A'), '202701')).toEqual([])
  })

  test('leaves other semesters alone', () => {
    const fall = toggleShortlisted(createEmptyShortlistStore(), '202603', 'F')
    const both = toggleShortlisted(fall, '202701', 'S')
    expect(getShortlist(both, '202603')).toEqual(['F'])
    expect(getShortlist(both, '202701')).toEqual(['S'])
  })

  test('does not change the store it was given', () => {
    const empty = createEmptyShortlistStore()
    toggleShortlisted(empty, '202701', 'A')
    expect(empty).toEqual({ version: 1, terms: {} })
  })

  test('an unknown semester has an empty shortlist', () => {
    expect(getShortlist(createEmptyShortlistStore(), '209901')).toEqual([])
  })
})

describe('loading and saving', () => {
  test('keeps starred IDs no catalog knows yet (other schools load later)', () => {
    const storage = memoryStorage()
    const store = toggleShortlisted(createEmptyShortlistStore(), '202701', 'GB-12345')
    persistShortlistStore(store, storage)
    expect(getShortlist(loadShortlistStore(storage), '202701')).toEqual(['GB-12345'])
  })

  test('bad or missing data loads as an empty shortlist', () => {
    expect(loadShortlistStore(memoryStorage({ [SHORTLIST_STORAGE_KEY]: 'not json' }))).toEqual(
      createEmptyShortlistStore(),
    )
    expect(loadShortlistStore(memoryStorage({ [SHORTLIST_STORAGE_KEY]: 'null' }))).toEqual(
      createEmptyShortlistStore(),
    )
    expect(loadShortlistStore(memoryStorage())).toEqual(createEmptyShortlistStore())
  })

  test('keeps only text IDs, once each', () => {
    const raw = JSON.stringify({ version: 1, terms: { 202701: ['A', 5, 'A'] } })
    const store = loadShortlistStore(memoryStorage({ [SHORTLIST_STORAGE_KEY]: raw }))
    expect(getShortlist(store, '202701')).toEqual(['A'])
  })

  test('blocked storage: loading and saving never throw', () => {
    const blocked = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    }
    expect(loadShortlistStore(blocked)).toEqual(createEmptyShortlistStore())
    expect(() => persistShortlistStore(createEmptyShortlistStore(), blocked)).not.toThrow()
  })
})
