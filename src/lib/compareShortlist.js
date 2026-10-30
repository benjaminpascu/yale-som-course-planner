import { normalizeCategory } from './categoryDisplay'
import { WEEKDAYS, formatCourseUnits } from './courseDisplay'
import { formatSessionLabel } from './sessionDisplay'

/** Groups in the saved Shortlist order; any without a place follow in catalog order. */
export function orderGroups(groups, order) {
  const rank = new Map(order.map((key, i) => [key, i]))
  return groups
    .map((g, i) => ({ g, i, r: rank.get(g.key) ?? Infinity }))
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .map(({ g }) => g)
}

/** Courses still to decide, in the order given. */
export function shortlistQueue(groups, decisions) {
  return groups.filter((g) => !decisions[g.key])
}

const squash = (text) => text.toLowerCase().replace(/\s+/g, '')

/**
 * Courses with one decision, in course-number order, for reviewing and changing
 * past decisions. `query` matches number, title or professor (case and spaces ignored).
 */
export function reviewList(groups, decisions, decision, query) {
  const q = squash(query)
  return groups
    .filter((g) => decisions[g.key] === decision)
    .filter(
      (g) =>
        !q ||
        squash(`${g.courseNumber} ${g.title} ${g.professors.join(' ')}`).includes(q),
    )
    .sort((a, b) => a.courseNumber.localeCompare(b.courseNumber, undefined, { numeric: true }))
}

/** Interested / maybe / not counts for this term's courses only. */
export function decisionCounts(groups, decisions) {
  const counts = { yes: 0, maybe: 0, no: 0, decided: 0, total: groups.length }
  for (const g of groups) {
    const d = decisions[g.key]
    if (!d) continue
    counts[d] += 1
    counts.decided += 1
  }
  return counts
}

const DAY_LETTERS = { Mo: 'M', Tu: 'T', We: 'W', Th: 'T', Fr: 'F' }
const DAY_NAMES = { Mo: 'Monday', Tu: 'Tuesday', We: 'Wednesday', Th: 'Thursday', Fr: 'Friday' }
/**
 * Display fields for a Shortlist card. Sections don't matter here, so days,
 * time and links come from the first section; professors from all sections.
 */
export function shortlistCard(group) {
  const [first] = group.sections
  const meets = new Set(first.meetingDays)
  const days = WEEKDAYS.map((d) => ({ letter: DAY_LETTERS[d], on: meets.has(d) }))
  const meetNames = WEEKDAYS.filter((d) => meets.has(d)).map((d) => DAY_NAMES[d])
  return {
    heading: `${group.courseNumber} — ${group.title}`,
    units: `(${formatCourseUnits(group.units)})`,
    professors: group.professors.join(' / '),
    session: formatSessionLabel(first.session),
    tags: group.tags,
    days,
    daysLabel: meetNames.length ? `Meets ${meetNames.join(' and ')}` : 'No weekly meeting time',
    time: first.startTime && first.endTime ? `${first.startTime}–${first.endTime}` : null,
    category: normalizeCategory(first.category),
    description: first.description,
    syllabusUrl: first.syllabusUrl ?? null,
  }
}
