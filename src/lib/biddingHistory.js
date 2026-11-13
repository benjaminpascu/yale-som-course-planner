/**
 * Bidding history: past clearing prices per section, from SOM's public
 * Auction-Bidding-History.xlsx (imported to docs/data-samples/bidding_history.csv
 * by scripts/update-bidding-history.js). Spec: docs/specs/bidding-history.md.
 *
 * A section is matched to past years by course number + section number only.
 */
import Papa from 'papaparse'
import { termCodeToCalendarYear, termCodeToSemester } from './academicYear'
import { normalizeBidType } from './courseDisplay'
import { isSomCourse } from './schools'

const keyOf = (term, courseNumber, section) =>
  `${term}|${courseNumber.trim()}|${String(section).trim().padStart(2, '0')}`

const toPoints = (value) => {
  const text = String(value ?? '').trim()
  return text === '' ? null : Number(text)
}

/** @returns {Map<string, { round1: number|null, round2: number|null }>} */
export function parseBiddingCsv(text) {
  const { data } = Papa.parse(text, { header: true, skipEmptyLines: true })
  const history = new Map()
  for (const row of data) {
    if (!row.term || !row.course_number) continue
    history.set(keyOf(row.term, row.course_number, row.section), {
      round1: toPoints(row.round_1),
      round2: toPoints(row.round_2),
    })
  }
  return history
}

/** The two past semesters of the same season, newest first: 202701 → ["Spring 2026", "Spring 2025"]. */
export function pastTermsFor(termCode) {
  const semester = termCodeToSemester(termCode)
  const year = termCodeToCalendarYear(termCode)
  if (!semester || year == null) return []
  const season = semester === 'fall' ? 'Fall' : 'Spring'
  return [`${season} ${year - 1}`, `${season} ${year - 2}`]
}

/**
 * The four squares for a section: Round 1 and 2 of last year, then of the year
 * before. `points` is null when there's no result.
 *
 * @returns {{ label: string, points: number|null }[]}
 */
export function getBiddingRounds(course, history) {
  return pastTermsFor(course.termCode).flatMap((term) => {
    const entry = history?.get(keyOf(term, course.courseNumber, course.section))
    return [
      { label: `Round 1, ${term}`, points: entry?.round1 ?? null },
      { label: `Round 2, ${term}`, points: entry?.round2 ?? null },
    ]
  })
}

/** SOM sections that need a bid, plus any SOM section that has history. */
export function showsBiddingHistory(course, rounds) {
  if (!isSomCourse(course) || rounds.length === 0) return false
  return (
    normalizeBidType(course.bidOrPermission) === 'bid' ||
    rounds.some((round) => round.points != null)
  )
}

/** Fixed color bands, the same for every course and year (spec: Colors). */
export const BIDDING_BANDS = [
  { min: 500, color: '#c2410c' },
  { min: 300, color: '#ea7a1f' },
  { min: 100, color: '#f9a94b' },
  { min: 1, color: '#fcd28c' },
  { min: 0, color: '#fde8b6' },
]
export const NO_DATA_COLOR = '#ebebee'

export function biddingColor(points) {
  if (points == null) return NO_DATA_COLOR
  return BIDDING_BANDS.find((band) => points >= band.min)?.color ?? NO_DATA_COLOR
}

export function formatPoints(points) {
  if (points == null) return 'No data'
  return `${points} ${points === 1 ? 'point' : 'points'}`
}

export const BIDDING_DISCLAIMER =
  'Based on past results for this section. Sections can change from year to year, so keep that in mind.'
