import { describe, expect, test } from 'vitest'
import {
  HINTS_STORAGE_KEY,
  PLANNER_HINTS,
  loadSeenHints,
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

  test('clash tip waits for the first course', () => {
    const seen = new Set(['add-course'])
    expect(nextPlannerHint({ ...base, seen })).toBe(null)
    expect(nextPlannerHint({ ...base, seen, selectedCount: 1 })).toBe('clash')
  })

  test('then calendar, requirements, set targets, your plan (computer only)', () => {
    const seen = new Set(['add-course', 'clash'])
    expect(nextPlannerHint({ ...base, seen, selectedCount: 1 })).toBe('calendar-details')
    seen.add('calendar-details')
    expect(nextPlannerHint({ ...base, seen, selectedCount: 1 })).toBe('requirements')
    seen.add('requirements')
    expect(nextPlannerHint({ ...base, seen, selectedCount: 1 })).toBe('set-targets')
    seen.add('set-targets')
    expect(nextPlannerHint({ ...base, seen, selectedCount: 1 })).toBe('your-plan')
    seen.add('phone-courses')
    expect(nextPlannerHint({ ...base, seen, selectedCount: 3, phone: true })).toBe('save-plan')
  })

  test('save tip needs 3 courses and no saved plan', () => {
    const seen = new Set(PLANNER_HINTS.filter((id) => id !== 'save-plan'))
    expect(nextPlannerHint({ ...base, seen, selectedCount: 2 })).toBe(null)
    expect(nextPlannerHint({ ...base, seen, selectedCount: 3 })).toBe('save-plan')
    expect(nextPlannerHint({ ...base, seen, selectedCount: 3, hasPlan: true })).toBe(null)
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
