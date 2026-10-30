import { describe, expect, test } from 'vitest'
import { decisionCounts, shortlistCard, shortlistQueue } from './compareShortlist'

const groups = [{ key: 'a' }, { key: 'b' }, { key: 'c' }, { key: 'd' }]

describe('shortlistQueue', () => {
  test('skips decided courses and keeps catalog order', () => {
    expect(shortlistQueue(groups, { b: 'yes', c: 'no' }).map((g) => g.key)).toEqual(['a', 'd'])
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
  test('heading, professor, days, time, meta and syllabus from the course', () => {
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
    expect(card.meta).toBe('Economics · Bid')
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
    expect(card.meta).toBe('Economics')
    expect(card.syllabusUrl).toBeNull()
    expect(card.units).toBe('(1 unit)')
  })

  test('registration that repeats the category is shown once', () => {
    expect(
      shortlistCard(group([section({ category: 'Core', bidOrPermission: 'core' })])).meta,
    ).toBe('Core')
  })

  test('permission and other registration values', () => {
    expect(shortlistCard(group([section({ bidOrPermission: 'permission' })])).meta).toBe(
      'Economics · Permission',
    )
    expect(shortlistCard(group([section({ bidOrPermission: 'EMBA', category: '' })])).meta).toBe(
      'EMBA',
    )
  })
})
