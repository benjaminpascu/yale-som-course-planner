import { describe, expect, it } from 'vitest'
import { departmentLabel } from './departments.js'
import { createEmptyFilters, filterCourses, hasActiveFilters, uniqueSubjects } from './filterCourses.js'

const course = (courseNumber) => ({
  courseNumber,
  title: courseNumber,
  faculty: '',
  description: '',
  session: 'fall',
  units: 0,
  category: '',
  bidOrPermission: '',
  tags: [],
  meetingDays: [],
  startTime: null,
  endTime: null,
})

describe('Department filter', () => {
  const courses = [course('ECON 3365'), course('PLSC 2101'), course('ECON 1110')]

  it('lists departments and labels them like Yale', () => {
    expect(uniqueSubjects(courses)).toEqual(['ECON', 'PLSC'])
    expect(departmentLabel('ECON')).toBe('Economics (ECON)')
    expect(departmentLabel('ZZZZ')).toBe('ZZZZ')
  })

  it('keeps only the ticked departments', () => {
    const filters = { ...createEmptyFilters(), subjects: new Set(['ECON']) }
    expect(filterCourses(courses, filters).map((c) => c.courseNumber)).toEqual(['ECON 3365', 'ECON 1110'])
    expect(hasActiveFilters(filters)).toBe(true)
    expect(hasActiveFilters(createEmptyFilters())).toBe(false)
  })

  it('counts a cross-listed course under every department and finds it by any number', () => {
    const algorithms = { ...course('CPSC 3650'), crossListings: ['ECON 3365'] }
    expect(uniqueSubjects([algorithms])).toEqual(['CPSC', 'ECON'])
    const econ = { ...createEmptyFilters(), subjects: new Set(['ECON']) }
    expect(filterCourses([algorithms], econ)).toHaveLength(1)
    const search = { ...createEmptyFilters(), search: 'econ 3365' }
    expect(filterCourses([algorithms], search)).toHaveLength(1)
  })
})
