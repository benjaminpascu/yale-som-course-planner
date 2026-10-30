import { normalizeCategory } from './categoryDisplay'
import { WEEKDAYS, formatCourseUnits, normalizeBidType } from './courseDisplay'
import { formatSessionLabel } from './sessionDisplay'

/** Courses still to decide, in catalog order. */
export function shortlistQueue(groups, decisions) {
  return groups.filter((g) => !decisions[g.key])
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
const REGISTRATION_LABELS = { bid: 'Bid', permission: 'Permission', core: 'Core', open: null }

function registrationLabel(raw) {
  const type = normalizeBidType(raw)
  return type in REGISTRATION_LABELS ? REGISTRATION_LABELS[type] : raw.trim()
}

/** "Economics · Bid"; a registration label that repeats the category is dropped. */
function metaLine(section) {
  const category = normalizeCategory(section.category)
  const registration = registrationLabel(section.bidOrPermission ?? '')
  const parts = [category]
  if (registration && registration.toLowerCase() !== category.toLowerCase()) parts.push(registration)
  return parts.filter(Boolean).join(' · ')
}

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
    meta: metaLine(first),
    description: first.description,
    syllabusUrl: first.syllabusUrl ?? null,
  }
}
