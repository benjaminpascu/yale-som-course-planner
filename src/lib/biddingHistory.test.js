import { describe, expect, it } from 'vitest'
import {
  NO_DATA_COLOR,
  destinationOf,
  biddingColor,
  formatPoints,
  getBiddingRounds,
  parseBiddingCsv,
  pastTermsFor,
  showsBiddingHistory,
} from './biddingHistory'

const csv = [
  'term,course_number,section,round_1,round_2,title',
  'Spring 2026,MGT 531,01,258,549',
  'Spring 2026,MGT 531,02,0,',
  'Spring 2025,MGT 531,01,,12',
  'Spring 2026,MGT 416,02,0,0,International Experience: India',
  'Spring 2026,MGT 416,03,0,21,International Experience: Mexico',
  'Spring 2025,MGT 416,02,300,551,International Experience: Spain',
  'Spring 2025,MGT 416,05,1,11,"International Experience: India, Bangalore"',
].join('\n')

const course = (overrides = {}) => ({
  courseNumber: 'MGT 531',
  section: '01',
  termCode: '202701',
  bidOrPermission: 'bid',
  ...overrides,
})

describe('bidding history', () => {
  const history = parseBiddingCsv(csv)

  it('uses the same season of the last two years', () => {
    expect(pastTermsFor('202701')).toEqual(['Spring 2026', 'Spring 2025'])
    expect(pastTermsFor('202603')).toEqual(['Fall 2025', 'Fall 2024'])
    expect(pastTermsFor('')).toEqual([])
  })

  it('gives four rounds for the exact section, newest first', () => {
    expect(getBiddingRounds(course(), history)).toEqual([
      { label: 'Round 1, Spring 2026', points: 258 },
      { label: 'Round 2, Spring 2026', points: 549 },
      { label: 'Round 1, Spring 2025', points: null },
      { label: 'Round 2, Spring 2025', points: 12 },
    ])
  })

  it('never mixes sections', () => {
    const rounds = getBiddingRounds(course({ section: '02' }), history)
    expect(rounds.map((r) => r.points)).toEqual([0, null, null, null])
  })

  it('matches trips that share a number by destination, not section', () => {
    expect(destinationOf('IE: South Korea')).toBe('south korea')
    expect(destinationOf('International Experience: South Korea')).toBe('south korea')
    const india = course({ courseNumber: 'MGT 416', section: '02', title: 'IE: India' })
    expect(getBiddingRounds(india, history).map((r) => r.points)).toEqual([0, 0, null, null])
    const mexico = course({ courseNumber: 'MGT 416', section: '07', title: 'IE: Mexico' })
    expect(getBiddingRounds(mexico, history).map((r) => r.points)).toEqual([0, 21, null, null])
  })

  it('shows for bid courses and for any SOM course with history', () => {
    const noHistory = getBiddingRounds(course({ courseNumber: 'MGT 999' }), history)
    expect(showsBiddingHistory(course({ courseNumber: 'MGT 999' }), noHistory)).toBe(true)
    expect(
      showsBiddingHistory(course({ courseNumber: 'MGT 999', bidOrPermission: 'No' }), noHistory),
    ).toBe(false)
    const withHistory = getBiddingRounds(course({ bidOrPermission: 'No' }), history)
    expect(showsBiddingHistory(course({ bidOrPermission: 'No' }), withHistory)).toBe(true)
    expect(showsBiddingHistory(course({ school: 'Yale College' }), withHistory)).toBe(false)
  })

  it('colors by fixed bands', () => {
    expect(biddingColor(null)).toBe(NO_DATA_COLOR)
    const colors = [0, 1, 99, 100, 299, 300, 499, 500, 900].map(biddingColor)
    expect(new Set(colors).size).toBe(5)
    expect(colors[1]).toBe(colors[2])
    expect(colors[7]).toBe(colors[8])
    expect(colors[0]).not.toBe(colors[1])
  })

  it('formats points', () => {
    expect(formatPoints(null)).toBe('No data')
    expect(formatPoints(1)).toBe('1 point')
    expect(formatPoints(340)).toBe('340 points')
  })
})
