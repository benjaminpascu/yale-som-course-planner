import { rankCourses, ratingTone } from './compareScoring'
import { formatSessionLabel } from './sessionDisplay'

const STATUS_LABELS = { yes: 'Interested', maybe: 'Maybe' }
const FIXED_COLUMNS = ['Rank', 'Course number', 'Title', 'Professor', 'Session', 'Status']

/** A criterion named like a fixed column (e.g. "Professor") gets " rating" added. */
function criterionColumn(name) {
  const clash = [...FIXED_COLUMNS, 'Weighted score', 'Note'].some(
    (col) => col.toLowerCase() === name.toLowerCase(),
  )
  return clash ? `${name} rating` : name
}

/**
 * Sheet 1: the shortlist (Interested + Maybe), ranked by weighted score;
 * unscored courses last with no rank.
 *
 * @param {{ groups: object[], term: object }} args  groups = shortlisted courses
 */
export function buildShortlistSheet({ groups, term }) {
  const { criteria, ratings, notes, decisions } = term
  const header = [...FIXED_COLUMNS, ...criteria.map((c) => criterionColumn(c.name)), 'Weighted score', 'Note']
  const { ranked } = rankCourses(groups, ratings, criteria)
  const rankedKeys = new Set(ranked.map((r) => r.group.key))
  const ordered = [
    ...ranked,
    ...groups.filter((g) => !rankedKeys.has(g.key)).map((group) => ({ group, score: null })),
  ]
  const rows = ordered.map(({ group, score }, i) => [
    score == null ? null : i + 1,
    group.courseNumber,
    group.title,
    group.professors.join(' / ') || null,
    group.sessions.map((s) => formatSessionLabel(s)).join(', ') || null,
    STATUS_LABELS[decisions[group.key]] ?? null,
    ...criteria.map((c) => ratings[group.key]?.[c.id] ?? null),
    score == null ? null : Math.round(score * 10) / 10,
    notes[group.key] ?? null,
  ])
  return { header, rows }
}

/** Sheet 2: criteria and their weights. */
export function buildCriteriaSheet(criteria) {
  return {
    header: ['Criterion', 'Weight'],
    rows: criteria.map((c) => [c.name, Math.round(c.weight * 10000) / 10000]),
  }
}

export function exportFileName(termLabel) {
  const slug = termLabel
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `compare-courses-${slug}.xlsx`
}

function fill(cell, value) {
  if (typeof value !== 'number') return
  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: `FF${ratingTone(value).bg.slice(1).toUpperCase()}` },
  }
}

/** Two-sheet workbook. `ExcelJS` is passed in so the library stays lazy-loaded. */
export async function buildCompareWorkbook(ExcelJS, { groups, term }) {
  const workbook = new ExcelJS.Workbook()

  const shortlist = buildShortlistSheet({ groups, term })
  const sheet = workbook.addWorksheet('Shortlist')
  sheet.addRow(shortlist.header).font = { bold: true }
  const firstRating = FIXED_COLUMNS.length + 1
  const scoreCol = firstRating + term.criteria.length
  for (const values of shortlist.rows) {
    const row = sheet.addRow(values)
    for (let col = firstRating; col <= scoreCol; col += 1) fill(row.getCell(col), values[col - 1])
    row.getCell(scoreCol).numFmt = '0.0'
    row.getCell(scoreCol + 1).alignment = { wrapText: true, vertical: 'top' }
  }
  sheet.columns.forEach((column, i) => {
    column.width = [6, 14, 40, 28, 16, 12][i] ?? (i === scoreCol ? 50 : 14)
  })
  sheet.views = [{ state: 'frozen', ySplit: 1 }]

  const criteria = buildCriteriaSheet(term.criteria)
  const criteriaSheet = workbook.addWorksheet('Criteria')
  criteriaSheet.addRow(criteria.header).font = { bold: true }
  for (const values of criteria.rows) criteriaSheet.addRow(values).getCell(2).numFmt = '0.00'
  criteriaSheet.columns = [{ width: 28 }, { width: 10 }]

  return workbook
}

/** Load ExcelJS on demand, build the workbook, and download it. */
export async function downloadCompareWorkbook({ groups, term, termLabel }) {
  const ExcelJS = (await import('exceljs')).default
  const workbook = await buildCompareWorkbook(ExcelJS, { groups, term })
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = exportFileName(termLabel)
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
