import { describe, expect, it } from 'vitest'
import { computePlanUnitTotal, computeTagUnitTotals, courseSemester } from './tagUnitTracker.js'

const course = (courseNumber, session, units, tags = []) => ({
  courseNumber,
  title: courseNumber,
  session,
  units,
  tags,
})

const plan = [
  course('MGT 510', 'fall', 4, ['STEM']),
  course('MGT 402', 'fall-1', 2),
  course('MGT 523', 'spring', 4, ['GBS Req']),
]

describe('computePlanUnitTotal', () => {
  it('adds every course once, whatever its tags', () => {
    const row = computePlanUnitTotal(plan)
    expect(row.label).toBe('Total')
    expect(row.totalUnits).toBe(10)
    expect(row.isTotal).toBe(true)
  })

  it('counts one semester when given only that semester', () => {
    const fall = plan.filter((c) => courseSemester(c) === 'fall')
    expect(computePlanUnitTotal(fall).totalUnits).toBe(6)
    expect(computePlanUnitTotal(fall).contributorGroups.map((g) => [g.session, g.units])).toEqual([
      ['fall', 4],
      ['fall-1', 2],
    ])
  })
})

describe('computeTagUnitTotals', () => {
  it('still counts only courses with the tag', () => {
    const [stem] = computeTagUnitTotals(plan, ['STEM'])
    expect(stem.totalUnits).toBe(4)
  })
})
