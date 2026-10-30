import { describe, expect, test } from 'vitest'
import {
  SCORE_COLORS,
  computeCourseScore,
  orderRowKeys,
  parseScoreInput,
  professorValue,
  scoreColor,
  sortRows,
  weightShares,
} from './compareScoring'

const C = [
  { id: 'i', name: 'Interesting', weight: 5, kind: 'manual' },
  { id: 'u', name: 'Useful', weight: 5, kind: 'manual' },
  { id: 'p', name: 'Professor', weight: 5, kind: 'professor' },
]

describe('computeCourseScore', () => {
  test('spec example: unrated professor is skipped', () => {
    expect(computeCourseScore({ professors: ['X'] }, C, { i: 8, u: 6 }, {})).toEqual({
      score: 7,
      complete: false,
    })
  })

  test('professor criterion uses highest rating among professors', () => {
    expect(professorValue(['A', 'B', 'C'], { A: { rating: 4 }, B: { rating: 9 } })).toBe(9)
    expect(
      computeCourseScore(
        { professors: ['A', 'B'] },
        C,
        { i: 6, u: 6 },
        { A: { rating: 4 }, B: { rating: 9 } },
      ),
    ).toEqual({ score: 7, complete: true })
  })

  test('unrated professors give no professor value', () => {
    expect(professorValue(['A'], { A: { note: 'hi' } })).toBeNull()
    expect(professorValue([], {})).toBeNull()
  })

  test('weight 0 criterion is ignored', () => {
    const zeroP = C.map((c) => (c.id === 'p' ? { ...c, weight: 0 } : c))
    expect(computeCourseScore({ professors: [] }, zeroP, { i: 8, u: 6 }, {})).toEqual({
      score: 7,
      complete: true,
    })
  })

  test('all weights 0 gives no score', () => {
    const zero = C.map((c) => ({ ...c, weight: 0 }))
    expect(computeCourseScore({ professors: [] }, zero, { i: 8 }, {}).score).toBeNull()
  })

  test('no values gives no score', () => {
    expect(computeCourseScore({ professors: [] }, C, undefined, {}).score).toBeNull()
  })

  test('score is rounded to one decimal', () => {
    const w = [
      { id: 'i', name: 'I', weight: 1, kind: 'manual' },
      { id: 'u', name: 'U', weight: 2, kind: 'manual' },
    ]
    expect(computeCourseScore({ professors: [] }, w, { i: 10, u: 7 }, {}).score).toBe(8)
    expect(computeCourseScore({ professors: [] }, w, { i: 9, u: 7 }, {}).score).toBe(7.7)
  })
})

describe('weightShares', () => {
  test('weights 2/3/5 give shares 20/30/50', () => {
    expect(
      weightShares([
        { ...C[0], weight: 2 },
        { ...C[1], weight: 3 },
        { ...C[2], weight: 5 },
      ]),
    ).toEqual({ i: 20, u: 30, p: 50 })
  })

  test('three equal weights give 33 each; all zero gives 0', () => {
    expect(weightShares(C)).toEqual({ i: 33, u: 33, p: 33 })
    expect(weightShares(C.map((c) => ({ ...c, weight: 0 })))).toEqual({ i: 0, u: 0, p: 0 })
  })
})

describe('parseScoreInput', () => {
  test('accepts integers 1 to 10', () => {
    expect(parseScoreInput('10')).toBe(10)
    expect(parseScoreInput('1')).toBe(1)
    expect(parseScoreInput(' 7 ')).toBe(7)
  })

  test('blank clears', () => {
    expect(parseScoreInput('')).toBeNull()
    expect(parseScoreInput(' ')).toBeNull()
  })

  test('rejects anything else', () => {
    for (const bad of ['0', '11', '7.5', '-3', 'abc', '1 0', '05']) {
      expect(parseScoreInput(bad), bad).toBeUndefined()
    }
  })
})

describe('scoreColor', () => {
  test('maps 1..10 onto the palette, rounding final scores', () => {
    expect(SCORE_COLORS).toHaveLength(10)
    expect(scoreColor(1)).toBe(SCORE_COLORS[0])
    expect(scoreColor(10)).toBe(SCORE_COLORS[9])
    expect(scoreColor(7.4)).toBe(SCORE_COLORS[6])
    expect(scoreColor(null)).toBeNull()
  })
})

describe('sortRows', () => {
  const rows = [
    { k: 'a', v: null },
    { k: 'b', v: 3 },
    { k: 'c', v: 8 },
  ]
  const get = (r) => r.v

  test('empty values last in both directions', () => {
    expect(sortRows(rows, 'v', 'desc', get).map((r) => r.k)).toEqual(['c', 'b', 'a'])
    expect(sortRows(rows, 'v', 'asc', get).map((r) => r.k)).toEqual(['b', 'c', 'a'])
  })

  test('strings sort with localeCompare and do not mutate input', () => {
    const named = [{ k: 'MGT 611' }, { k: 'MGT 525' }, { k: '' }]
    const sorted = sortRows(named, 'k', 'asc', (r) => r.k)
    expect(sorted.map((r) => r.k)).toEqual(['MGT 525', 'MGT 611', ''])
    expect(named[0].k).toBe('MGT 611')
  })
})

describe('orderRowKeys', () => {
  test('no frozen order returns the sorted order', () => {
    expect(orderRowKeys(['c', 'a', 'b'], null)).toEqual(['c', 'a', 'b'])
  })

  test('frozen order is kept, removed keys dropped, new keys appended', () => {
    expect(orderRowKeys(['d', 'c', 'a'], ['a', 'b', 'c'])).toEqual(['a', 'c', 'd'])
  })
})
