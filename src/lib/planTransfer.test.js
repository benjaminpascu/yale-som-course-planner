import { describe, expect, it } from 'vitest'
import {
  buildPlanExport,
  importPlansIntoStore,
  parsePlanImport,
  planExportFileName,
} from './planTransfer.js'

const courses = [
  { courseId: '1', courseNumber: 'MGT 527', section: '01', title: 'Strategy' },
  { courseId: '2', courseNumber: 'MGT 611', section: '02', title: 'Policy' },
]
const coursesById = new Map(courses.map((c) => [c.courseId, c]))

const store = {
  version: 1,
  activePlanId: 'a',
  plans: [
    { id: 'a', name: 'Plan A', courseIds: ['1', '2'], createdAt: 'x', updatedAt: 'x' },
    { id: 'b', name: 'Finance heavy', courseIds: [], createdAt: 'x', updatedAt: 'x' },
  ],
}

function roundTrip(plans) {
  return parsePlanImport(JSON.stringify(buildPlanExport(plans, coursesById)))
}

describe('planExportFileName', () => {
  it('dates the file', () => {
    expect(planExportFileName(new Date(2026, 10, 9))).toBe('som-course-plans-2026-11-09.json')
  })
})

describe('export → import', () => {
  it('keeps names and courses', () => {
    const imported = roundTrip(store.plans)
    expect(imported.map((p) => p.name)).toEqual(['Plan A', 'Finance heavy'])
    expect(imported[0].courses.map((c) => c.courseId)).toEqual(['1', '2'])
    expect(imported[0].courses[0].label).toBe('MGT 527-01 Strategy')
  })
})

describe('parsePlanImport', () => {
  it('rejects files that are not a plan export', () => {
    expect(() => parsePlanImport('not json')).toThrow()
    expect(() => parsePlanImport('{"hello": 1}')).toThrow()
    expect(() => parsePlanImport('{"app":"yale-som-course-planner","plans":[]}')).toThrow()
  })

  it('skips plans without a name', () => {
    const text = JSON.stringify({
      app: 'yale-som-course-planner',
      plans: [{ name: '  ', courses: [] }, { name: 'Ok', courses: [{ courseId: '1' }] }],
    })
    const imported = parsePlanImport(text)
    expect(imported.map((p) => p.name)).toEqual(['Ok'])
    expect(imported[0].courses[0].label).toBe('1')
  })
})

describe('importPlansIntoStore', () => {
  const valid = new Set(['1', '2'])

  it('add: keeps current plans and the open plan, renames clashing names', () => {
    const imported = roundTrip([{ name: 'Plan A', courseIds: ['2'] }, { name: 'New', courseIds: ['1'] }])
    const { store: next } = importPlansIntoStore(store, imported, { mode: 'add', validCourseIds: valid })
    expect(next.plans.map((p) => p.name)).toEqual(['Plan A', 'Finance heavy', 'Plan A (2)', 'New'])
    expect(next.activePlanId).toBe('a')
    expect(next.plans[2].courseIds).toEqual(['2'])
  })

  it('replace: drops current plans and opens the first imported one', () => {
    const imported = roundTrip([{ name: 'Plan A', courseIds: ['2'] }])
    const { store: next } = importPlansIntoStore(store, imported, { mode: 'replace', validCourseIds: valid })
    expect(next.plans.map((p) => p.name)).toEqual(['Plan A'])
    expect(next.activePlanId).toBe(next.plans[0].id)
  })

  it('leaves out courses no longer in the catalog and lists them once', () => {
    const imported = parsePlanImport(
      JSON.stringify({
        app: 'yale-som-course-planner',
        plans: [
          { name: 'X', courses: [{ courseId: '1' }, { courseId: '9', label: 'MGT 999-01 Gone' }] },
          { name: 'Y', courses: [{ courseId: '9', label: 'MGT 999-01 Gone' }] },
        ],
      }),
    )
    const { store: next, missing } = importPlansIntoStore(store, imported, {
      mode: 'add',
      validCourseIds: valid,
    })
    expect(next.plans.find((p) => p.name === 'X').courseIds).toEqual(['1'])
    expect(missing).toEqual(['MGT 999-01 Gone'])
  })
})
