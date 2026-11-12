import { describe, expect, it } from 'vitest'
import { isOtherSchoolCourseId, isSomCourse, pickerSchools } from './schools.js'

describe('pickerSchools', () => {
  const courses = [
    { school: 'SOM', termCode: '202701' },
    { school: 'YC', termCode: '202701' },
    { school: 'DR', termCode: '202701' },
    { school: 'GB', termCode: '202701' },
    { school: 'AC', termCode: '202701' },
    { school: 'FS', termCode: '202603' },
  ]

  it('lists schools with courses in the term, in picker order then by name', () => {
    expect(pickerSchools(courses, '202701').map((s) => s.label)).toEqual([
      'School of Management',
      'Jackson School of Global Affairs',
      'Yale College',
      'School of Architecture',
      'School of Drama',
    ])
  })

  it('always lists SOM', () => {
    expect(pickerSchools([], '202701')).toEqual([{ id: 'SOM', label: 'School of Management' }])
  })
})

describe('course ids and schools', () => {
  it('tells other-school ids from SOM ids', () => {
    expect(isOtherSchoolCourseId('202701-GLBL5010-01')).toBe(true)
    expect(isOtherSchoolCourseId('21637')).toBe(false)
  })

  it('treats courses without a school as SOM', () => {
    expect(isSomCourse({})).toBe(true)
    expect(isSomCourse({ school: 'SOM' })).toBe(true)
    expect(isSomCourse({ school: 'GB' })).toBe(false)
  })
})
