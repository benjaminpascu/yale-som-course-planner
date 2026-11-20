import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'
import {
  buildBiddingTable,
  buildCourseTable,
  buildExportWorkbook,
  buildGnwWorkbook,
  pastGnwRows,
  planCourses,
  safeFileName,
  sortCourses,
  upcomingGnws,
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
    // Blank gray, then dark red above 100, then gray → yellow → red; table and data sheet.
    const [rule] = sheet.conditionalFormattings
    expect(rule.ref).toBe('B5:C7')
    expect(rule.rules.map((r) => r.type)).toEqual(['expression', 'expression', 'colorScale'])
    expect(rule.rules.map((r) => r.formulae?.[0])).toEqual(['NOT(ISNUMBER(B5))', 'B5>100', undefined])
    expect(rule.rules[2].cfvo.map((v) => v.value)).toEqual([0, 50, 100])
    expect(wb.getWorksheet('Bidding data').conditionalFormattings[0].ref).toBe('C2:D3')
  })

  it('leaves out the bidding sheets when no course has history', () => {
    const wb = buildExportWorkbook(ExcelJS, { courses: [yale], tags: [], biddingCsvText: BIDDING })
    expect(wb.worksheets.map((s) => s.name)).toEqual(['Courses'])
  })
})

const GNW_BIDDING = `term,course_number,section,round_1,round_2,title
Spring 2026,MGT 600,03,400,816,GNW: ESMT Berlin
Spring 2026,MGT 600,09,0,,GNW: Indian Institute of Management Bangalore (IIMB)
Fall 2025,MGT 600,03,25,200,"GNW: ESMT, Berlin, Germany"
Fall 2000,MGT 600,01,5,5,GNW: Old tab
Spring 2026,MGT 653,01,10,0,`

const gnw = (id, title, start, end) => ({
  ...som, courseId: id, courseNumber: 'MGT 600', section: id, title, description: 'Theme',
  termCode: '202701', sessionStart: start, sessionEnd: end, units: 1.5, syllabusUrl: 'https://globalnetwork.io/x',
})

describe('GNW export', () => {
  it('lists each past GNW location on its own row, newest first, skipping the "2000" tabs', () => {
    expect(pastGnwRows(GNW_BIDDING)).toEqual([
      { location: 'ESMT Berlin', term: 'Spring 2026', round1: 400, round2: 816, section: '03' },
      { location: 'Indian Institute of Management Bangalore (IIMB)', term: 'Spring 2026', round1: 0, round2: null, section: '09' },
      { location: 'ESMT, Berlin, Germany', term: 'Fall 2025', round1: 25, round2: 200, section: '03' },
    ])
  })

  it('keeps only GNWs that are not over, by start date', () => {
    const list = [
      gnw('2', 'GNW: B', '2027-03-08', '2027-03-12'),
      gnw('1', 'GNW: A', '2026-10-19', '2026-10-23'),
      gnw('3', 'GNW: C', '2027-03-01', '2027-03-05'),
    ]
    expect(upcomingGnws(list, new Date(2026, 10, 20)).map((g) => g.title)).toEqual(['GNW: C', 'GNW: B'])
  })

  it('builds Bidding (search word) first, then the upcoming GNWs and every past name', () => {
    const wb = buildGnwWorkbook(ExcelJS, {
      gnws: [gnw('3', 'GNW: ESMT Berlin', '2027-03-08', '2027-03-12')],
      biddingCsvText: GNW_BIDDING,
      today: new Date(2026, 10, 20),
    })
    expect(wb.worksheets.map((s) => s.name)).toEqual(['Bidding', 'GNWs', 'Past GNWs'])
    const sheet = wb.getWorksheet('Bidding')
    expect(sheet.getCell('A5').value).toBe('Spring 2026')
    expect(sheet.getCell('B5').value.formula).toContain(`"*"&$B$1&"*"`)
    expect(sheet.getCell('A7').value).toBe('Average')
    const row = wb.getWorksheet('GNWs').getRow(2).values.slice(1)
    expect(row.slice(0, 7)).toEqual(['Spring 2027', '3', 'ESMT Berlin', 'Theme', 'Mar 8, 2027', 'Mar 12, 2027', 1.5])
    expect(wb.getWorksheet('Past GNWs').rowCount).toBe(4)
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
