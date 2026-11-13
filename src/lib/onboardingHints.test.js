import { describe, expect, test } from 'vitest'
import {
  HINTS_STORAGE_KEY,
  COMPARE_INTRO,
  PLANNER_HINTS,
  SCORE_HINTS,
  loadSeenHints,
  nextCompareHint,
  nextPlannerHint,
  persistSeenHints,
} from './onboardingHints'

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

const base = { seen: new Set(), selectedCount: 0, hasPlan: false, phone: false }

describe('nextPlannerHint', () => {
  test('computer: starts with the add-course tip', () => {
    expect(nextPlannerHint(base)).toBe('add-course')
  })

  test('phone: starts by pointing at the Courses tab', () => {
    expect(nextPlannerHint({ ...base, phone: true })).toBe('phone-courses')
    expect(nextPlannerHint({ ...base, phone: true, seen: new Set(['phone-courses']) })).toBe(
      'add-course',
    )
  })

  test('bidding tip comes right after the first course is added', () => {
    const seen = new Set(['add-course'])
    expect(nextPlannerHint({ ...base, seen })).toBe(null)
    expect(nextPlannerHint({ ...base, seen, selectedCount: 1 })).toBe('bidding')
    expect(nextPlannerHint({ ...base, phone: true, seen: new Set(['phone-courses', 'add-course']), selectedCount: 1 })).toBe('bidding')
  })

  test('clash tip only once a Conflict label shows; the others go ahead meanwhile', () => {
    const seen = new Set(['add-course', 'bidding'])
    expect(nextPlannerHint({ ...base, seen })).toBe(null)
    expect(nextPlannerHint({ ...base, seen, selectedCount: 1 })).toBe('calendar-details')
    expect(nextPlannerHint({ ...base, seen, selectedCount: 1, hasConflict: true })).toBe('clash')
    seen.add('calendar-details')
    expect(nextPlannerHint({ ...base, seen, selectedCount: 2, hasConflict: true })).toBe('clash')
  })

  test('course tips wait while the semester on screen has none of the plan\'s courses', () => {
    const seen = new Set(['add-course', 'bidding', 'clash', 'calendar-details', 'set-targets', 'requirements'])
    // Courses only in Fall while Spring is shown: the calendar is empty, so nothing to point at.
    expect(nextPlannerHint({ ...base, seen, selectedCount: 2, shownCount: 0 })).toBe(null)
    expect(nextPlannerHint({ ...base, seen, selectedCount: 2, shownCount: 1 })).toBe('your-plan')
  })

  test('computer order: calendar, set targets, requirements, your plan, plans menu, compare, term switch', () => {
    const seen = new Set(['add-course', 'bidding', 'clash'])
    const order = []
    for (;;) {
      const id = nextPlannerHint({ ...base, seen, selectedCount: 1 })
      if (!id) break
      order.push(id)
      seen.add(id)
    }
    expect(order).toEqual([
      'calendar-details',
      'set-targets',
      'requirements',
      'your-plan',
      'plans-menu',
      'compare-plans',
      'term-switch',
    ])
  })

  test('computer: a saved plan does not hold back the later tips', () => {
    const seen = new Set(['add-course', 'bidding', 'clash', 'calendar-details', 'set-targets', 'requirements', 'your-plan'])
    expect(nextPlannerHint({ ...base, seen, selectedCount: 1, hasPlan: true })).toBe('plans-menu')
  })

  test('phone: no computer-only tips; save tip needs 3 courses and no saved plan', () => {
    const seen = new Set(['phone-courses', 'add-course', 'bidding', 'clash', 'calendar-details', 'set-targets', 'requirements'])
    const phone = { ...base, seen, phone: true }
    expect(nextPlannerHint({ ...phone, selectedCount: 2 })).toBe(null)
    expect(nextPlannerHint({ ...phone, selectedCount: 3 })).toBe('save-plan')
    expect(nextPlannerHint({ ...phone, selectedCount: 3, hasPlan: true })).toBe(null)
    seen.add('save-plan')
    expect(nextPlannerHint({ ...phone, selectedCount: 3 })).toBe(null)
  })

  test('nothing once every tip is seen', () => {
    const seen = new Set(PLANNER_HINTS)
    expect(nextPlannerHint({ ...base, seen, selectedCount: 5, phone: true })).toBe(null)
  })
})

