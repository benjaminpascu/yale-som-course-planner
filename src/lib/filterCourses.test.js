import { describe, expect, it } from 'vitest'
import { parseBiddingCsv } from './biddingHistory'
import {
  countBiddingFilters,
  createEmptyFilters,
  filterByBidding,
  filterByConflicts,
  hasActiveFilters,
  minPoints,
} from './filterCourses'

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

describe('Filters → Bidding', () => {
  const history = parseBiddingCsv(
    [
      'term,course_number,section,round_1,round_2,title',
      // MGT 100: Round 1 averages 60, Round 2 averages 150.
      'Spring 2026,MGT 100,01,0,100',
      'Spring 2025,MGT 100,01,120,200',
      // MGT 200: Round 1 averages 40 (gray square skipped), Round 2 averages 300.
      'Spring 2026,MGT 200,01,40,',
      'Spring 2025,MGT 200,01,,300',
    ].join('\n'),
  )
  const course = (courseId, courseNumber) => ({
    courseId,
    courseNumber,
    section: '01',
    termCode: '202701',
    bidOrPermission: 'bid',
  })
  // MGT 300 has no past results.
  const list = [course('a', 'MGT 100'), course('b', 'MGT 200'), course('c', 'MGT 300')]
  const run = (minRound1, minRound2) => ids(filterByBidding(list, { minRound1, minRound2 }, history))

  it('reads the boxes as whole points; empty, 0 or junk means no minimum', () => {
    expect(minPoints('')).toBe(0)
    expect(minPoints('0')).toBe(0)
    expect(minPoints('50')).toBe(50)
    expect(minPoints('abc')).toBe(0)
  })

  it('empty or 0 keeps everything, including courses without history', () => {
    expect(run('', '')).toEqual(['a', 'b', 'c'])
    expect(run('0', '0')).toEqual(['a', 'b', 'c'])
  })

  it('keeps sections whose average for that round is at least the number', () => {
    expect(run('50', '')).toEqual(['a'])
    expect(run('40', '')).toEqual(['a', 'b'])
    expect(run('', '200')).toEqual(['b'])
  })

  it('with both boxes filled, a section must meet both', () => {
    expect(run('50', '200')).toEqual([])
    expect(run('40', '150')).toEqual(['a', 'b'])
  })

  it('hides courses without past results once a box is filled', () => {
    expect(run('1', '')).not.toContain('c')
  })

  it('counts each filled box once and resets with Clear (empty filters)', () => {
    const filters = createEmptyFilters()
    expect(filters.minRound1).toBe('')
    expect(filters.minRound2).toBe('')
    expect(hasActiveFilters(filters)).toBe(false)
    expect(countBiddingFilters(filters)).toBe(0)
    expect(hasActiveFilters({ ...filters, minRound2: '100' })).toBe(true)
    expect(countBiddingFilters({ ...filters, minRound1: '50', minRound2: '0' })).toBe(1)
  })
})
