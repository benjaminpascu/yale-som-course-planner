import { describe, expect, it } from 'vitest'
import {
  applyOverrides,
  buildCourseRows,
  classifyExportFile,
  parseCsv,
  parseDaytimes,
  termFileSlug,
  toCsv,
} from './courseImport.js'

function source(id, extra = {}) {
  return { 'Course ID': id, 'Course Number': `MGT ${id}`, Section: '01', TermCode: '202701', Daytimes: '', ...extra }
}

describe('parseDaytimes', () => {
  it('reads one or several days with a 12-hour range', () => {
    expect(parseDaytimes('T  Th 1:00 PM-2:20 PM')).toEqual({ days_clean: 'Tu,Th', start_24h: '13:00', end_24h: '14:20' })
    expect(parseDaytimes('M  W F 11:30 AM-12:20 PM')).toEqual({ days_clean: 'Mo,We,Fr', start_24h: '11:30', end_24h: '12:20' })
    expect(parseDaytimes('F 8:30 AM-11:30 AM')).toEqual({ days_clean: 'Fr', start_24h: '08:30', end_24h: '11:30' })
  })

  it('gives empty fields for no time and null for unreadable text', () => {
    expect(parseDaytimes('')).toEqual({ days_clean: '', start_24h: '', end_24h: '' })
    expect(parseDaytimes('TBA')).toBeNull()
  })
})

describe('classifyExportFile', () => {
  it('tells the three exports apart by name', () => {
    expect(classifyExportFile('STEM Req.csv')).toBe('stem')
    expect(classifyExportFile('GBS Req.csv')).toBe('gbs')
    expect(classifyExportFile('courseslist-2026-11-02T00_41_42.031Z.csv')).toBe('full')
  })
})

describe('buildCourseRows', () => {
  it('tags sections found in the STEM and GBS lists and falls back to Timings columns', () => {
    const { rows, problems } = buildCourseRows({
      full: [
        source('1', { Daytimes: 'M  W 1:00 PM-2:20 PM' }),
        source('2', { 'Timings Day': 'Fr', 'Timings StartTime': '9:00 AM', 'Timings EndTime': '12:00 PM' }),
        source('3', { Visible: '0' }),
      ],
      stem: [source('1'), source('2')],
      gbs: [source('2')],
    })
    expect(problems).toEqual([])
    expect(rows.map((row) => row.tags)).toEqual(['STEM', 'STEM;GBS Req', ''])
    expect(rows[1]).toMatchObject({ days_clean: 'Fr', start_24h: '09:00', end_24h: '12:00' })
    expect(rows[2]).toMatchObject({ days_clean: '', start_24h: '', end_24h: '', Visible: '1' })
  })

  it('reports list entries missing from the full list', () => {
    const { problems } = buildCourseRows({ full: [source('1')], stem: [source('9')], gbs: [] })
    expect(problems).toHaveLength(1)
  })
})

describe('applyOverrides', () => {
  it('applies fixes for the term and notes ones that are stale', () => {
    const rows = [{ 'Course ID': '1', 'Course Number': 'MGT 1', Section: '01', Room: ' ', Visible: '1' }]
    const { applied, notes } = applyOverrides(
      rows,
      [
        { TermCode: '202701', 'Course ID': '1', Column: 'Room', Value: 'EVANS 1' },
        { TermCode: '202701', 'Course ID': '1', Column: 'Visible', Value: '1' },
        { TermCode: '202701', 'Course ID': '7', Column: 'Room', Value: 'X' },
        { TermCode: '202603', 'Course ID': '1', Column: 'Room', Value: 'FALL' },
      ],
      '202701',
    )
    expect(rows[0].Room).toBe('EVANS 1')
    expect(applied).toHaveLength(1)
    expect(notes).toHaveLength(2)
  })
})

describe('toCsv', () => {
  it('round-trips quotes, commas and line breaks', () => {
    const row = { 'Course ID': '1', 'Course Description': 'Line one\nsays "hi", ok', Room: ' ' }
    const [back] = parseCsv(toCsv([row])).rows
    expect(back['Course Description']).toBe(row['Course Description'])
    expect(back.Room).toBe(' ')
  })
})

describe('termFileSlug', () => {
  it('names fall and spring files', () => {
    expect(termFileSlug('202603')).toBe('fall2026')
    expect(termFileSlug('202701')).toBe('spring2027')
    expect(termFileSlug('202702')).toBeNull()
  })
})
