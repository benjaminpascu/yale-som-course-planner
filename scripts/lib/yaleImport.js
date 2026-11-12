/**
 * Turns Yale's Courses Web Service v3 sections (every school except SOM and
 * Law) into rows for docs/data-samples/yale_courses_<term>.csv. Same columns
 * as the SOM files plus `School` and `Course Page`, so the app parses both the
 * same way. Used by scripts/update-yale-courses.js; see
 * docs/updating-course-data.md.
 */
import { OUTPUT_COLUMNS, termFileSlug } from './courseImport.js'

/** Columns of yale_courses_<term>.csv, in file order. */
export const YALE_COLUMNS = [...OUTPUT_COLUMNS, 'School', 'Course Page', 'Cross Listings', 'Prerequisites']

export const COURSES_URL = 'https://gw.its.yale.edu/soa-gateway/courses/webservice/v3/index'
export const SUBJECTS_URL = 'https://gw.its.yale.edu/soa-gateway/course/webservice/v2/subjects'

/**
 * Yale school codes asked through the Courses Web Service (codes from
 * CourseTable's public code). SOM (MG) keeps its own feed; Law (LW) comes from
 * Law's own course site; Summer (SU) is skipped.
 */
export const YALE_API_SCHOOLS = ['AC', 'AT', 'DI', 'DR', 'FS', 'GB', 'GS', 'MD', 'MU', 'NR', 'PA', 'PH', 'YC']

/**
 * Courses with this status are left out: C cancelled, X not offered, B/D moved
 * to another term, N number changed (the course lives on under its new number).
 */
const SKIPPED_STATUSES = new Set(['C', 'X', 'B', 'D', 'N'])

const DAY_CODES = { M: 'Mo', T: 'Tu', W: 'We', Th: 'Th', F: 'Fr', Sa: 'Sa', Su: 'Su' }
const DAY_ORDER = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

/**
 * Stable course ID: "<termCode>-<main number>-<section>", e.g. "202603-AFST3360-01".
 * (SOM course IDs are plain numbers, so the two never collide.)
 */
export function yaleCourseId(termCode, mainNumber, sectionNumber) {
  return `${termCode}-${String(mainNumber).replace(/\s+/g, '')}-${sectionNumber || '01'}`
}

/** File name for a term, e.g. 202701 → yale_courses_spring2027.csv. */
export function yaleFileName(termCode) {
  const slug = termFileSlug(termCode)
  return slug ? `yale_courses_${slug}.csv` : null
}

export function termCodeFromYaleFileName(fileName) {
  const match = /^yale_courses_(fall|spring)(\d{4})\.csv$/.exec(fileName)
  if (!match) return null
  return `${match[2]}${match[1] === 'fall' ? '03' : '01'}`
}

/**
 * Yale writes times without am/pm: 8–11 are morning, 12 is noon, 1–6 are
 * afternoon. A trailing "p" marks evening ("7.00-8.55p").
 */
function toClock(hourText, minuteText, isPm) {
  let hour = Number(hourText)
  if (isPm && hour < 12) hour += 12
  return `${String(hour).padStart(2, '0')}:${minuteText}`
}

/**
 * One Yale meeting pattern, e.g. "TTh 4.10-6.00p" → days + 24h times.
 * Returns null for patterns without a weekly time ("1 HTBA").
 */
function parsePattern(pattern) {
  const match = /^((?:Th|Sa|Su|M|T|W|F)+)\s+(\d{1,2})\.(\d{2})-(\d{1,2})\.(\d{2})(p?)/.exec(pattern.trim())
  if (!match) return null
  const [, dayText, sh, sm, eh, em, evening] = match
  const days = dayText.match(/Th|Sa|Su|M|T|W|F/g).map((d) => DAY_CODES[d])
  const startHour = Number(sh)
  const endHour = Number(eh)
  const endPm = Boolean(evening) || (endHour >= 1 && endHour <= 7)
  // An afternoon/evening end makes the start afternoon too, unless it starts in
  // the morning and runs past noon ("11.35-1.00").
  const startPm = endPm && startHour < 12 && startHour <= endHour
  return { days, start: toClock(sh, sm, startPm), end: toClock(eh, em, endPm) }
}

