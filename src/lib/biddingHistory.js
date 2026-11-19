/**
 * Bidding history: past clearing prices per section, from SOM's public
 * Auction-Bidding-History.xlsx (imported to docs/data-samples/bidding_history.csv
 * by scripts/update-bidding-history.js). Spec: docs/specs/bidding-history.md.
 *
 * A section is matched to past years by course number + section number only.
 * Exception: where one course number covered different courses in a past
 * semester (the MGT 416 trips: section 02 was Spain, now India), the file keeps
 * their titles and the match is by destination ("IE: India" ↔
 * "International Experience: India") instead of section.
 */
import Papa from 'papaparse'
import { termCodeToCalendarYear, termCodeToSemester } from './academicYear'
import { isSomCourse } from './schools'

const keyOf = (term, courseNumber, section) =>
  `${term}|${courseNumber.trim()}|${String(section).trim().padStart(2, '0')}`

/** "International Experience: South Korea" and "IE: South Korea" → "south korea" */
export function destinationOf(title) {
  const text = String(title ?? '')
  const afterColon = text.includes(':') ? text.slice(text.indexOf(':') + 1) : text
  return afterColon.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

const toPoints = (value) => {
  const text = String(value ?? '').trim()
  return text === '' ? null : Number(text)
}

/**
 * @returns {{ rounds: Map<string, { round1: number|null, round2: number|null }>, byTitle: Set<string> }}
 *   `byTitle` holds "term|course number" pairs that are matched by destination.
 */
export function parseBiddingCsv(text) {
  const { data } = Papa.parse(text, { header: true, skipEmptyLines: true })
  const rounds = new Map()
  const byTitle = new Set()
  for (const row of data) {
    if (!row.term || !row.course_number) continue
    const entry = { round1: toPoints(row.round_1), round2: toPoints(row.round_2) }
    if (row.title?.trim()) {
      byTitle.add(`${row.term}|${row.course_number.trim()}`)
      rounds.set(keyOf(row.term, row.course_number, `@${destinationOf(row.title)}`), entry)
    } else {
      rounds.set(keyOf(row.term, row.course_number, row.section), entry)
    }
  }
  return { rounds, byTitle }
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
 * The six semesters before this one (three years, both seasons), newest first:
 * 202701 → ["Fall 2026", "Spring 2026", "Fall 2025", "Spring 2025", "Fall 2024", "Spring 2024"].
 */
export function recentTermsFor(termCode) {
  const semester = termCodeToSemester(termCode)
  const year = termCodeToCalendarYear(termCode)
  if (!semester || year == null) return []
  const terms = []
  let season = semester === 'fall' ? 'Fall' : 'Spring'
  let y = year
  for (let i = 0; i < 6; i += 1) {
    if (season === 'Spring') {
      season = 'Fall'
      y -= 1
    } else {
      season = 'Spring'
    }
    terms.push(`${season} ${y}`)
  }
  return terms
}

/** Round 1 and 2 of one past semester for this section. */
function roundsIn(term, course, history) {
  const matchByTitle = history?.byTitle.has(`${term}|${course.courseNumber.trim()}`)
  const entry = history?.rounds.get(
    keyOf(
      term,
      course.courseNumber,
      matchByTitle ? `@${destinationOf(course.title)}` : course.section,
    ),
  )
  return [
    { label: `Round 1, ${term}`, points: entry?.round1 ?? null },
    { label: `Round 2, ${term}`, points: entry?.round2 ?? null },
  ]
}

const hasResult = (rounds) => rounds.some((round) => round.points != null)

/**
 * The squares for a section, Round 1 and 2 per semester, newest first. Normally
 * the same season of the last two years (four squares). When neither has a
 * result (e.g. MGT 674 moved from fall to spring), the two newest semesters of
 * the last three years, either season, that have a result for this same section
 * (two or four squares). Never another section's numbers. `points` is null when
 * there's no result.
 *
 * @returns {{ label: string, points: number|null }[]}
 */
export function getBiddingRounds(course, history) {
  const sameSeason = pastTermsFor(course.termCode).map((term) => roundsIn(term, course, history))
  if (sameSeason.some(hasResult)) return sameSeason.flat()
  const withResults = recentTermsFor(course.termCode)
    .map((term) => roundsIn(term, course, history))
    .filter(hasResult)
    .slice(0, 2)
  return withResults.length ? withResults.flat() : sameSeason.flat()
}

/** SOM sections with at least one past result. Blank = no history; gray = no result that round. */
export function showsBiddingHistory(course, rounds) {
  return isSomCourse(course) && rounds.some((round) => round.points != null)
}

/**
 * Color stops, the same for every course and year (user-set Nov 13, 2026; smooth
 * fade Nov 15, 2026): white at 0 points, orange at 50, red at 100, very dark red
 * at 150+. Points in between blend between the two nearest stops, so 40 points
 * is close to orange, not white.
 */
export const BIDDING_STOPS = [
  { points: 0, color: '#ffffff' },
  { points: 50, color: '#f59a3c' },
  { points: 100, color: '#d9411e' },
  { points: 150, color: '#7f1d12' },
]
export const NO_DATA_COLOR = '#ebebee'

const toRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
const toHex = (rgb) => `#${rgb.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`

export function biddingColor(points) {
  if (points == null) return NO_DATA_COLOR
  const last = BIDDING_STOPS[BIDDING_STOPS.length - 1]
  if (points >= last.points) return last.color
  if (points <= 0) return BIDDING_STOPS[0].color
  const upper = BIDDING_STOPS.findIndex((stop) => points < stop.points)
  const from = BIDDING_STOPS[upper - 1]
  const to = BIDDING_STOPS[upper]
  const t = (points - from.points) / (to.points - from.points)
  const [a, b] = [toRgb(from.color), toRgb(to.color)]
  return toHex(a.map((c, i) => c + (b[i] - c) * t))
}

export function formatPoints(points, { short = false } = {}) {
  if (points == null) return 'No data'
  if (short) return `${points} ${points === 1 ? 'pt' : 'pts'}`
  return `${points} ${points === 1 ? 'point' : 'points'}`
}

export const BIDDING_DISCLAIMER =
  'Based on past results for this section. Sections can change from year to year, so keep that in mind.'
