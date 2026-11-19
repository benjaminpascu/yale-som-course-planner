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
  recentTermsFor,
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
  'Fall 2025,MGT 674,01,376,580',
  'Fall 2024,MGT 674,01,310,600',
  'Fall 2023,MGT 674,01,298,600',
  'Fall 2025,MGT 531,01,999,999',
  'Fall 2025,MGT 777,01,,',
  'Spring 2024,MGT 777,01,40,',
  'Spring 2023,MGT 888,01,50,60',
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

  it('lists the six semesters before this one, both seasons', () => {
    expect(recentTermsFor('202701')).toEqual([
      'Fall 2026', 'Spring 2026', 'Fall 2025', 'Spring 2025', 'Fall 2024', 'Spring 2024',
    ])
    expect(recentTermsFor('202603')[0]).toBe('Spring 2026')
    expect(recentTermsFor('')).toEqual([])
  })

  it('uses the other season when the same season has no results (course moved semesters)', () => {
    const moved = course({ courseNumber: 'MGT 674', section: '01' })
    expect(getBiddingRounds(moved, history)).toEqual([
      { label: 'Round 1, Fall 2025', points: 376 },
      { label: 'Round 2, Fall 2025', points: 580 },
      { label: 'Round 1, Fall 2024', points: 310 },
      { label: 'Round 2, Fall 2024', points: 600 },
    ])
  })

  it('keeps the same season when it has a result', () => {
    expect(getBiddingRounds(course(), history).map((r) => r.label)).toEqual([
      'Round 1, Spring 2026', 'Round 2, Spring 2026', 'Round 1, Spring 2025', 'Round 2, Spring 2025',
    ])
  })

  it('never borrows another section and skips semesters without results', () => {
    const newSection = course({ courseNumber: 'MGT 674', section: '02' })
    expect(showsBiddingHistory(newSection, getBiddingRounds(newSection, history))).toBe(false)
    // Fall 2025 row has no numbers, so only Spring 2024 is shown.
    expect(getBiddingRounds(course({ courseNumber: 'MGT 777' }), history)).toEqual([
      { label: 'Round 1, Spring 2024', points: 40 },
      { label: 'Round 2, Spring 2024', points: null },
    ])
  })

  it('ignores results older than three years', () => {
    const old = course({ courseNumber: 'MGT 888' })
    expect(showsBiddingHistory(old, getBiddingRounds(old, history))).toBe(false)
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
