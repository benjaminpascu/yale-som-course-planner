import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { buildCourseGroups } from './compareGroups'
import { parseCoursesCsv } from './parseCourses'

function sec(overrides = {}) {
  return {
    courseNumber: 'MGT 525',
    title: 'Valuation',
    category: 'Finance',
    faculty: 'Prof, A',
    units: 4,
    tags: [],
    session: 'fall',
    termCode: '202609',
    ...overrides,
  }
}

describe('course keys (where Compare files a course\'s decisions, ratings and notes)', () => {
  test('a course with one title is keyed by number and program, so fixing the title keeps its data', () => {
    const [before] = buildCourseGroups([sec({ title: 'Valuaton' })])
    const [after] = buildCourseGroups([sec({ title: 'Valuation' })])
    expect(before.key).toBe('MGT 525|ft')
    expect(after.key).toBe(before.key)
  })

  test('the title is added only when one number covers several courses', () => {
    const keys = buildCourseGroups([
      sec({ courseNumber: 'MGT 416', title: 'IE: Japan' }),
      sec({ courseNumber: 'MGT 416', title: 'IE: Kenya' }),
      sec({ courseNumber: 'MGT 525', title: 'Valuation' }),
    ]).map((g) => g.key)
    expect(keys).toEqual(['MGT 416|ie: japan|ft', 'MGT 416|ie: kenya|ft', 'MGT 525|ft'])
  })

  test('title match is trimmed and case-insensitive', () => {
    const groups = buildCourseGroups([
      sec({ courseNumber: 'MGT 416', title: ' IE: Japan ' }),
      sec({ courseNumber: 'MGT 416', title: 'ie: japan' }),
      sec({ courseNumber: 'MGT 416', title: 'IE: Kenya' }),
    ])
    expect(groups.map((g) => g.sections.length)).toEqual([2, 1])
  })

  test('EMBA sections get their own key', () => {
    const keys = buildCourseGroups([
      sec({ courseNumber: 'MGT 408', category: 'Core' }),
      sec({ courseNumber: 'MGT 408', category: 'EMBA' }),
    ]).map((g) => g.key)
    expect(keys).toEqual(['MGT 408|ft', 'MGT 408|emba'])
  })
})

describe('buildCourseGroups', () => {
  test('IE trips with one course number become separate groups', () => {
    const groups = buildCourseGroups([
      sec({ courseNumber: 'MGT 416', title: 'IE: Japan', faculty: 'A' }),
      sec({ courseNumber: 'MGT 416', title: 'IE: Kenya', faculty: 'B' }),
    ])
    expect(groups.map((g) => g.title)).toEqual(['IE: Japan', 'IE: Kenya'])
  })

  test('EMBA section splits from full-time section with same number and title', () => {
    const groups = buildCourseGroups([
      sec({ courseNumber: 'MGT 408', title: 'X', category: 'Core', faculty: 'Nalebuff, Barry' }),
      sec({ courseNumber: 'MGT 408', title: 'X', category: 'EMBA', faculty: 'Cain, Daylian' }),
    ])
    expect(groups).toHaveLength(2)
    expect(groups[0].professors).toEqual(['Nalebuff, Barry'])
    expect(groups[1].isEmba).toBe(true)
  })

  test('multi-section group: unique professors in order, most common units, unit variants', () => {
    const [group] = buildCourseGroups([
      sec({ faculty: 'Zimmerman, Seth', units: 3 }),
      sec({ faculty: 'Zimmerman, Seth', units: 3 }),
      sec({ faculty: 'Seim, Katja', units: 4 }),
    ])
    expect(group.professors).toEqual(['Zimmerman, Seth', 'Seim, Katja'])
    expect(group.units).toBe(3)
    expect(group.unitVariants).toEqual([3, 4])
    expect(group.sections).toHaveLength(3)
  })

  test('tags are the sorted union and sessions keep section order', () => {
    const [group] = buildCourseGroups([
      sec({ tags: ['STEM'], session: 'fall-2' }),
      sec({ tags: ['GBS Req', 'STEM'], session: 'fall-1' }),
    ])
    expect(group.tags).toEqual(['GBS Req', 'STEM'])
    expect(group.sessions).toEqual(['fall-2', 'fall-1'])
  })
})

describe('real catalog data', () => {
  const read = (name) =>
    parseCoursesCsv(
      readFileSync(new URL(`../../docs/data-samples/${name}`, import.meta.url), 'utf8'),
    )

  test('Spring 2027 MGT 416 becomes ten International Experience rows', () => {
    const spring = read('courses_master_spring2027.csv')
    const ie = buildCourseGroups(spring).filter((g) => g.courseNumber === 'MGT 416')
    expect(ie).toHaveLength(10)
  })
})
