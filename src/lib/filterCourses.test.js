import { describe, expect, it } from 'vitest'
import { createEmptyFilters, filterByConflicts, hasActiveFilters } from './filterCourses'

const courses = [{ courseId: 'a' }, { courseId: 'b' }, { courseId: 'c' }, { courseId: 'd' }]
const ids = (list) => list.map((c) => c.courseId)
// 'a' is in the plan; 'b' conflicts with it; 'c' and 'd' fit.
const selectedIds = new Set(['a'])
const conflictingIds = new Set(['b'])

describe('filterByConflicts', () => {
  it('keeps everything when no Conflicts option is ticked', () => {
    expect(ids(filterByConflicts(courses, new Set(), conflictingIds, selectedIds))).toEqual(['a', 'b', 'c', 'd'])
  })

  it('Only: conflicting courses plus the courses already in the plan', () => {
    expect(ids(filterByConflicts(courses, new Set(['only']), conflictingIds, selectedIds))).toEqual(['a', 'b'])
  })

  it('Hide: everything that still fits, plan courses included', () => {
    expect(ids(filterByConflicts(courses, new Set(['hide']), conflictingIds, selectedIds))).toEqual(['a', 'c', 'd'])
  })
})

describe('Conflicts filter state', () => {
  it('starts empty and counts as an active filter once ticked', () => {
    const filters = createEmptyFilters()
    expect(filters.conflicts.size).toBe(0)
    expect(hasActiveFilters(filters)).toBe(false)
    expect(hasActiveFilters({ ...filters, conflicts: new Set(['only']) })).toBe(true)
  })
})
