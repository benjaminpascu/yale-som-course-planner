import { describe, expect, it } from 'vitest'
import {
  guessUrls,
  latestStartedTerm,
  missingTerm,
  parseBiddingSheets,
  parseCourseCell,
  parsePoints,
  toBiddingCsv,
} from './biddingImport.js'

describe('parseCourseCell', () => {
  it('splits number, section and title', () => {
    expect(parseCourseCell('MGT 525-01 Competitive Strategy')).toEqual({
      courseNumber: 'MGT 525',
      section: '01',
      title: 'Competitive Strategy',
    })
  })
  it('skips old codes without a course number', () => {
    expect(parseCourseCell('GNWAIM GNW: Asian Institute of Management')).toBeNull()
    expect(parseCourseCell('')).toBeNull()
  })
})

describe('parsePoints', () => {
  it('keeps numbers, including 0', () => {
    expect(parsePoints(0)).toBe(0)
    expect(parsePoints(340)).toBe(340)
    expect(parsePoints('120')).toBe(120)
  })
  it('treats N/A and blanks as no result', () => {
    expect(parsePoints('N/A')).toBeNull()
    expect(parsePoints('n/a')).toBeNull()
    expect(parsePoints(null)).toBeNull()
    expect(parsePoints('')).toBeNull()
  })
})

describe('parseBiddingSheets', () => {
  const sheets = [
    {
      name: 'Spring 2026',
      rows: [
        ['Type', 'Seats', 'Open', 'Course', 'Round 1', 'Round 2', 'Round 3'],
        ['Elective', 34, 0, 'MGT 531-01 Interpersonal Dynamics', 258, 549, 0],
        ['Elective', 34, 0, 'MGT 531-01 Interpersonal Dynamics (again)', 1, 1, 0],
        ['IE', 32, 1, 'MGT 416-01 International Experience: Costa Rica', 50],
        ['IE', 32, 0, 'MGT 416-02 International Experience: Spain, Madrid', 300, 551],
      ],
    },
    {
      name: 'Fall 2018',
      rows: [
        ['Type', 'Course', 'Round 1 Clearing Price', 'Round 2 Clearing Price'],
        ['GNW', 'GNWAIM GNW: Manila', 0, 0],
        ['Elective', 'MGT 525-02 Competitive Strategy', 'N/A', 101],
      ],
    },
    { name: 'Notes', rows: [['anything']] },
  ]

  it('reads both header styles, keeps the first row per section, skips codes', () => {
    expect(parseBiddingSheets(sheets)).toEqual([
      { term: 'Spring 2026', courseNumber: 'MGT 531', section: '01', round1: 258, round2: 549, title: '' },
      {
        term: 'Spring 2026',
        courseNumber: 'MGT 416',
        section: '01',
        round1: 50,
        round2: null,
        title: 'International Experience: Costa Rica',
      },
      {
        term: 'Spring 2026',
        courseNumber: 'MGT 416',
        section: '02',
        round1: 300,
        round2: 551,
        title: 'International Experience: Spain, Madrid',
      },
      { term: 'Fall 2018', courseNumber: 'MGT 525', section: '02', round1: null, round2: 101, title: '' },
    ])
  })

  it('writes a CSV with the newest term first', () => {
    const csv = toBiddingCsv(parseBiddingSheets(sheets))
    expect(csv).toBe(
      [
        'term,course_number,section,round_1,round_2,title',
        'Spring 2026,MGT 416,01,50,,International Experience: Costa Rica',
        'Spring 2026,MGT 416,02,300,551,"International Experience: Spain, Madrid"',
        'Spring 2026,MGT 531,01,258,549,',
        'Fall 2018,MGT 525,02,,101,',
        '',
      ].join('\n'),
    )
  })
})

describe('keeping the file current', () => {
  it('guesses this month and last month', () => {
    expect(guessUrls(new Date(2027, 0, 1))).toEqual([
      'https://som.yale.edu/sites/default/files/2027-01/Auction-Bidding-History.xlsx',
      'https://som.yale.edu/sites/default/files/2026-12/Auction-Bidding-History.xlsx',
    ])
  })

  it('knows which semester has started', () => {
    expect(latestStartedTerm(new Date(2026, 10, 13))).toBe('Fall 2026')
    expect(latestStartedTerm(new Date(2026, 7, 31))).toBe('Spring 2026')
    expect(latestStartedTerm(new Date(2027, 0, 19))).toBe('Fall 2026')
    expect(latestStartedTerm(new Date(2027, 0, 20))).toBe('Spring 2027')
  })

  it('flags a started semester with no tab', () => {
    const tabs = ['Spring 2026', 'Fall 2025']
    expect(missingTerm(tabs, new Date(2026, 10, 13))).toBe('Fall 2026')
    expect(missingTerm(tabs, new Date(2026, 4, 1))).toBeNull()
  })
})
