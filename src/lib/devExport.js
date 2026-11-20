/**
 * Owner-only exports for the hidden ?export page: one saved plan's courses, or a
 * school's (or every) course, as an Excel file. The first sheet, Bidding, has a
 * course dropdown and that course's average clearing points per round by semester.
 */
import Papa from 'papaparse'
import { formatTermLabel } from './academicYear.js'
import { destinationOf } from './biddingHistory.js'
import { isSomCourse, schoolLabel } from './schools.js'

function meetingTimes(course) {
  if (!course.meetingDays?.length || !course.startTime || !course.endTime) return ''
  return `${course.meetingDays.join(',')} ${course.startTime}–${course.endTime}`
}

const COLUMNS = [
  ['Term', (c) => formatTermLabel(c.termCode)],
  ['Session', (c) => c.session],
  ['School', (c) => schoolLabel(c.school)],
  ['Course Number', (c) => c.courseNumber],
  ['Section', (c) => c.section],
  ['Title', (c) => c.title],
  ['Instructor', (c) => c.faculty],
  ['Meeting Times', meetingTimes],
  // Other schools' files carry no SOM units.
  ['Units', (c) => (isSomCourse(c) ? c.units : '')],
  ['Category', (c) => c.category],
  ['Bid or Permission', (c) => c.bidOrPermission],
  ['Cross Listings', (c) => (c.crossListings ?? []).join('; ')],
  ['Prerequisites', (c) => c.prerequisites],
  ['Description', (c) => c.description],
  ['Syllabus', (c) => c.syllabusUrl ?? ''],
  ['Course Page', (c) => c.coursePageUrl ?? ''],
]
// Tag columns go right after Category.
const TAGS_AT = COLUMNS.findIndex(([name]) => name === 'Category') + 1

/** Every tag name on these courses (STEM, GBS Req, …), alphabetically. */
export function tagNames(courses) {
  return [...new Set(courses.flatMap((c) => c.tags ?? []))].sort()
}

export function sortCourses(courses) {
  return [...courses].sort(
    (a, b) =>
      a.termCode.localeCompare(b.termCode) ||
      Number(!isSomCourse(a)) - Number(!isSomCourse(b)) ||
      a.courseNumber.localeCompare(b.courseNumber, undefined, { numeric: true }) ||
      a.section.localeCompare(b.section),
  )
}

/**
 * The Courses sheet: one row per section, with a Yes column per tag in `tags`
 * (defaults to the tags found on these courses).
 */
export function buildCourseTable(courses, { tags = tagNames(courses) } = {}) {
  const columns = [
    ...COLUMNS.slice(0, TAGS_AT),
    ...tags.map((tag) => [tag, (c) => (c.tags?.includes(tag) ? 'Yes' : '')]),
    ...COLUMNS.slice(TAGS_AT),
  ]
  return {
    header: columns.map(([name]) => name),
    rows: courses.map((course) => columns.map(([, value]) => value(course) ?? '')),
  }
}

/** "Spring 2026" → sortable number; null for the two old tabs SOM labels "2000". */
function termKey(term) {
  const match = /^(Spring|Fall) (\d{4})$/.exec(term)
  if (!match || match[2] === '2000') return null
  return Number(match[2]) * 10 + (match[1] === 'Fall' ? 1 : 0)
}

const toPoints = (value) => {
  const text = String(value ?? '').trim()
  return text === '' ? null : Number(text)
}

const average = (values) => {
  const points = values.filter((v) => v != null)
  return points.length ? Math.round(points.reduce((sum, p) => sum + p, 0) / points.length) : null
}

/**
 * Past clearing points for the SOM courses in this export, one row per course
 * and semester: each round averaged over that semester's sections. A course is
 * its number + title; where one number covers several courses now (the MGT 416
 * trips), only past rows for the same destination count.
 *
 * @returns {{ courses: string[], terms: string[], rows: { course: string, term: string, round1: number|null, round2: number|null, sections: number }[] }}
 */
export function buildBiddingTable(courses, biddingCsvText) {
  const { data } = Papa.parse(biddingCsvText ?? '', { header: true, skipEmptyLines: true })
  const history = data.filter((r) => r.course_number && termKey(r.term) != null)

  const somCourses = courses.filter(isSomCourse)
  const titlesByNumber = new Map()
  for (const c of somCourses) {
    titlesByNumber.set(c.courseNumber, (titlesByNumber.get(c.courseNumber) ?? new Set()).add(c.title))
  }

  const names = []
  const rows = []
  for (const course of somCourses) {
    const name = `${course.courseNumber} ${course.title}`
    if (names.includes(name)) continue
    const byDestination = titlesByNumber.get(course.courseNumber).size > 1
    const destination = destinationOf(course.title)
    const past = history.filter(
      (r) =>
        r.course_number.trim() === course.courseNumber &&
        (!byDestination || destinationOf(r.title) === destination),
    )
    if (!past.length) continue
    names.push(name)
    const terms = [...new Set(past.map((r) => r.term))]
    for (const term of terms) {
      const sections = past.filter((r) => r.term === term)
      rows.push({
        course: name,
        term,
        round1: average(sections.map((r) => toPoints(r.round_1))),
        round2: average(sections.map((r) => toPoints(r.round_2))),
        sections: sections.length,
      })
    }
  }
  const terms = [...new Set(rows.map((r) => r.term))].sort((a, b) => termKey(b) - termKey(a))
  rows.sort((a, b) => names.indexOf(a.course) - names.indexOf(b.course) || termKey(b.term) - termKey(a.term))
  return { courses: names, terms, rows }
}

