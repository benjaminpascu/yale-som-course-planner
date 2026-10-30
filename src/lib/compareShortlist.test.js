import { describe, expect, test } from 'vitest'
import {
  decisionCounts,
  orderGroups,
  reviewList,
  shortlistCard,
  shortlistQueue,
} from './compareShortlist'

const groups = [{ key: 'a' }, { key: 'b' }, { key: 'c' }, { key: 'd' }]

describe('shortlistQueue', () => {
  test('skips decided courses and keeps catalog order', () => {
    expect(shortlistQueue(groups, { b: 'yes', c: 'no' }).map((g) => g.key)).toEqual(['a', 'd'])
  })
})

describe('orderGroups', () => {
  test('follows the saved order; courses without a place go last in catalog order', () => {
    expect(orderGroups(groups, ['c', 'a']).map((g) => g.key)).toEqual(['c', 'a', 'b', 'd'])
  })
})

describe('reviewList', () => {
  const courses = [
    { key: 'a', courseNumber: 'MGT 525', title: 'Valuation', professors: ['Majd, Saman'] },
    { key: 'b', courseNumber: 'MGT 611', title: 'Policy Modeling', professors: ['Monachou, Faidra'] },
    { key: 'c', courseNumber: 'MGT 805', title: 'Fixed Income', professors: ['Majd, Saman'] },
    { key: 'd', courseNumber: 'MGT 900', title: 'Derivatives', professors: [] },
  ]
  const decisions = { a: 'no', b: 'no', c: 'yes' }

  test('lists courses with that decision, in course-number order', () => {
    expect(reviewList(courses, decisions, 'no', '').map((g) => g.key)).toEqual(['a', 'b'])
    expect(reviewList(courses, decisions, 'maybe', '')).toEqual([])
  })

  test('search matches number, title or professor, ignoring case and spaces', () => {
    expect(reviewList(courses, decisions, 'no', 'policy').map((g) => g.key)).toEqual(['b'])
    expect(reviewList(courses, decisions, 'no', ' mgt525 ').map((g) => g.key)).toEqual(['a'])
    expect(reviewList(courses, decisions, 'no', 'majd').map((g) => g.key)).toEqual(['a'])
  })
})

describe('decisionCounts', () => {
  test('counts only courses in this term', () => {
    expect(decisionCounts(groups, { a: 'yes', b: 'maybe', c: 'no', gone: 'yes' })).toEqual({
      yes: 1,
      maybe: 1,
      no: 1,
      decided: 3,
      total: 4,
    })
  })
})

function section(overrides = {}) {
  return {
    courseNumber: 'MGT 537',
    title: 'Inequality and Social Mobility',
    units: 2,
    faculty: 'Biasi, Barbara',
    session: 'fall-1',
    meetingDays: ['Tu', 'Th'],
    startTime: '10:05',
    endTime: '11:25',
    category: 'Economics',
    bidOrPermission: 'bid',
    description: 'Why do some people move up…',
    syllabusUrl: 'https://example.edu/s.pdf',
    tags: [],
    ...overrides,
  }
}

function group(sections, extra = {}) {
  return {
    key: 'k',
    courseNumber: sections[0].courseNumber,
    title: sections[0].title,
    sections,
    professors: [...new Set(sections.map((s) => s.faculty))],
    units: sections[0].units,
    tags: sections[0].tags,
    sessions: [sections[0].session],
    ...extra,
  }
}

describe('shortlistCard', () => {
  test('heading, professor, days, time, category and syllabus from the course', () => {
    const card = shortlistCard(group([section()]))
    expect(card.heading).toBe('MGT 537 — Inequality and Social Mobility')
    expect(card.units).toBe('(2 units)')
    expect(card.professors).toBe('Biasi, Barbara')
    expect(card.days).toEqual([
      { letter: 'M', on: false },
      { letter: 'T', on: true },
      { letter: 'W', on: false },
      { letter: 'T', on: true },
      { letter: 'F', on: false },
    ])
    expect(card.daysLabel).toBe('Meets Tuesday and Thursday')
    expect(card.time).toBe('10:05–11:25')
    expect(card.category).toBe('Economics')
    expect(card).not.toHaveProperty('meta')
    expect(card.session).toBe('Fall 1')
    expect(card.syllabusUrl).toBe('https://example.edu/s.pdf')
  })

  test('several professors are joined with a slash', () => {
    const card = shortlistCard(
      group([section(), section({ faculty: 'Seim, Katja' })]),
    )
    expect(card.professors).toBe('Biasi, Barbara / Seim, Katja')
  })

  test('no meeting time, open enrollment, no syllabus', () => {
    const card = shortlistCard(
      group([
        section({
          meetingDays: [],
          startTime: null,
          endTime: null,
          bidOrPermission: 'no',
          syllabusUrl: null,
          units: 1,
        }),
      ]),
    )
    expect(card.time).toBeNull()
    expect(card.days.every((d) => !d.on)).toBe(true)
    expect(card.syllabusUrl).toBeNull()
    expect(card.units).toBe('(1 unit)')
  })

  test('category uses the display name; empty category is empty', () => {
    expect(shortlistCard(group([section({ category: 'Business and the Law' })])).category).toBe(
      'Business & the Law',
    )
    expect(shortlistCard(group([section({ category: '' })])).category).toBe('')
  })
})
