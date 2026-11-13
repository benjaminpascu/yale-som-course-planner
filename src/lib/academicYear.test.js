import { describe, expect, it } from 'vitest'
import { getAcademicYears, getCatalogTerms, getDefaultTermCode } from './academicYear.js'

const courses = [
  { termCode: '202603', sessionStart: '2026-09-02', sessionEnd: '2026-10-16' },
  { termCode: '202603', sessionStart: '2026-12-05', sessionEnd: '2027-02-20' }, // EMBA course running into spring
  { termCode: '202701', sessionStart: '2026-03-22', sessionEnd: '2027-05-04' }, // Yale typo: wrong start year
  { termCode: '202701', sessionStart: '2027-01-19', sessionEnd: '2027-05-04' },
  { termCode: '202703', sessionStart: null, sessionEnd: null },
]

describe('getCatalogTerms', () => {
  it('hides a term once the next term starts', () => {
    expect(getCatalogTerms(courses, new Date(2027, 0, 18)).map((t) => t.id)).toEqual(['202603', '202701', '202703'])
    expect(getCatalogTerms(courses, new Date(2027, 0, 19)).map((t) => t.label)).toEqual(['Spring 2027', 'Fall 2027'])
  })

  it('hides a term the day after its last class when that comes first', () => {
    expect(getCatalogTerms(courses, new Date(2027, 4, 4)).map((t) => t.id)).toEqual(['202701', '202703'])
    expect(getCatalogTerms(courses, new Date(2027, 4, 5)).map((t) => t.id)).toEqual(['202703'])
  })

  it('keeps the newest term when every term is over', () => {
    const past = courses.slice(0, 4)
    expect(getCatalogTerms(past, new Date(2027, 6, 1)).map((t) => t.id)).toEqual(['202701'])
  })
})

describe('getDefaultTermCode', () => {
  it('opens on the earliest term that has not started yet', () => {
    expect(getDefaultTermCode(courses, new Date(2026, 7, 20))).toBe('202603')
    expect(getDefaultTermCode(courses, new Date(2026, 10, 13))).toBe('202701')
  })

  it('counts a term without start dates as not started', () => {
    expect(getDefaultTermCode(courses, new Date(2027, 0, 19))).toBe('202703')
  })

  it('falls back to the newest term once every term has started', () => {
    expect(getDefaultTermCode(courses.slice(0, 4), new Date(2027, 1, 1))).toBe('202701')
  })
})

describe('getAcademicYears', () => {
  it('gives the academic year around a term', () => {
    expect(getAcademicYears('202603')).toEqual({ fallYear: 2026, springYear: 2027 })
    expect(getAcademicYears('202701')).toEqual({ fallYear: 2026, springYear: 2027 })
    expect(getAcademicYears(null)).toEqual({ fallYear: null, springYear: null })
  })
})
