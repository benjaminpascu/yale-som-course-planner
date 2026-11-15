import { describe, expect, it } from 'vitest'
import {
  NO_DATA_COLOR,
  destinationOf,
  BIDDING_STOPS,
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

  it('shows only for SOM sections with at least one past result', () => {
    const noHistory = getBiddingRounds(course({ courseNumber: 'MGT 999' }), history)
    expect(showsBiddingHistory(course({ courseNumber: 'MGT 999' }), noHistory)).toBe(false)
    const withHistory = getBiddingRounds(course({ bidOrPermission: 'No' }), history)
    expect(showsBiddingHistory(course({ bidOrPermission: 'No' }), withHistory)).toBe(true)
    expect(showsBiddingHistory(course({ school: 'Yale College' }), withHistory)).toBe(false)
  })

  it('fades smoothly from white (0) to orange (50), red (100) and dark red (150+)', () => {
    expect(biddingColor(null)).toBe(NO_DATA_COLOR)
    expect([0, 50, 100, 150].map(biddingColor)).toEqual(BIDDING_STOPS.map((stop) => stop.color))
    expect(biddingColor(900)).toBe('#7f1d12')
    // In between: a blend, not the lower stop's color.
    expect(biddingColor(25)).toBe('#facd9e')
    expect(biddingColor(40)).not.toBe('#ffffff')
    expect(biddingColor(125)).toBe('#ac2f18')
  })

  it('formats points', () => {
    expect(formatPoints(null)).toBe('No data')
    expect(formatPoints(1)).toBe('1 point')
    expect(formatPoints(340)).toBe('340 points')
    expect(formatPoints(1, { short: true })).toBe('1 pt')
    expect(formatPoints(143, { short: true })).toBe('143 pts')
  })
})
