import { describe, expect, test } from 'vitest'
import {
  buildCompareWorkbook,
  buildCriteriaSheet,
  buildShortlistSheet,
  exportFileName,
} from './compareExport'
import {
  createEmptyCompareStore,
  decide,
  getTermData,
  setNote,
  setProfessorRating,
  setRating,
} from './compareStorage'

const FALL = '202603'
const ODD_NOTE = '=SUM(A1)\nline two "quoted" 🎓'

const g802 = {
  key: '802',
  courseNumber: 'MGT 802',
  title: 'Large Language Models',
  professors: ['Jensen, Kyle'],
  sessions: ['fall-2'],
}
const g611 = {
  key: '611',
  courseNumber: 'MGT 611',
  title: 'Policy Modeling',
  professors: ['Monachou, Faidra', 'Other, Prof'],
  sessions: ['fall-1'],
}
const g622 = {
  key: '622',
  courseNumber: 'MGT 622',
  title: 'Game Theory',
  professors: ['Polak, Benjamin'],
  sessions: ['fall'],
}

// MGT 611's professor rating (9) and MGT 802's (7) come from the shared professor ratings.
const PROFESSORS = setProfessorRating(
  setProfessorRating(createEmptyCompareStore(), 'Monachou, Faidra / Other, Prof', 9),
  'Jensen, Kyle',
  7,
).professors

function fallTerm() {
  let s = createEmptyCompareStore()
  s = decide(s, FALL, '622', 'maybe')
  s = decide(s, FALL, '611', 'yes')
  s = decide(s, FALL, '802', 'yes')
  for (const [id, v] of [['interesting', 8], ['useful', 8]]) {
    s = setRating(s, FALL, '611', id, v)
  }
  for (const [id, v] of [['interesting', 9], ['useful', 9]]) {
    s = setRating(s, FALL, '802', id, v)
  }
  s = setNote(s, FALL, '802', ODD_NOTE)
  return getTermData(s, FALL)
}

describe('buildShortlistSheet', () => {
  const { header, rows } = buildShortlistSheet({
    groups: [g622, g611, g802],
    term: fallTerm(),
    professors: PROFESSORS,
  })

  test('columns: rank, number, title, professor, session, status, one per criterion, score, note', () => {
    expect(header).toEqual([
      'Rank',
      'Course number',
      'Title',
      'Professor',
      'Session',
      'Status',
      'Interesting',
      'Useful',
      'Professor rating',
      'Weighted score',
      'Note',
    ])
  })

  test('ranked by weighted score; unscored courses last without a rank', () => {
    expect(rows.map((r) => [r[0], r[1], r[9]])).toEqual([
      [1, 'MGT 802', 8.6],
      [2, 'MGT 611', 8.2],
      [null, 'MGT 622', null],
    ])
  })

  test('status, professors, session, ratings and the note verbatim', () => {
    const r611 = rows.find((r) => r[1] === 'MGT 611')
    expect(r611.slice(3, 9)).toEqual(['Monachou, Faidra / Other, Prof', 'Fall 1', 'Interested', 8, 8, 9])
    expect(rows.find((r) => r[1] === 'MGT 622')[5]).toBe('Maybe')
    expect(rows.find((r) => r[1] === 'MGT 802')[10]).toBe(ODD_NOTE)
  })
})

describe('buildCriteriaSheet', () => {
  test('criteria with their weights', () => {
    expect(buildCriteriaSheet(fallTerm().criteria)).toEqual({
      header: ['Criterion', 'Weight'],
      rows: [
        ['Interesting', 0.35],
        ['Useful', 0.45],
        ['Professor', 0.2],
      ],
    })
  })
})

describe('buildCompareWorkbook', () => {
  test('two sheets; rating cells colored; note stays text, never a formula', async () => {
    const ExcelJS = (await import('exceljs')).default
    const workbook = await buildCompareWorkbook(ExcelJS, {
      groups: [g622, g611, g802],
      term: fallTerm(),
      professors: PROFESSORS,
    })
    const reread = new ExcelJS.Workbook()
    await reread.xlsx.load(await workbook.xlsx.writeBuffer())

    const shortlist = reread.getWorksheet('Shortlist')
    expect(shortlist.getRow(1).getCell(1).value).toBe('Rank')
    const top = shortlist.getRow(2)
    expect(top.getCell(2).value).toBe('MGT 802')
    expect(top.getCell(7).fill?.fgColor?.argb).toBe('FFA9D99C')
    const note = top.getCell(11)
    expect(note.value).toBe(ODD_NOTE)
    expect(note.formula).toBeUndefined()

    const criteria = reread.getWorksheet('Criteria')
    expect(criteria.getRow(2).values.slice(1)).toEqual(['Interesting', 0.35])
  })
})

describe('exportFileName', () => {
  test('slugs the term label', () => {
    expect(exportFileName('Fall 2026')).toBe('compare-courses-fall-2026.xlsx')
  })
})
