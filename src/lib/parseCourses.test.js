import { describe, expect, it } from 'vitest'
import { YALE_COLUMNS } from '../../scripts/lib/yaleImport.js'
import { parseCoursesCsv } from './parseCourses.js'

describe('parseCoursesCsv with other-school files', () => {
  it('reads the School and Course Page columns, and defaults SOM rows', () => {
    const row = Object.fromEntries(YALE_COLUMNS.map((c) => [c, '']))
    Object.assign(row, {
      'Course ID': '202701-22220',
      'Course Number': 'LAW 21601',
      'Course Title': 'Administrative Law',
      TermCode: '202701',
      Units: '0',
      Visible: '1',
      School: 'LW',
      'Course Page': 'https://courses.law.yale.edu/CourseDetailPage?CRN=22220&TermCode=202701',
    })
    const csv = `${YALE_COLUMNS.join(',')}\n${YALE_COLUMNS.map((c) => row[c]).join(',')}\n`
    const [course] = parseCoursesCsv(csv)
    expect(course.school).toBe('LW')
    expect(course.coursePageUrl).toContain('CRN=22220')
    expect(course.units).toBe(0)

    const somCsv = `${YALE_COLUMNS.slice(0, -2).join(',')}\n${YALE_COLUMNS.slice(0, -2).map((c) => row[c]).join(',')}\n`
    expect(parseCoursesCsv(somCsv)[0].school).toBe('SOM')
  })
})
