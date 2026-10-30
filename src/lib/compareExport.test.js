import { describe, expect, test } from 'vitest'
import {
  buildProfessorsSheet,
  buildRankingSheet,
  exportFileName,
} from './compareExport'
import {
  createDefaultCompareStore,
  setNote,
  setProfessorNote,
  setProfessorRating,
  setScore,
} from './compareStorage'

const ODD_NOTE = '=SUM(A1)\nline two "quoted" 🎓'

const gA = {
  key: 'MGT 525|valuation|ft',
  courseNumber: 'MGT 525',
  title: 'Valuation',
  professors: ['Prof, A', 'Prof, B'],
  sessions: ['fall-1'],
  units: 2,
  tags: ['GBS Req', 'STEM'],
}
const gB = {
  key: 'MGT 611|policy|ft',
  courseNumber: 'MGT 611',
  title: 'Policy',
  professors: ['Prof, C'],
  sessions: ['fall'],
  units: 4,
  tags: [],
}
const gC = {
  key: 'MGT 700|empty|ft',
  courseNumber: 'MGT 700',
  title: 'Empty',
  professors: [],
  sessions: [],
  units: 1,
  tags: [],
}

function rankingStore() {
  let store = createDefaultCompareStore()
  store = setScore(store, gA.key, 'interesting', 6)
  store = setScore(store, gA.key, 'useful', 6)
  store = setScore(store, gB.key, 'interesting', 9)
  store = setScore(store, gB.key, 'useful', 9)
  store = setProfessorRating(store, 'Prof, B', 9)
  store = setNote(store, gA.key, ODD_NOTE)
  return store
}

describe('buildRankingSheet', () => {
  const { header, weightsRow, rows } = buildRankingSheet({
    groups: [gC, gA, gB],
    store: rankingStore(),
  })

  test('columns', () => {
    expect(header).toEqual([
      'Rank',
      'Course number',
      'Title',
      'Professor(s)',
      'Session',
      'Units',
      'Requirement tags',
      'Interesting',
      'Useful',
      'Professor rating',
      'Score',
      'Note',
    ])
  })

  test('weights row shows each share under its column', () => {
    expect(weightsRow[0]).toBe('Weight')
    expect(weightsRow.slice(7, 10)).toEqual([33, 33, 33])
    expect(weightsRow[10]).toBeNull()
  })

  test('rows sorted by score with unscored last, ranked 1..n', () => {
    expect(rows.map((r) => r[1])).toEqual(['MGT 611', 'MGT 525', 'MGT 700'])
    expect(rows.map((r) => r[0])).toEqual([1, 2, 3])
    expect(rows[0][10]).toBe(9)
    expect(rows[1][10]).toBe(7)
    expect(rows[2][10]).toBeNull()
  })

  test('joined professors, tags, readable session, professor rating', () => {
    const a = rows.find((r) => r[1] === 'MGT 525')
    expect(a[3]).toBe('Prof, A; Prof, B')
    expect(a[4]).toBe('Fall 1')
    expect(a[6]).toBe('GBS Req, STEM')
    expect(a[9]).toBe(9)
  })

  test('notes are exported verbatim', () => {
    expect(rows.find((r) => r[1] === 'MGT 525')[11]).toBe(ODD_NOTE)
    expect(rows.find((r) => r[1] === 'MGT 611')[11]).toBeNull()
  })
})

describe('buildProfessorsSheet', () => {
  test('lists only rated or noted professors, best first', () => {
    let store = createDefaultCompareStore()
    store = setProfessorRating(store, 'A', 4)
    store = setProfessorNote(store, 'A', 'great')
    store = setProfessorRating(store, 'B', 9)
    store = setProfessorNote(store, 'C', 'tbd')
    const sheet = buildProfessorsSheet(store)
    expect(sheet.header).toEqual(['Professor', 'Rating', 'Note'])
    expect(sheet.rows).toEqual([
      ['B', 9, ''],
      ['A', 4, 'great'],
      ['C', null, 'tbd'],
    ])
  })
})

describe('exportFileName', () => {
  test('slugs the term label', () => {
    expect(exportFileName('Spring 2027')).toBe('compare-courses-spring-2027.xlsx')
    expect(exportFileName('Fall 2026')).toBe('compare-courses-fall-2026.xlsx')
  })
})
