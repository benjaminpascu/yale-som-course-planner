import { describe, expect, it } from 'vitest'
import { getAcademicYears, getCatalogTerms } from './academicYear.js'

const courses = [
  { termCode: '202603', sessionEnd: '2026-10-16' },
  { termCode: '202603', sessionEnd: '2026-12-11' },
  { termCode: '202701', sessionEnd: '2027-05-04' },
  { termCode: '202703', sessionEnd: null },
]

describe('getCatalogTerms', () => {
  it('hides a term the day after its last class', () => {
    expect(getCatalogTerms(courses, new Date(2026, 11, 11)).map((t) => t.id)).toEqual(['202603', '202701', '202703'])
    expect(getCatalogTerms(courses, new Date(2026, 11, 12)).map((t) => t.label)).toEqual(['Spring 2027', 'Fall 2027'])
  })

  it('keeps the newest term when every term is over', () => {
    const past = courses.slice(0, 3)
    expect(getCatalogTerms(past, new Date(2027, 6, 1)).map((t) => t.id)).toEqual(['202701'])
  })
})

describe('getAcademicYears', () => {
  it('gives the academic year around a term', () => {
    expect(getAcademicYears('202603')).toEqual({ fallYear: 2026, springYear: 2027 })
    expect(getAcademicYears('202701')).toEqual({ fallYear: 2026, springYear: 2027 })
    expect(getAcademicYears(null)).toEqual({ fallYear: null, springYear: null })
  })
})
