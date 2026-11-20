import Papa from 'papaparse'
import { describe, expect, it } from 'vitest'
import { buildCourseListCsv, planCourses, safeFileName } from './devExport.js'

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

const rows = (csv) => Papa.parse(csv, { header: true }).data

describe('buildCourseListCsv', () => {
  it('writes one row per course with readable columns', () => {
    const [a, b] = rows(buildCourseListCsv([yale, som]))
    expect(a).toMatchObject({
      Term: 'Spring 2027', School: 'School of Management', 'Course Number': 'MGT 653', 'Meeting Times': 'Mo 18:00–21:00',
      Units: '2', STEM: 'Yes', Description: 'Line one, "quoted"\nLine two',
    })
    expect(b).toMatchObject({ STEM: '', 'Course Number': 'CPSC 3810', 'Meeting Times': '', Units: '', 'Cross Listings': 'CPSC 5810', 'Course Page': 'https://page' })
  })

  it('puts one Yes column per tag right after Category', () => {
    const csv = buildCourseListCsv([{ ...som, tags: ['STEM', 'GBS Req'] }, { ...som, courseId: '9', tags: [] }], {
      tags: ['GBS Req', 'Leadership', 'STEM'],
    })
    const header = csv.split('\r\n')[0].split(',')
    expect(header.slice(header.indexOf('Category') + 1, header.indexOf('Category') + 4)).toEqual(['GBS Req', 'Leadership', 'STEM'])
    expect(rows(csv)[0]).toMatchObject({ 'GBS Req': 'Yes', Leadership: '', STEM: 'Yes' })
  })

  it('sorts by term, then SOM first; or keeps the given order', () => {
    expect(rows(buildCourseListCsv([yale, som, fall])).map((r) => r['Course Number'])).toEqual(['MGT 999', 'MGT 653', 'CPSC 3810'])
    expect(rows(buildCourseListCsv([yale, som], { sort: false })).map((r) => r['Course Number'])).toEqual(['CPSC 3810', 'MGT 653'])
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
