import { describe, expect, it } from 'vitest'
import {
  applyOverrides,
  buildCourseRows,
  currentTermCode,
  nextTermCode,
  parseCsv,
  parseDaytimes,
  termCodeFromFileName,
  termFileSlug,
  termHasEnded,
  termsToUpdate,
  toCsv,
} from './courseImport.js'

function item(id, extra = {}) {
  return { courseID: id, courseNumber: `MGT ${id}`, section: '01', termCode: '202701', visible: '1', daysTimes: null, ...extra }
}

describe('parseDaytimes', () => {
  it('reads one or several days with a 12-hour range', () => {
    expect(parseDaytimes('T  Th 1:00 PM-2:20 PM')).toEqual({ days_clean: 'Tu,Th', start_24h: '13:00', end_24h: '14:20' })
    expect(parseDaytimes('M  W F 11:30 AM-12:20 PM')).toEqual({ days_clean: 'Mo,We,Fr', start_24h: '11:30', end_24h: '12:20' })
    expect(parseDaytimes('F 8:30 AM-11:30 AM')).toEqual({ days_clean: 'Fr', start_24h: '08:30', end_24h: '11:30' })
  })

  it('gives empty fields for no time and null for unreadable text', () => {
    expect(parseDaytimes('')).toEqual({ days_clean: '', start_24h: '', end_24h: '' })
    expect(parseDaytimes(null)).toEqual({ days_clean: '', start_24h: '', end_24h: '' })
    expect(parseDaytimes('TBA')).toBeNull()
  })
})

describe('buildCourseRows', () => {
  it('maps feed fields and tags STEM/GBS from attributes', () => {
    const { rows, problems } = buildCourseRows([
      item('1', { daysTimes: 'M  W 1:00 PM-2:20 PM', courseAttributes: 'MGMS|MGAE', courseType: 'elective|MMS AM', room: 'EVANS 2400' }),
      item('2', { courseAttributes: 'MGGE|MGMS' }),
      item('3'),
    ])
    expect(problems).toEqual([])
    expect(rows.map((row) => row.tags)).toEqual(['STEM', 'STEM;GBS Req', ''])
    expect(rows[0]).toMatchObject({ 'Course Type': 'elective,MMS AM', Room: 'EVANS 2400', days_clean: 'Mo,We', start_24h: '13:00', end_24h: '14:20', Visible: '1' })
    expect(rows[1]).toMatchObject({ days_clean: '', start_24h: '', end_24h: '', Room: '' })
  })

  it('leaves out courses Yale marks hidden', () => {
    const { rows } = buildCourseRows([item('1'), item('2', { visible: '0' }), item('3', { visible: '0', daysTimes: 'Th 2:35 PM-5:35 PM' })])
    expect(rows.map((row) => row['Course ID'])).toEqual(['1'])
  })

  it('reports unreadable times and duplicate IDs', () => {
    const { rows, problems } = buildCourseRows([item('1', { daysTimes: 'S 7:30 AM-9:00 AM' }), item('1')])
    expect(rows).toHaveLength(1)
    expect(rows[0].days_clean).toBe('')
    expect(problems).toHaveLength(2)
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

describe('term discovery', () => {
  const ended = [{ 'Course Session End Date': '20261211 000000.000' }]
  const running = [{ 'Course Session End Date': '20270504 000000.000' }]

  it('steps from fall to spring to fall', () => {
    expect(nextTermCode('202603')).toBe('202701')
    expect(nextTermCode('202701')).toBe('202703')
    expect(currentTermCode(new Date(2027, 2, 1))).toBe('202701')
    expect(currentTermCode(new Date(2027, 6, 1))).toBe('202703')
  })

  it('treats a term as over the day after its last class', () => {
    expect(termHasEnded(ended, new Date(2026, 11, 11))).toBe(false)
    expect(termHasEnded(ended, new Date(2026, 11, 12))).toBe(true)
    expect(termHasEnded([{ 'Course Session End Date': '' }], new Date(2030, 0, 1))).toBe(false)
  })

  it('updates open terms, skips finished ones and looks two terms ahead', () => {
    const plan = termsToUpdate(
      [
        { termCode: '202603', rows: ended },
        { termCode: '202701', rows: running },
      ],
      new Date(2026, 11, 20),
    )
    expect(plan).toEqual([
      { termCode: '202701', isNew: false },
      { termCode: '202703', isNew: true },
      { termCode: '202801', isNew: true },
    ])
  })

  it('reads term codes from file names', () => {
    expect(termCodeFromFileName('courses_master_fall2026.csv')).toBe('202603')
    expect(termCodeFromFileName('courses_master_spring2027.csv')).toBe('202701')
    expect(termCodeFromFileName('course_overrides.csv')).toBeNull()
  })
})