const bold = { bold: true }

/** The workbook. `ExcelJS` is passed in so the library stays lazy-loaded. */
export function buildExportWorkbook(ExcelJS, { courses, tags, biddingCsvText }) {
  const workbook = new ExcelJS.Workbook()
  workbook.calcProperties.fullCalcOnLoad = true
  const bidding = buildBiddingTable(courses, biddingCsvText)

  if (bidding.courses.length) {
    const sheet = workbook.addWorksheet('Bidding')
    const dataSheet = "'Bidding data'"
    sheet.getCell('A1').value = 'Course'
    sheet.getCell('A1').font = bold
    const pick = sheet.getCell('B1')
    pick.value = bidding.courses[0]
    pick.font = bold
    pick.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF4CC' } }
    pick.dataValidation = {
      type: 'list',
      allowBlank: false,
      formulae: [`Lists!$A$1:$A$${bidding.courses.length}`],
    }
    sheet.mergeCells('B1:D1')
    sheet.getCell('A2').value = 'Pick a course in the yellow cell. Points are averaged over the sections that semester.'
    sheet.getCell('A2').font = { italic: true, color: { argb: 'FF6B7280' } }

    const headerRow = 4
    sheet.getRow(headerRow).values = ['Semester', 'Round 1', 'Round 2']
    sheet.getRow(headerRow).font = bold
    const first = headerRow + 1
    bidding.terms.forEach((term, i) => {
      const r = first + i
      sheet.getCell(`A${r}`).value = term
      for (const [col, dataCol] of [['B', 'C'], ['C', 'D']]) {
        const cell = sheet.getCell(`${col}${r}`)
        cell.value = {
          formula: `IFERROR(AVERAGEIFS(${dataSheet}!$${dataCol}:$${dataCol},${dataSheet}!$A:$A,$B$1,${dataSheet}!$B:$B,$A${r}),"")`,
        }
        cell.numFmt = '0'
      }
    })
    const last = first + bidding.terms.length - 1
    const avgRow = last + 1
    sheet.getCell(`A${avgRow}`).value = 'Average'
    sheet.getRow(avgRow).font = bold
    for (const col of ['B', 'C']) {
      const cell = sheet.getCell(`${col}${avgRow}`)
      cell.value = { formula: `IFERROR(AVERAGE(${col}${first}:${col}${last}),"")` }
      cell.numFmt = '0'
      cell.border = { top: { style: 'thin' } }
    }
    sheet.getCell(`A${avgRow}`).border = { top: { style: 'thin' } }
    sheet.columns = [{ width: 16 }, { width: 12 }, { width: 12 }, { width: 40 }]
  }

  const table = buildCourseTable(courses, { tags })
  const coursesSheet = workbook.addWorksheet('Courses')
  coursesSheet.addRow(table.header).font = bold
  for (const row of table.rows) coursesSheet.addRow(row)
  coursesSheet.columns.forEach((column, i) => {
    const name = table.header[i]
    column.width = name === 'Title' ? 40 : name === 'Description' ? 80 : name === 'Instructor' ? 24 : 14
  })
  coursesSheet.views = [{ state: 'frozen', ySplit: 1 }]
  coursesSheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: table.header.length } }

  if (bidding.courses.length) {
    const dataSheet = workbook.addWorksheet('Bidding data')
    dataSheet.addRow(['Course', 'Semester', 'Round 1', 'Round 2', 'Sections']).font = bold
    for (const r of bidding.rows) dataSheet.addRow([r.course, r.term, r.round1, r.round2, r.sections])
    dataSheet.columns = [{ width: 50 }, { width: 14 }, { width: 10 }, { width: 10 }, { width: 10 }]
    dataSheet.views = [{ state: 'frozen', ySplit: 1 }]
    dataSheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 5 } }

    const lists = workbook.addWorksheet('Lists', { state: 'hidden' })
    bidding.courses.forEach((name, i) => (lists.getCell(`A${i + 1}`).value = name))
  }

  return workbook
}

/** Load ExcelJS on demand, build the workbook, and download it. */
export async function downloadExportWorkbook(fileName, options) {
  const ExcelJS = (await import('exceljs')).default
  const buffer = await buildExportWorkbook(ExcelJS, options).xlsx.writeBuffer()
  const url = URL.createObjectURL(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = `${fileName}.xlsx`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

/** A saved plan's courses (in plan order), skipping any no longer in the data. */
export function planCourses(plan, coursesById) {
  return plan.courseIds.map((id) => coursesById.get(id)).filter(Boolean)
}

export function safeFileName(name) {
  return name.trim().replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '') || 'plan'
}