/**
 * All of a section's meeting patterns → the app's single weekly slot.
 * Patterns with the same times share one slot (their days are combined);
 * otherwise the first timed pattern is used. No timed pattern → empty fields.
 *
 * @param {string[] | null | undefined} patterns
 * @returns {{ days_clean: string, start_24h: string, end_24h: string }}
 */
export function parseMeetingPatterns(patterns) {
  const timed = (patterns ?? []).map(parsePattern).filter(Boolean)
  if (timed.length === 0) return { days_clean: '', start_24h: '', end_24h: '' }
  const first = timed[0]
  const days = new Set(
    timed.filter((p) => p.start === first.start && p.end === first.end).flatMap((p) => p.days),
  )
  return {
    days_clean: DAY_ORDER.filter((d) => days.has(d)).join(','),
    start_24h: first.start,
    end_24h: first.end,
  }
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" }

/** Yale's HTML descriptions → plain text. */
export function htmlToText(html) {
  return String(html ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (entity, name) => {
      if (name[0] === '#') {
        const code = name[1].toLowerCase() === 'x' ? Number.parseInt(name.slice(2), 16) : Number(name.slice(1))
        return Number.isFinite(code) ? String.fromCodePoint(code) : entity
      }
      return ENTITIES[name.toLowerCase()] ?? entity
    })
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** "ECON3365" / "EP&E4301" → "ECON 3365" / "EP&E 4301". */
function spacedNumber(subjectNumber) {
  return String(subjectNumber ?? '').replace(/^([A-Z&]+)\s*(\d)/, '$1 $2')
}

function text(value) {
  return value == null ? '' : String(value).trim()
}

/**
 * All of a term's Yale sections → CSV rows, one per class. Cancelled, not
 * offered and moved sections are left out.
 *
 * Yale gives each listing of a cross-listed class its own CRN (AFST 3360,
 * ANTH 3860 and ER&M 1614 can be one class with three CRNs, sometimes with
 * different section numbers). Listings are the same class when they share the
 * school, the full set of course numbers, the meeting times and the
 * instructors. Each class appears once, under its main number (Yale's
 * `primXLst`); the other numbers go in `Cross Listings`. Its ID is built from
 * the main number and the section of the main listing (or the lowest-CRN
 * listing when the main one isn't there), so it stays the same day to day.
 *
 * @param {Record<string, unknown>[]} sections — Courses Web Service v3 items
 * @param {string} termCode
 * @returns {{ rows: Record<string, string>[], crnsByCourseId: Map<string, string>, problems: string[] }}
 */
export function buildYaleRows(sections, termCode) {
  const problems = []
  const session = termCode.endsWith('03') ? 'fall' : 'spring'

  const byCrn = new Map()
  for (const section of sections) {
    const status = text(section.cSectionStatus || section.sectionStatus)
    if (SKIPPED_STATUSES.has(status)) continue
    if (text(section.termCode) !== termCode) {
      problems.push(`${text(section.subjectNumber)}: term ${text(section.termCode)}, expected ${termCode}`)
      continue
    }
    const crn = text(section.crn)
    if (!crn) {
      problems.push(`${text(section.subjectNumber)} ${text(section.courseTitle)}: no CRN, left out`)
      continue
    }
    byCrn.set(crn, section)
  }

  // Same school, meeting times and instructors, and linked by a shared course
  // number (directly or through a chain, since Yale's listings don't always
  // name every sibling): candidates for one class.
  const slots = new Map()
  for (const section of byCrn.values()) {
    // Sorted: Yale lists the same meetings/instructors in different orders on different listings.
    const key = [text(section.schoolCode), list(section.meetingPattern).sort().join(';'), list(section.instructorList).sort().join(';')].join('|')
    if (!slots.has(key)) slots.set(key, [])
    slots.get(key).push(section)
  }
  const buckets = new Map()
  for (const slot of slots.values()) {
    const parent = slot.map((_, i) => i)
    const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])))
    const owner = new Map()
    slot.forEach((section, i) => {
      for (const number of listingNumbers(section)) {
        if (owner.has(number)) parent[find(i)] = find(owner.get(number))
        else owner.set(number, i)
      }
    })
    const groups = new Map()
    slot.forEach((section, i) => {
      const root = find(i)
      if (!groups.has(root)) groups.set(root, [])
      groups.get(root).push(section)
    })
    for (const group of groups.values()) buckets.set(buckets.size, group)
  }
  // Within a bucket, sections with the same number are different classes (e.g.
  // several lesson sections); each class takes at most one listing per number,
  // paired up in section order.
  const classes = []
  for (const bucket of buckets.values()) {
    const byNumber = new Map()
    for (const section of bucket) {
      const number = text(section.subjectNumber)
      if (!byNumber.has(number)) byNumber.set(number, [])
      byNumber.get(number).push(section)
    }
    const lists = [...byNumber.values()].map((l) =>
      l.sort((a, b) => text(a.sectionNumber).localeCompare(text(b.sectionNumber)) || Number(text(a.crn)) - Number(text(b.crn))),
    )
    const count = Math.max(...lists.map((l) => l.length))
    for (let i = 0; i < count; i++) classes.push(lists.map((l) => l[i]).filter(Boolean))
  }

  const rows = []
  const crnsByCourseId = new Map()
  for (const listings of classes) {
    listings.sort((a, b) => Number(text(a.crn)) - Number(text(b.crn)))
    const main = mainNumber(listings)
    const rep = listings.find((s) => text(s.subjectNumber) === main) ?? listings[0]
    const firstText = (field) => listings.map((s) => htmlToText(s[field])).find(Boolean) ?? ''
    const rooms = listings
      .flatMap((s) => list(s.meetingPatternLocation))
      .filter((room) => !/HTBA/i.test(room))
    let id = yaleCourseId(termCode, main, text(rep.sectionNumber))
    if (crnsByCourseId.has(id)) id = `${id}-${text(rep.crn)}`
    crnsByCourseId.set(id, text(rep.crn))
    const allNumbers = [...new Set(listings.flatMap(listingNumbers))].sort()

    rows.push({
      'Bid Or Permission': '',
      'Course Category': '',
      'Course Description': firstText('description'),
      'Course ID': id,
      'Course Number': spacedNumber(main),
      'Course Session': session,
      'Course Session End Date': '',
      'Course Session Start date': '',
      'Course Title': text(rep.courseTitle),
      'Course Type': '',
      'Faculty 1': list(rep.instructorList).join(', '),
      'Faculty 1 Email': '',
      'Old Syllabus': '',
      Room: [...new Set(rooms)].join(', '),
      Section: text(rep.sectionNumber),
      Syllabus: listings.map((s) => text(s.syllabusLink)).find(Boolean) ?? '',
      TermCode: termCode,
      Units: '0',
      Visible: '1',
      ...parseMeetingPatterns(rep.meetingPattern),
      tags: '',
      School: text(rep.schoolCode),
      'Course Page': '',
      'Cross Listings': allNumbers.filter((n) => n !== main).map(spacedNumber).join('; '),
      Prerequisites: firstText('prerequisites'),
    })
  }

  rows.sort((a, b) => a['Course Number'].localeCompare(b['Course Number']) || a.Section.localeCompare(b.Section))
  return { rows, crnsByCourseId, problems }
}

function list(value) {
  return (Array.isArray(value) ? value : [value]).map((v) => text(v)).filter(Boolean)
}

/**
 * A class's main number: the `primXLst` its listings name most often (ties:
 * alphabetically first); when no listing names one (listings only name each
 * other), the alphabetically first listing number.
 */
function mainNumber(listings) {
  const counts = new Map()
  for (const s of listings) {
    const named = text(s.primXLst)
    if (named) counts.set(named, (counts.get(named) ?? 0) + 1)
  }
  if (counts.size > 0) {
    return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0]
  }
  return listings.map((s) => text(s.subjectNumber)).sort()[0]
}

/** Every number a listing is known by (own, main, others), sorted. */
function listingNumbers(section) {
  return [...new Set([text(section.subjectNumber), text(section.primXLst), ...list(section.scndXLst)].filter(Boolean))].sort()
}