describe('seen-tips storage', () => {
  test('round-trips', () => {
    const storage = memoryStorage()
    persistSeenHints(new Set(['add-course', 'clash']), storage)
    expect([...loadSeenHints(storage)]).toEqual(['add-course', 'clash'])
  })

  test('bad or missing data means nothing seen', () => {
    expect(loadSeenHints(memoryStorage()).size).toBe(0)
    expect(loadSeenHints(memoryStorage({ [HINTS_STORAGE_KEY]: '{oops' })).size).toBe(0)
    expect(loadSeenHints(memoryStorage({ [HINTS_STORAGE_KEY]: '{"a":1}' })).size).toBe(0)
  })
})

describe('nextCompareHint', () => {
  const shortlist = {
    seen: new Set([COMPARE_INTRO]),
    step: 'shortlist',
    hasCard: true,
    decided: 0,
    canUndo: false,
    shortlistCount: 0,
  }

  test('nothing until the intro box is closed', () => {
    expect(nextCompareHint({ ...shortlist, seen: new Set() })).toBe(null)
  })

  test('each step starts with its two step-tab tips', () => {
    expect(nextCompareHint(shortlist)).toBe('cmp-here-shortlist')
    const seen = new Set([COMPARE_INTRO, 'cmp-here-shortlist'])
    expect(nextCompareHint({ ...shortlist, seen, hasCard: false })).toBe('cmp-next-score')
    expect(nextCompareHint({ ...shortlist, step: 'score' })).toBe('cmp-here-score')
    expect(
      nextCompareHint({ ...shortlist, step: 'score', seen: new Set([COMPARE_INTRO, 'cmp-here-score']) }),
    ).toBe('cmp-back-shortlist')
  })

  test('shortlist: decide, then undo after a decision, then review after 3', () => {
    const tabsSeen = [COMPARE_INTRO, 'cmp-here-shortlist', 'cmp-next-score']
    expect(nextCompareHint({ ...shortlist, seen: new Set(tabsSeen) })).toBe('cmp-decide')
    const seen = new Set([...tabsSeen, 'cmp-decide'])
    expect(nextCompareHint({ ...shortlist, seen })).toBe(null)
    expect(nextCompareHint({ ...shortlist, seen, canUndo: true, decided: 1 })).toBe('cmp-undo')
    seen.add('cmp-undo')
    expect(nextCompareHint({ ...shortlist, seen, canUndo: true, decided: 2 })).toBe(null)
    expect(nextCompareHint({ ...shortlist, seen, canUndo: true, decided: 3 })).toBe('cmp-review')
  })

  test('shortlist tips wait while every course is decided', () => {
    const seen = new Set([COMPARE_INTRO, 'cmp-here-shortlist', 'cmp-next-score'])
    expect(nextCompareHint({ ...shortlist, seen, hasCard: false })).toBe(null)
  })

  test('score: needs a shortlist, then goes in order', () => {
    const score = { ...shortlist, step: 'score', seen: new Set([COMPARE_INTRO, ...SCORE_HINTS.slice(0, 2)]) }
    expect(nextCompareHint(score)).toBe(null)
    expect(nextCompareHint({ ...score, shortlistCount: 2 })).toBe('cmp-rate')
    const seen = new Set([COMPARE_INTRO, ...SCORE_HINTS.slice(0, -1)])
    expect(nextCompareHint({ ...score, seen, shortlistCount: 2 })).toBe('cmp-ranking')
    seen.add('cmp-ranking')
    expect(nextCompareHint({ ...score, seen, shortlistCount: 2 })).toBe(null)
  })
})
