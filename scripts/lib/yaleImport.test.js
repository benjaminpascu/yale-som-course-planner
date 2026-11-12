import { describe, expect, it } from 'vitest'
import {
  buildYaleRows,
  htmlToText,
  parseMeetingPatterns,
  termCodeFromYaleFileName,
  yaleFileName,
} from './yaleImport.js'

const slot = (days_clean, start_24h, end_24h) => ({ days_clean, start_24h, end_24h })

describe('parseMeetingPatterns', () => {
  it.each([
    [['MW 2.35-3.50'], slot('Mo,We', '14:35', '15:50')],
    [['TTh 4.10-6.00p'], slot('Tu,Th', '16:10', '18:00')],
    [['MW 11.35-12.50'], slot('Mo,We', '11:35', '12:50')],
    [['M 9.25-11.20'], slot('Mo', '09:25', '11:20')],
    [['Th 7.00-8.55p'], slot('Th', '19:00', '20:55')],
    [['W 8.00-9.15p'], slot('We', '20:00', '21:15')],
    [['F 11.35-1.00'], slot('Fr', '11:35', '13:00')],
    [['MWF 10.30-11.20'], slot('Mo,We,Fr', '10:30', '11:20')],
    [['TTh 9.00-10.15', '1 HTBA'], slot('Tu,Th', '09:00', '10:15')],
    [['1 HTBA', 'M 1.30-3.25'], slot('Mo', '13:30', '15:25')],
    [['F 9.25-10.15', 'MW 2.35-3.25'], slot('Fr', '09:25', '10:15')],
    [['T 1.00-2.15', 'Th 1.00-2.15'], slot('Tu,Th', '13:00', '14:15')],
    [['1 HTBA'], slot('', '', '')],
    [[], slot('', '', '')],
    [null, slot('', '', '')],
  ])('%j', (patterns, expected) => {
    expect(parseMeetingPatterns(patterns)).toEqual(expected)
  })
})

describe('htmlToText', () => {
  it('strips tags and decodes entities', () => {
    expect(htmlToText('<p>Law &amp; policy</p><p>Second&nbsp;part.</p>')).toBe('Law & policy\n\nSecond part.')
  })
})

describe('file names', () => {
  it('round-trips term codes', () => {
    expect(yaleFileName('202701')).toBe('yale_courses_spring2027.csv')
    expect(termCodeFromYaleFileName('yale_courses_fall2026.csv')).toBe('202603')
    expect(termCodeFromYaleFileName('courses_master_fall2026.csv')).toBeNull()
  })
})

const section = (overrides = {}) => ({
  cSectionStatus: 'A',
  courseTitle: 'Economics for Global Affairs',
  crn: '23456',
  description: '<p>Intro.</p>',
  instructorList: ['Amit Khandelwal', 'Lorenzo Caliendo'],
  meetingPattern: ['MW 11.35-12.50'],
  meetingPatternLocation: ['HGS 101'],
  primXLst: null,
  schoolCode: 'GB',
  sectionNumber: '01',
  subjectNumber: 'GLBL5010',
  syllabusLink: 'https://example.edu/syllabus',
  termCode: '202701',
  ...overrides,
})

describe('buildYaleRows', () => {
  it('maps a section to the app columns', () => {
    const { rows, problems } = buildYaleRows([section()], '202701')
    expect(problems).toEqual([])
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      'Course ID': '202701-23456',
      'Course Number': 'GLBL 5010',
      'Course Title': 'Economics for Global Affairs',
      'Course Description': 'Intro.',
      'Course Session': 'spring',
      'Faculty 1': 'Amit Khandelwal, Lorenzo Caliendo',
      Room: 'HGS 101',
      Syllabus: 'https://example.edu/syllabus',
      TermCode: '202701',
      Units: '0',
      Visible: '1',
      days_clean: 'Mo,We',
      start_24h: '11:35',
      end_24h: '12:50',
      School: 'GB',
    })
  })

  it('leaves out cancelled sections and other terms', () => {
    const { rows, problems } = buildYaleRows(
      [section({ cSectionStatus: 'C' }), section({ crn: '2', termCode: '202603' })],
      '202701',
    )
    expect(rows).toEqual([])
    expect(problems).toHaveLength(1)
  })

  it('keeps one row per CRN, preferring the main listing', () => {
    const { rows } = buildYaleRows(
      [
        section({ subjectNumber: 'ECON3365', primXLst: 'CPSC3650', crn: '10826' }),
        section({ subjectNumber: 'CPSC3650', primXLst: 'CPSC3650', crn: '10826' }),
      ],
      '202701',
    )
    expect(rows.map((r) => r['Course Number'])).toEqual(['CPSC 3650'])
  })

  it('uses fall for fall terms and spaces subject codes with &', () => {
    const { rows } = buildYaleRows([section({ termCode: '202603', subjectNumber: 'EP&E4301' })], '202603')
    expect(rows[0]['Course Session']).toBe('fall')
    expect(rows[0]['Course Number']).toBe('EP&E 4301')
  })
})
