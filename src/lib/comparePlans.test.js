import { describe, expect, it } from 'vitest'
import {
  canComparePlans,
  initialCompareSlots,
  normalizeCompareSlots,
  savedPlanCourses,
  sharedCalendarCourses,
  setSlotPlan,
} from './comparePlans.js'

const plans = [
  { id: 'a', name: 'Plan A', courseIds: ['1', '2'] },
  { id: 'a2', name: 'Plan A (2)', courseIds: ['1', '3'] },
  { id: 'b', name: 'Finance heavy', courseIds: ['4'] },
]

const fall1 = { courseId: '1', termCode: '202603', session: 'fall-1', meetingDays: ['Mo'], startTime: '10:05', endTime: '11:25' }
const fall2 = { courseId: '2', termCode: '202603', session: 'fall-2', meetingDays: ['Tu'], startTime: '10:05', endTime: '11:25' }
const fallFull = { courseId: '3', termCode: '202603', session: 'fall', meetingDays: ['We'], startTime: '13:00', endTime: '14:20' }
const spring1 = { courseId: '4', termCode: '202701', session: 'spring-1', meetingDays: ['Th'], startTime: '13:00', endTime: '14:20' }
const untimed = { courseId: '5', termCode: '202603', session: 'fall-1', meetingDays: [], startTime: '', endTime: '' }

describe('canComparePlans', () => {
  it('needs at least two saved plans', () => {
    expect(canComparePlans([])).toBe(false)
    expect(canComparePlans(plans.slice(0, 1))).toBe(false)
    expect(canComparePlans(plans)).toBe(true)
  })
})

describe('initialCompareSlots', () => {
  it('puts the open plan on the left and the plan listed under it on the right', () => {
    expect(initialCompareSlots(plans, 'a')).toEqual(['a', 'a2'])
    expect(initialCompareSlots(plans, 'a2')).toEqual(['a2', 'b'])
  })

  it('uses the plan above when the open plan is last', () => {
    expect(initialCompareSlots(plans, 'b')).toEqual(['b', 'a2'])
  })

  it('starts from the first two plans when no plan is open', () => {
    expect(initialCompareSlots(plans, null)).toEqual(['a', 'a2'])
  })

  it('is null with fewer than two plans', () => {
    expect(initialCompareSlots(plans.slice(0, 1), 'a')).toBeNull()
  })
})

describe('setSlotPlan', () => {
  it('changes one side', () => {
    expect(setSlotPlan(['a', 'a2'], 1, 'b')).toEqual(['a', 'b'])
    expect(setSlotPlan(['a', 'a2'], 0, 'b')).toEqual(['b', 'a2'])
  })

  it('never shows the same plan on both sides', () => {
    const slots = ['a', 'a2']
    expect(setSlotPlan(slots, 1, 'a')).toBe(slots)
  })
})

describe('normalizeCompareSlots', () => {
  it('keeps valid slots that include the open plan', () => {
    const slots = ['a', 'b']
    expect(normalizeCompareSlots(slots, plans, 'b')).toBe(slots)
  })

  it('puts a newly opened plan on the side that is being edited', () => {
    // Left was being edited (and was "a"); the open plan is now "b".
    expect(normalizeCompareSlots(['a', 'a2'], plans, 'b', 0)).toEqual(['b', 'a2'])
    expect(normalizeCompareSlots(['a', 'a2'], plans, 'b', 1)).toEqual(['a', 'b'])
  })

  it('leaves the sides alone when the open plan is already on the other side', () => {
    const slots = ['a', 'a2']
    expect(normalizeCompareSlots(slots, plans, 'a2', 0)).toBe(slots)
  })

  it('replaces a deleted plan', () => {
    const remaining = plans.filter((p) => p.id !== 'a2')
    expect(normalizeCompareSlots(['a', 'a2'], remaining, 'a', 0)).toEqual(['a', 'b'])
  })

  it('is null when fewer than two plans are left', () => {
    expect(normalizeCompareSlots(['a', 'a2'], plans.slice(0, 1), 'a', 0)).toBeNull()
  })
})

describe('savedPlanCourses', () => {
  it('returns the saved courses of a plan that still exist in the catalog', () => {
    const courses = [fall1, fall2, fallFull]
    expect(savedPlanCourses(plans[1], courses)).toEqual([fall1, fallFull])
    expect(savedPlanCourses(null, courses)).toEqual([])
  })
})

describe('sharedCalendarCourses', () => {
  it('combines both plans for the session switch, this semester and timed courses only', () => {
    const left = [fall1, untimed, spring1]
    const right = [fall1, fall2, fallFull]
    expect(sharedCalendarCourses([left, right], '202603')).toEqual([fall1, fall2, fallFull])
    expect(sharedCalendarCourses([left, right], '202701')).toEqual([spring1])
  })
})
