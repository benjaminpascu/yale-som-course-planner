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

/**
 * Bidding points colors (user-set Nov 20, 2026): gray at 0 and for blank cells
 * (no result), fading to yellow at 50 and red at 100; above 100 is dark red.
 */
const BIDDING_COLORS = { zero: 'FFE5E7EB', fifty: 'FFFFD966', hundred: 'FFF8696B', over: 'FF8B0000' }

function colorBiddingPoints(sheet, ref) {
  const topLeft = ref.split(':')[0]
  const fill = (argb) => ({ type: 'pattern', pattern: 'solid', bgColor: { argb } })
  sheet.addConditionalFormatting({
    ref,
    rules: [
      // Blanks first: the table's empty results are text (""), which Excel would
      // otherwise count as more than 100. Both rules stop there, so the scale
      // below never repaints these cells.
      {
        priority: 1,
        type: 'expression',
        formulae: [`NOT(ISNUMBER(${topLeft}))`],
        stopIfTrue: true,
        style: { fill: fill(BIDDING_COLORS.zero) },
      },
      {
        priority: 2,
        type: 'expression',
        formulae: [`${topLeft}>100`],
        stopIfTrue: true,
        style: { fill: fill(BIDDING_COLORS.over), font: { color: { argb: 'FFFFFFFF' } } },
      },
      {
        priority: 3,
        type: 'colorScale',
        cfvo: [
          { type: 'num', value: 0 },
          { type: 'num', value: 50 },
          { type: 'num', value: 100 },
        ],
        color: [
          { argb: BIDDING_COLORS.zero },
          { argb: BIDDING_COLORS.fifty },
          { argb: BIDDING_COLORS.hundred },
        ],
      },
    ],
  })
}

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
    colorBiddingPoints(sheet, `B${first}:C${avgRow}`)
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
    colorBiddingPoints(dataSheet, `C2:D${bidding.rows.length + 1}`)

    const lists = workbook.addWorksheet('Lists', { state: 'hidden' })
    bidding.courses.forEach((name, i) => (lists.getCell(`A${i + 1}`).value = name))
  }

  return workbook
}

const gnwLocation = (title) => String(title ?? '').replace(/^GNW:\s*/i, '').trim()

