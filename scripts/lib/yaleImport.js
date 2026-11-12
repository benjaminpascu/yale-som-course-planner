/**
 * Turns Yale's Courses Web Service v3 sections (every school except SOM and
 * Law) into rows for docs/data-samples/yale_courses_<term>.csv. Same columns
 * as the SOM files plus `School` and `Course Page`, so the app parses both the
 * same way. Used by scripts/update-yale-courses.js; see
 * docs/updating-course-data.md.
 */
import { OUTPUT_COLUMNS, termFileSlug } from './courseImport.js'

/** Columns of yale_courses_<term>.csv, in file order. */
export const YALE_COLUMNS = [...OUTPUT_COLUMNS, 'School', 'Course Page']

export const COURSES_URL = 'https://gw.its.yale.edu/soa-gateway/courses/webservice/v3/index'
export const SUBJECTS_URL = 'https://gw.its.yale.edu/soa-gateway/course/webservice/v2/subjects'

/**
 * Yale school codes asked through the Courses Web Service (codes from
 * CourseTable's public code). SOM (MG) keeps its own feed; Law (LW) comes from
 * Law's own course site; Summer (SU) is skipped.
 */
export const YALE_API_SCHOOLS = ['AC', 'AT', 'DI', 'DR', 'FS', 'GB', 'GS', 'MD', 'MU', 'NR', 'PA', 'PH', 'YC']

/** Courses with this status are left out: C cancelled, B/D moved to another term. */
const SKIPPED_STATUSES = new Set(['C', 'B', 'D'])

const DAY_CODES = { M: 'Mo', T: 'Tu', W: 'We', Th: 'Th', F: 'Fr', Sa: 'Sa', Su: 'Su' }
const DAY_ORDER = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

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
 * Yale sections for one school → CSV rows. Cancelled sections are left out.
 * A course listed under several subjects with the same CRN appears once, under
 * its main listing (Yale's `primXLst`).
 *
 * @param {Record<string, unknown>[]} sections — Courses Web Service v3 items
 * @param {string} termCode
 * @returns {{ rows: Record<string, string>[], problems: string[] }}
 */
export function buildYaleRows(sections, termCode) {
  const problems = []
  const session = termCode.endsWith('03') ? 'fall' : 'spring'
  const byId = new Map()

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
    const id = `${termCode}-${crn}`
    const isMainListing = !section.primXLst || text(section.primXLst) === text(section.subjectNumber)
    const existing = byId.get(id)
    if (existing && !isMainListing) continue

    const instructors = Array.isArray(section.instructorList) ? section.instructorList.filter(Boolean) : []
    const rooms = (Array.isArray(section.meetingPatternLocation) ? section.meetingPatternLocation : [])
      .map((room) => text(room))
      .filter((room) => room && !/HTBA/i.test(room))

    byId.set(id, {
      row: {
        'Bid Or Permission': '',
        'Course Category': '',
        'Course Description': htmlToText(section.description),
        'Course ID': id,
        'Course Number': spacedNumber(section.subjectNumber),
        'Course Session': session,
        'Course Session End Date': '',
        'Course Session Start date': '',
        'Course Title': text(section.courseTitle),
        'Course Type': '',
        'Faculty 1': instructors.join(', '),
        'Faculty 1 Email': '',
        'Old Syllabus': '',
        Room: [...new Set(rooms)].join(', '),
        Section: text(section.sectionNumber),
        Syllabus: text(section.syllabusLink),
        TermCode: termCode,
        Units: '0',
        Visible: '1',
        ...parseMeetingPatterns(section.meetingPattern),
        tags: '',
        School: text(section.schoolCode),
        'Course Page': '',
      },
    })
  }

  const rows = [...byId.values()]
    .map(({ row }) => row)
    .sort((a, b) => a['Course Number'].localeCompare(b['Course Number']) || a.Section.localeCompare(b.Section))
  return { rows, problems }
}
