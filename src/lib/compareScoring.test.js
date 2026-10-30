import { describe, expect, test } from 'vitest'
import {
  normalizeWeights,
  parseScoreInput,
  parseWeightInput,
  rankCourses,
  ratingTone,
  scoreToCommit,
  weightedScore,
  weightsNeedFix,
} from './compareScoring'

const C = [
  { id: 'i', name: 'Interesting', weight: 0.35 },
  { id: 'u', name: 'Useful', weight: 0.45 },
  { id: 'p', name: 'Professor', weight: 0.2 },
]

describe('weightedScore', () => {
  test('sum(weight × rating) ÷ sum(weight) over all rated criteria', () => {
    // MGT 802 in the mockup: 9, 9, 7 → 8.6
    expect(weightedScore({ i: 9, u: 9, p: 7 }, C)).toBeCloseTo(8.6, 5)
  })

  test('only criteria the course has a rating for count', () => {
    // MGT 541 in the mockup: 5, 7, unrated → (0.35×5 + 0.45×7) ÷ 0.8 = 6.125
    expect(weightedScore({ i: 5, u: 7 }, C)).toBeCloseTo(6.125, 5)
  })

  test('no ratings gives no score', () => {
    expect(weightedScore(undefined, C)).toBeNull()
    expect(weightedScore({}, C)).toBeNull()
  })

  test('ratings only on zero-weight criteria give no score', () => {
    expect(weightedScore({ i: 8 }, [{ id: 'i', name: 'I', weight: 0 }])).toBeNull()
  })
})

describe('ratingTone', () => {
  test('the five bands from the design', () => {
    expect(ratingTone(1)).toMatchObject({ bg: '#f6d4cf', fg: '#7a1810' })
    expect(ratingTone(2)).toMatchObject({ bg: '#f6d4cf', fg: '#7a1810' })
    expect(ratingTone(4)).toMatchObject({ bg: '#fbe0c8', fg: '#7a3d0a' })
    expect(ratingTone(6)).toMatchObject({ bg: '#fcefc0', fg: '#634800' })
    expect(ratingTone(8)).toMatchObject({ bg: '#d8eecd', fg: '#1f5a1c' })
    expect(ratingTone(10)).toMatchObject({ bg: '#a9d99c', fg: '#0f420f' })
  })

  test('weighted scores use the band of the rounded score; empty is white', () => {
    expect(ratingTone(8.6)).toEqual(ratingTone(9))
    expect(ratingTone(6.1)).toEqual(ratingTone(6))
    expect(ratingTone(null).bg).toBe('#ffffff')
  })
})

describe('weights', () => {
  test('default weights add up to 1, so no fix is needed', () => {
    expect(weightsNeedFix(C)).toBe(false)
  })

  test('typed weights that do not add to 1 need fixing', () => {
    expect(weightsNeedFix([{ ...C[0], weight: 0.5 }, C[1], C[2]])).toBe(true)
  })

  test('normalizeWeights rescales so they add to 1, keeping proportions', () => {
    const fixed = normalizeWeights([
      { id: 'a', name: 'A', weight: 1 },
      { id: 'b', name: 'B', weight: 3 },
    ])
    expect(fixed.map((c) => c.weight)).toEqual([0.25, 0.75])
  })

  test('all-zero weights become equal', () => {
    const fixed = normalizeWeights([
      { id: 'a', name: 'A', weight: 0 },
      { id: 'b', name: 'B', weight: 0 },
    ])
    expect(fixed.map((c) => c.weight)).toEqual([0.5, 0.5])
  })

  test('parseWeightInput accepts decimals from 0 to 1', () => {
    expect(parseWeightInput('0.35')).toBe(0.35)
    expect(parseWeightInput('.5')).toBe(0.5)
    expect(parseWeightInput('1')).toBe(1)
    expect(parseWeightInput('0')).toBe(0)
    for (const bad of ['', ' ', '1.2', '-0.1', 'abc', '0.3.1']) {
      expect(parseWeightInput(bad), bad).toBeUndefined()
    }
  })
})

describe('parseScoreInput', () => {
  test('accepts integers 1 to 10; blank clears; anything else is invalid', () => {
    expect(parseScoreInput('10')).toBe(10)
    expect(parseScoreInput(' 7 ')).toBe(7)
    expect(parseScoreInput('')).toBeNull()
    for (const bad of ['0', '11', '7.5', '-3', 'abc', '1 0', '05']) {
      expect(parseScoreInput(bad), bad).toBeUndefined()
    }
  })
})

describe('scoreToCommit', () => {
  test('typing "11" over an 8 never leaves 1 saved', () => {
    expect(scoreToCommit('1', 8)).toBe(1)
    expect(scoreToCommit('11', 8)).toBe(8)
  })

  test('"7.5" and "1 0" fall back to the value from before editing', () => {
    expect(scoreToCommit('7.5', 4)).toBe(4)
    expect(scoreToCommit('1 0', null)).toBeNull()
  })
})

describe('rankCourses', () => {
  const groups = [{ key: 'a' }, { key: 'b' }, { key: 'c' }]

  test('scored courses highest first; unscored are counted, not ranked', () => {
    const ratings = { a: { i: 5 }, b: { i: 9 } }
    const { ranked, unscored } = rankCourses(groups, ratings, C)
    expect(ranked.map((r) => [r.group.key, r.score])).toEqual([
      ['b', 9],
      ['a', 5],
    ])
    expect(unscored).toBe(1)
  })

  test('ties keep shortlist order', () => {
    const { ranked } = rankCourses(groups, { a: { i: 7 }, c: { i: 7 } }, C)
    expect(ranked.map((r) => r.group.key)).toEqual(['a', 'c'])
  })
})
