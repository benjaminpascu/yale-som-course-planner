import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'
import {
  buildBiddingTable,
  buildCourseTable,
  buildExportWorkbook,
  planCourses,
  safeFileName,
  sortCourses,
} from './devExport.js'

const som = {
  courseId: '1', termCode: '202701', session: 'spring-1', school: 'SOM', courseNumber: 'MGT 653',
  section: '01', title: 'Digital Disruption', faculty: 'Keogh, Kyle', meetingDays: ['Mo'],
  startTime: '18:00', endTime: '21:00', units: 2, category: 'Technology Management',
  tags: ['STEM'], bidOrPermission: 'bid', crossListings: [], prerequisites: '',
  description: 'Line one, "quoted"\nLine two', syllabusUrl: 'https://syl', coursePageUrl: null,
}
const yale = {
  ...som, courseId: '202701-CPSC3810-01', school: 'GS', courseNumber: 'CPSC 3810',
  title: 'Intro to ML', tags: [], meetingDays: [], startTime: null, endTime: null, units: 0,
  crossListings: ['CPSC 5810'], coursePageUrl: 'https://page',
}
const fall = { ...som, courseId: '0', termCode: '202603', courseNumber: 'MGT 999' }

const asObjects = ({ header, rows }) => rows.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i]])))

describe('buildCourseTable', () => {
  it('writes one row per course with readable columns', () => {
    const [a, b] = asObjects(buildCourseTable([som, yale]))
    expect(a).toMatchObject({
      Term: 'Spring 2027', School: 'School of Management', 'Course Number': 'MGT 653',
      'Meeting Times': 'Mo 18:00–21:00', Units: 2, STEM: 'Yes', Description: 'Line one, "quoted"\nLine two',
    })
    expect(b).toMatchObject({ STEM: '', 'Meeting Times': '', Units: '', 'Cross Listings': 'CPSC 5810', 'Course Page': 'https://page' })
  })

  it('puts one Yes column per tag right after Category', () => {
    const { header, rows } = buildCourseTable([{ ...som, tags: ['STEM', 'GBS Req'] }], {
      tags: ['GBS Req', 'Leadership', 'STEM'],
    })
    const at = header.indexOf('Category') + 1
    expect(header.slice(at, at + 3)).toEqual(['GBS Req', 'Leadership', 'STEM'])
    expect(rows[0].slice(at, at + 3)).toEqual(['Yes', '', 'Yes'])
  })
})

describe('sortCourses', () => {
  it('sorts by term, then SOM first', () => {
    expect(sortCourses([yale, som, fall]).map((c) => c.courseNumber)).toEqual(['MGT 999', 'MGT 653', 'CPSC 3810'])
  })
})

const BIDDING = `term,course_number,section,round_1,round_2,title
Spring 2026,MGT 653,01,10,0,
Spring 2026,MGT 653,02,30,,
Fall 2025,MGT 653,01,,75,
Spring 2026,MGT 416,01,50,400,International Experience: Costa Rica
Spring 2026,MGT 416,02,0,0,International Experience: India
Fall 2000,MGT 653,01,5,5,
Spring 2026,MGT 999,01,1,1,`

describe('buildBiddingTable', () => {
  it('averages each round over the sections, newest semester first, skipping the "2000" tabs', () => {
    const table = buildBiddingTable([som, yale], BIDDING)
    expect(table.courses).toEqual(['MGT 653 Digital Disruption'])
    expect(table.terms).toEqual(['Spring 2026', 'Fall 2025'])
    expect(table.rows).toEqual([
      { course: 'MGT 653 Digital Disruption', term: 'Spring 2026', round1: 20, round2: 0, sections: 2 },
      { course: 'MGT 653 Digital Disruption', term: 'Fall 2025', round1: null, round2: 75, sections: 1 },
    ])
  })

  it('matches trips that share a number by destination', () => {
    const trip = (title, id) => ({ ...som, courseId: id, courseNumber: 'MGT 416', title })
    const table = buildBiddingTable(
      [trip('International Experience: India', 'a'), trip('International Experience: Chile', 'b')],
      BIDDING,
    )
    expect(table.courses).toEqual(['MGT 416 International Experience: India'])
    expect(table.rows[0]).toMatchObject({ round1: 0, round2: 0, sections: 1 })
  })
})

describe('buildExportWorkbook', () => {
  it('puts Bidding first with a course dropdown and formulas, then Courses', () => {
    const wb = buildExportWorkbook(ExcelJS, { courses: [som], tags: ['STEM'], biddingCsvText: BIDDING })
    expect(wb.worksheets.map((s) => s.name)).toEqual(['Bidding', 'Courses', 'Bidding data', 'Lists'])
    const sheet = wb.getWorksheet('Bidding')
    expect(sheet.getCell('B1').value).toBe('MGT 653 Digital Disruption')
    expect(sheet.getCell('B1').dataValidation.formulae).toEqual(['Lists!$A$1:$A$1'])
    expect(sheet.getCell('A5').value).toBe('Spring 2026')
    expect(sheet.getCell('B5').value.formula).toContain('AVERAGEIFS')
    expect(sheet.getCell('A7').value).toBe('Average')
    // Gray → yellow → red up to 100, dark red above, on the table and the data sheet.
    const [rule] = sheet.conditionalFormattings
    expect(rule.ref).toBe('B5:C7')
    expect(rule.rules.map((r) => r.type)).toEqual(['cellIs', 'colorScale'])
    expect(rule.rules[1].cfvo.map((v) => v.value)).toEqual([0, 50, 100])
    expect(wb.getWorksheet('Bidding data').conditionalFormattings[0].ref).toBe('C2:D3')
  })

  it('leaves out the bidding sheets when no course has history', () => {
    const wb = buildExportWorkbook(ExcelJS, { courses: [yale], tags: [], biddingCsvText: BIDDING })
    expect(wb.worksheets.map((s) => s.name)).toEqual(['Courses'])
  })
})

describe('planCourses', () => {
  it('keeps plan order and skips courses no longer in the data', () => {
    const byId = new Map([som, yale].map((c) => [c.courseId, c]))
    expect(planCourses({ courseIds: ['202701-CPSC3810-01', 'gone', '1'] }, byId)).toEqual([yale, som])
  })
})

describe('safeFileName', () => {
  it('makes plan names safe for a file', () => {
    expect(safeFileName('Startup plan v2 + bid buffers')).toBe('Startup-plan-v2-bid-buffers')
    expect(safeFileName('  ')).toBe('plan')
  })
})
