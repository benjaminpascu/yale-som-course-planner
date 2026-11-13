import { describe, expect, test } from 'vitest'
import { clearSemester, coursesInSemester } from './planSemester'

const fall = { courseId: 'F1', termCode: '202603', session: 'Fall Full Term' }
const spring = { courseId: 'S1', termCode: '202701', session: 'Spring 1' }
const spring2 = { courseId: 'S2', termCode: '202701', session: 'Spring Full Term' }
const courseById = new Map([fall, spring, spring2].map((c) => [c.courseId, c]))

describe('coursesInSemester', () => {
  test('keeps only the semester on screen', () => {
    expect(coursesInSemester([fall, spring, spring2], '202701')).toEqual([spring, spring2])
    expect(coursesInSemester([fall, spring, spring2], '202603')).toEqual([fall])
  })

  test('no semester picked yet: everything', () => {
    expect(coursesInSemester([fall, spring], null)).toEqual([fall, spring])
  })
})

describe('clearSemester', () => {
  test('clears the semester on screen and keeps the other one', () => {
    const next = clearSemester(new Set(['F1', 'S1', 'S2']), courseById, '202701')
    expect([...next]).toEqual(['F1'])
  })

  test('keeps courses that have not loaded yet (other schools load later)', () => {
    const next = clearSemester(new Set(['S1', 'GB-999']), courseById, '202701')
    expect([...next]).toEqual(['GB-999'])
  })
})
