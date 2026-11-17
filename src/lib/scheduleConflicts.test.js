import { describe, expect, it } from 'vitest'
import { getConflictingCourseIds, getConflictsByCourseId } from './scheduleConflicts.js'

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

describe('getConflictsByCourseId', () => {
  const planA = course('A', { startTime: '13:00', endTime: '14:00' })
  const planB = course('B', { startTime: '15:00', endTime: '16:00' })
  const planC = course('C', { meetingDays: ['Mo'] })
  const row = course('X')
  const free = course('Y', { meetingDays: ['Tu'] })

  it('lists every plan course a catalog course clashes with, in plan order', () => {
    const map = getConflictsByCourseId([row, free], new Set(['A', 'B', 'C']), [planA, planB, planC])
    expect(map.get('X').map((c) => c.courseId)).toEqual(['A', 'B'])
    expect(map.has('Y')).toBe(false)
  })

  it('leaves plan courses themselves out', () => {
    const map = getConflictsByCourseId([planA, row], new Set(['A']), [planA])
    expect([...map.keys()]).toEqual(['X'])
  })
})
