import {
  computeCourseScore,
  professorValue,
  scoreColor,
  sortRows,
  weightShares,
} from './compareScoring'
import { formatSessionLabel } from './sessionDisplay'

const LEADING_COLUMNS = [
  'Rank',
  'Course number',
  'Title',
  'Professor(s)',
  'Session',
  'Units',
  'Requirement tags',
]

/**
 * Ranking sheet for the selected courses of one term, best score first.
 *
 * @param {{ groups: object[], store: object }} args
 */
export function buildRankingSheet({ groups, store }) {
  const manual = store.criteria.filter((c) => c.kind === 'manual')
  const professorCriterion = store.criteria.find((c) => c.kind === 'professor')
  const shares = weightShares(store.criteria)

  const header = [
    ...LEADING_COLUMNS,
    ...manual.map((c) => c.name),
    'Professor rating',
    'Score',
    'Note',
  ]
  const weightsRow = [
    'Weight',
    ...LEADING_COLUMNS.slice(1).map(() => null),
    ...manual.map((c) => shares[c.id]),
    professorCriterion ? shares[professorCriterion.id] : null,
    null,
    null,
  ]

  const scored = groups.map((group) => ({
    group,
    score: computeCourseScore(group, store.criteria, store.scores[group.key], store.professors)
      .score,
  }))
  const sorted = sortRows(scored, 'score', 'desc', (row) => row.score)

  const rows = sorted.map(({ group, score }, index) => [
    index + 1,
    group.courseNumber,
    group.title,
    group.professors.join('; ') || null,
    group.sessions.map((s) => formatSessionLabel(s)).join(', ') || null,
    group.units,
    group.tags.join(', ') || null,
    ...manual.map((c) => store.scores[group.key]?.[c.id] ?? null),
    professorValue(group.professors, store.professors),
    score,
    store.notes[group.key] ?? null,
  ])

  return { header, weightsRow, rows }
}

/** Professors the student rated or wrote about, best rating first. */
export function buildProfessorsSheet(store) {
  const entries = Object.entries(store.professors).map(([name, entry]) => ({
    name,
    rating: entry.rating ?? null,
    note: entry.note ?? '',
  }))
  const byName = [...entries].sort((a, b) => a.name.localeCompare(b.name))
  const sorted = sortRows(byName, 'rating', 'desc', (e) => e.rating)
  return {
    header: ['Professor', 'Rating', 'Note'],
    rows: sorted.map((e) => [e.name, e.rating, e.note]),
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

function fillCell(cell, value) {
  const color = scoreColor(typeof value === 'number' ? value : null)
  if (!color) return
  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: `FF${color.slice(1).toUpperCase()}` },
  }
}

/** Build the two-sheet workbook with ExcelJS (loaded on demand) and download it. */
export async function downloadCompareWorkbook({ groups, store, termLabel }) {
  const ExcelJS = (await import('exceljs')).default
  const workbook = new ExcelJS.Workbook()

  const ranking = buildRankingSheet({ groups, store })
  const rankingSheet = workbook.addWorksheet('Ranking')
  rankingSheet.addRow(ranking.header).font = { bold: true }
  rankingSheet.addRow(ranking.weightsRow).font = { italic: true }
  const firstScoreCol = LEADING_COLUMNS.length + 1
  const scoreCol = ranking.header.indexOf('Score') + 1
  for (const values of ranking.rows) {
    const row = rankingSheet.addRow(values)
    for (let col = firstScoreCol; col <= scoreCol; col += 1) {
      fillCell(row.getCell(col), values[col - 1])
    }
    row.getCell(scoreCol + 1).alignment = { wrapText: true, vertical: 'top' }
  }
  rankingSheet.columns.forEach((column, i) => {
    column.width = [6, 14, 40, 28, 18, 7, 18][i] ?? (i === scoreCol ? 50 : 14)
  })
  rankingSheet.views = [{ state: 'frozen', ySplit: 2 }]

  const professors = buildProfessorsSheet(store)
  const professorSheet = workbook.addWorksheet('Professors')
  professorSheet.addRow(professors.header).font = { bold: true }
  for (const values of professors.rows) {
    const row = professorSheet.addRow(values)
    fillCell(row.getCell(2), values[1])
    row.getCell(3).alignment = { wrapText: true, vertical: 'top' }
  }
  professorSheet.columns = [{ width: 28 }, { width: 8 }, { width: 50 }]

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
