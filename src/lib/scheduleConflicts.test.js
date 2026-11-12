import { describe, expect, it } from 'vitest'
import { getConflictingCourseIds } from './scheduleConflicts.js'

const course = (courseId, overrides) => ({
  courseId,
  termCode: '202603',
  session: 'fall',
  sessionStart: null,
  sessionEnd: null,
  meetingDays: ['Fr'],
  startTime: '13:15',
  endTime: '16:15',
  ...overrides,
})

describe('getConflictingCourseIds across schools', () => {
  const som = course('22011', { school: 'SOM' })
  const somHalf = course('22012', { school: 'SOM', session: 'fall-2' })
  const jackson = course('202603-1234', { school: 'GB', startTime: '13:30', endTime: '15:25' })

  it('flags catalog courses that clash with a plan course from another school', () => {
    const ids = getConflictingCourseIds([som, somHalf], new Set([jackson.courseId]), [jackson])
    expect([...ids].sort()).toEqual(['22011', '22012'])
  })

  it('still works without the selected list (same-school catalog)', () => {
    expect([...getConflictingCourseIds([som, jackson], new Set([jackson.courseId]))]).toEqual(['22011'])
  })
})
