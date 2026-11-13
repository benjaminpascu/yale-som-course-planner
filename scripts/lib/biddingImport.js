/**
 * Turns SOM's Auction-Bidding-History.xlsx into docs/data-samples/bidding_history.csv.
 * Pure functions (no network, no Excel library) so they can be tested; the
 * script scripts/update-bidding-history.js does the downloading and file writing.
 */

export const FILE_NAME = 'Auction-Bidding-History.xlsx'
export const PORTAL_URL = 'https://som.yale.edu/myportal/course-bidding-and-enrollment-history'
export const CSV_HEADER = ['term', 'course_number', 'section', 'round_1', 'round_2']

/** "MGT 525-01 Competitive Strategy" → { courseNumber: "MGT 525", section: "01" } */
export function parseCourseCell(value) {
  const match = String(value ?? '').trim().match(/^([A-Z]{2,5})\s*(\d{3,4}[A-Z]?)-(\d{1,3})\b/)
  if (!match) return null
  return { courseNumber: `${match[1]} ${match[2]}`, section: match[3].padStart(2, '0') }
}

/** Clearing price in points, or null when the round has no result ("N/A", blank, text). */
export function parsePoints(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const text = String(value ?? '').trim()
  return /^\d+(\.\d+)?$/.test(text) ? Number(text) : null
}

/** "Spring 2026" → { season: "Spring", year: 2026 }; null for other tab names. */
export function parseTermName(name) {
  const match = String(name ?? '').trim().match(/^(Fall|Spring)\s+(\d{4})$/i)
  if (!match) return null
  const season = match[1][0].toUpperCase() + match[1].slice(1).toLowerCase()
  return { season, year: Number(match[2]), label: `${season} ${match[2]}` }
}

/**
 * @param {{ name: string, rows: unknown[][] }[]} sheets — first row is the header
 * @returns {{ term: string, courseNumber: string, section: string, round1: number|null, round2: number|null }[]}
 */
export function parseBiddingSheets(sheets) {
  const out = []
  for (const sheet of sheets) {
    const term = parseTermName(sheet.name)
    if (!term || sheet.rows.length === 0) continue
    const header = sheet.rows[0].map((h) => String(h ?? '').trim())
    const courseCol = header.findIndex((h) => h.toLowerCase() === 'course')
    const round1Col = header.findIndex((h) => /^round 1\b/i.test(h))
    const round2Col = header.findIndex((h) => /^round 2\b/i.test(h))
    if (courseCol < 0 || round1Col < 0) continue

    const seen = new Set()
    for (const row of sheet.rows.slice(1)) {
      const course = parseCourseCell(row[courseCol])
      if (!course) continue
      const key = `${course.courseNumber}|${course.section}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push({
        term: term.label,
        ...course,
        round1: parsePoints(row[round1Col]),
        round2: round2Col >= 0 ? parsePoints(row[round2Col]) : null,
      })
    }
  }
  return out
}

const termSortKey = (label) => {
  const term = parseTermName(label)
  return term ? term.year * 10 + (term.season === 'Fall' ? 1 : 0) : 0
}

/** Newest term first, then course and section, so updates give small diffs. */
export function toBiddingCsv(rows) {
  const sorted = [...rows].sort(
    (a, b) =>
      termSortKey(b.term) - termSortKey(a.term) ||
      a.courseNumber.localeCompare(b.courseNumber, 'en', { numeric: true }) ||
      a.section.localeCompare(b.section),
  )
  const lines = sorted.map((r) =>
    [r.term, r.courseNumber, r.section, r.round1 ?? '', r.round2 ?? ''].join(','),
  )
  return `${[CSV_HEADER.join(','), ...lines].join('\n')}\n`
}

/** Where SOM would put a new upload: this month's and last month's folders. */
export function guessUrls(today = new Date()) {
  const folder = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  return [today, lastMonth].map(
    (date) => `https://som.yale.edu/sites/default/files/${folder(date)}/${FILE_NAME}`,
  )
}

/**
 * The newest semester that has started (its bidding is over), e.g. on
 * 2026-11-13 → "Fall 2026". Spring counts from Jan 20, Fall from Sep 1.
 */
export function latestStartedTerm(today = new Date()) {
  const year = today.getFullYear()
  const after = (month, day) =>
    today.getMonth() > month || (today.getMonth() === month && today.getDate() >= day)
  if (after(8, 1)) return `Fall ${year}`
  if (after(0, 20)) return `Spring ${year}`
  return `Fall ${year - 1}`
}

/** The started semester missing from the file, or null when it's there. */
export function missingTerm(sheetNames, today = new Date()) {
  const expected = latestStartedTerm(today)
  const have = new Set(sheetNames.map((name) => parseTermName(name)?.label).filter(Boolean))
  return have.has(expected) ? null : expected
}
