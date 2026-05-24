const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr']

export { WEEKDAYS }

/** 15-minute steps from 8:00 through 21:00 (calendar hours in PRD §7.2). */
export const TIME_PICKER_OPTIONS = buildTimePickerOptions()

/**
 * @param {{ startHour?: number, endHour?: number, stepMinutes?: number }} [opts]
 * @returns {{ value: string, label: string }[]}
 */
export function buildTimePickerOptions({
  startHour = 8,
  endHour = 21,
  stepMinutes = 15,
} = {}) {
  const options = []
  const start = startHour * 60
  const end = endHour * 60

  for (let minutes = start; minutes <= end; minutes += stepMinutes) {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    options.push({ value, label: formatTimeLabel(value) })
  }

  return options
}

/** @param {string} hhmm — `HH:MM` 24-hour */
export function formatTimeLabel(hhmm) {
  const total = parseTimeToMinutes(hhmm)
  if (total === null) return hhmm
  const h24 = Math.floor(total / 60)
  const m = total % 60
  const period = h24 >= 12 ? 'PM' : 'AM'
  const h12 = h24 % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${period}`
}

/** @param {string | null | undefined} time — `HH:MM` or typed filter value */
export function parseTimeToMinutes(time) {
  const raw = time?.trim()
  if (!raw) return null
  const match = raw.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return hours * 60 + minutes
}

/** @param {number} units */
export function formatCourseUnits(units) {
  if (units === 1) return '1 unit'
  if (units === 0) return '0 units'
  return `${units} units`
}

/**
 * Course number, title, and units — e.g. `MGT 403 — Title (2 units)`.
 *
 * @param {{ courseNumber: string, title: string, units: number }} course
 */
export function formatCourseHeading(course) {
  return `${course.courseNumber} — ${course.title} (${formatCourseUnits(course.units)})`
}

/**
 * Normalize messy CSV values for filtering and badges.
 * @returns {'bid' | 'permission' | 'core' | 'open' | 'other'}
 */
export function normalizeBidType(value) {
  const raw = (value ?? '').trim()
  const v = raw.toLowerCase()
  if (v === 'bid') return 'bid'
  if (v === 'core') return 'core'
  if (v === 'permission' || v === 'permission?') return 'permission'
  if (v === 'no' || v === '') return 'open'
  return 'other'
}

/**
 * Single source for bid/permission types: filter checkboxes, row tags, CSV export.
 * `id` must match `normalizeBidType()` return values.
 */
export const BID_TYPE_CONFIG = {
  bid: {
    tagLabel: 'Bid required',
    filterLabel: 'Bid required',
    theme: { bg: '#874848', fg: '#f8ecec' },
  },
  permission: {
    tagLabel: 'Permission required',
    filterLabel: 'Permission required',
    theme: { bg: '#874848', fg: '#f8ecec' },
  },
  core: {
    tagLabel: 'Core',
    filterLabel: 'Core',
    theme: { bg: '#00356b', fg: '#ffffff' },
  },
  open: {
    tagLabel: 'Open',
    filterLabel: 'Open (no bid)',
    theme: { bg: '#3d6b52', fg: '#f0f7f2' },
  },
  other: {
    tagLabel: null,
    filterLabel: 'Other',
    theme: { bg: '#6b7280', fg: '#f9fafb' },
  },
}

/** @type {(keyof typeof BID_TYPE_CONFIG)[]} */
export const BID_TYPE_IDS = Object.keys(BID_TYPE_CONFIG)

/** @param {string} bidOrPermission — raw CSV value */
export function bidBadge(bidOrPermission) {
  const type = normalizeBidType(bidOrPermission)
  const config = BID_TYPE_CONFIG[type]
  const label =
    type === 'other'
      ? bidOrPermission.trim() || 'Other'
      : config.tagLabel
  return { type, label }
}

/**
 * Colored tag for catalog rows — same categories as the bid/permission filter.
 *
 * @param {string} bidOrPermission
 * @returns {{ label: string, bg: string, fg: string } | null}
 */
export function getRegistrationTag(bidOrPermission) {
  const { type, label } = bidBadge(bidOrPermission)
  if (!label) return null

  return { label, ...BID_TYPE_CONFIG[type].theme }
}