/** "2027-03-08" → "Mar 8, 2027" */
function formatDay(isoDay) {
  if (!isoDay) return ''
  const [y, m, d] = isoDay.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/** Every past GNW section in SOM's bidding file, newest semester first. Each location is its own row. */
export function pastGnwRows(biddingCsvText) {
  const { data } = Papa.parse(biddingCsvText ?? '', { header: true, skipEmptyLines: true })
  return data
    .filter(
      (r) =>
        r.course_number?.trim() === 'MGT 600' &&
        /^GNW\b/i.test(r.title ?? '') &&
        termKey(r.term) != null,
    )
    .map((r) => ({
      location: gnwLocation(r.title),
      term: r.term,
      round1: toPoints(r.round_1),
      round2: toPoints(r.round_2),
      section: r.section,
    }))
    .sort((a, b) => termKey(b.term) - termKey(a.term) || a.location.localeCompare(b.location))
}

/** GNWs not over by `today`, by start date then location. */
export function upcomingGnws(gnws, today = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  const day = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`
  return gnws
    .filter((g) => !g.sessionEnd || g.sessionEnd >= day)
    .sort(
      (a, b) =>
        (a.sessionStart ?? '').localeCompare(b.sessionStart ?? '') ||
        gnwLocation(a.title).localeCompare(gnwLocation(b.title)),
    )
}

/**
 * The GNW workbook: Bidding (type part of a name, see points per semester and
 * round), GNWs (the upcoming ones, with their website), Past GNWs (every past
 * name as SOM wrote it, so the search word can be checked). Names change by
 * year, so the owner searches by word instead of the app guessing matches.
 */
export function buildGnwWorkbook(ExcelJS, { gnws, biddingCsvText, today = new Date() }) {
  const workbook = new ExcelJS.Workbook()
  workbook.calcProperties.fullCalcOnLoad = true
  const past = pastGnwRows(biddingCsvText)
  const terms = [...new Set(past.map((r) => r.term))]
  const pastSheet = "'Past GNWs'"

  const sheet = workbook.addWorksheet('Bidding')
  sheet.getCell('A1').value = 'Search'
  sheet.getCell('A1').font = bold
  const search = sheet.getCell('B1')
  search.font = bold
  search.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF4CC' } }
  sheet.mergeCells('B1:D1')
  sheet.getCell('A2').value =
    'Type part of a GNW name in the yellow cell (e.g. ESMT, Cape Town, Chile); empty shows all GNWs. Names change by year: check them on Past GNWs.'
  sheet.getCell('A2').font = { italic: true, color: { argb: 'FF6B7280' } }

  const headerRow = 4
  sheet.getRow(headerRow).values = ['Semester', 'Round 1', 'Round 2', 'GNWs found']
  sheet.getRow(headerRow).font = bold
  const first = headerRow + 1
  const match = `${pastSheet}!$A:$A,"*"&$B$1&"*",${pastSheet}!$B:$B,$A`
  terms.forEach((term, i) => {
    const r = first + i
    sheet.getCell(`A${r}`).value = term
    for (const [col, dataCol] of [
      ['B', 'C'],
      ['C', 'D'],
    ]) {
      const cell = sheet.getCell(`${col}${r}`)
      cell.value = {
        formula: `IFERROR(AVERAGEIFS(${pastSheet}!$${dataCol}:$${dataCol},${match}${r}),"")`,
      }
      cell.numFmt = '0'
    }
    sheet.getCell(`D${r}`).value = { formula: `COUNTIFS(${match}${r})` }
  })
  const last = first + terms.length - 1
  const avgRow = last + 1
  sheet.getCell(`A${avgRow}`).value = 'Average'
  sheet.getRow(avgRow).font = bold
  for (const col of ['A', 'B', 'C']) sheet.getCell(`${col}${avgRow}`).border = { top: { style: 'thin' } }
  for (const col of ['B', 'C']) {
    const cell = sheet.getCell(`${col}${avgRow}`)
    cell.value = { formula: `IFERROR(AVERAGE(${col}${first}:${col}${last}),"")` }
    cell.numFmt = '0'
  }
  sheet.columns = [{ width: 16 }, { width: 12 }, { width: 12 }, { width: 12 }]
  if (terms.length) colorBiddingPoints(sheet, `B${first}:C${avgRow}`)

  const list = workbook.addWorksheet('GNWs')
  const listHeader = ['Term', 'Section', 'Location', 'Theme', 'Starts', 'Ends', 'Units', 'Bid or Permission', 'Website']
  list.addRow(listHeader).font = bold
  for (const g of upcomingGnws(gnws, today)) {
    const row = list.addRow([
      formatTermLabel(g.termCode),
      g.section,
      gnwLocation(g.title),
      g.description,
      formatDay(g.sessionStart),
      formatDay(g.sessionEnd),
      g.units,
      g.bidOrPermission,
      g.syllabusUrl ? { text: g.syllabusUrl, hyperlink: g.syllabusUrl } : '',
    ])
    row.getCell(9).font = { color: { argb: 'FF1D4ED8' }, underline: true }
  }
  list.columns = [12, 8, 50, 40, 13, 13, 7, 10, 70].map((width) => ({ width }))
  list.views = [{ state: 'frozen', ySplit: 1 }]
  list.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: listHeader.length } }

  const pastList = workbook.addWorksheet('Past GNWs')
  pastList.addRow(['Location', 'Semester', 'Round 1', 'Round 2', 'Section']).font = bold
  for (const r of past) pastList.addRow([r.location, r.term, r.round1, r.round2, r.section])
  pastList.columns = [60, 14, 10, 10, 9].map((width) => ({ width }))
  pastList.views = [{ state: 'frozen', ySplit: 1 }]
  pastList.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 5 } }
  if (past.length) colorBiddingPoints(pastList, `C2:D${past.length + 1}`)

  return workbook
}

/** Load ExcelJS on demand, build the workbook (`build`, default the course export), and download it. */
export async function downloadExportWorkbook(fileName, options, build = buildExportWorkbook) {
  const ExcelJS = (await import('exceljs')).default
  const buffer = await build(ExcelJS, options).xlsx.writeBuffer()
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
