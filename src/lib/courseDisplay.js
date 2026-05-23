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

const BID_BADGE = {
  bid: { label: 'Bid required', className: 'bg-amber-100 text-amber-900' },
  permission: {
    label: 'Permission required',
    className: 'bg-violet-100 text-violet-900',
  },
  core: { label: 'Core', className: 'bg-sky-100 text-sky-900' },
  open: { label: 'Open', className: 'bg-emerald-100 text-emerald-900' },
  other: { label: null, className: 'bg-gray-100 text-gray-800' },
}

/** @param {string} bidOrPermission — raw CSV value */
export function bidBadge(bidOrPermission) {
  const type = normalizeBidType(bidOrPermission)
  const config = BID_BADGE[type]
  const label =
    type === 'other'
      ? bidOrPermission.trim() || 'Other'
      : config.label
  return { type, label, className: config.className }
}

export const BID_FILTER_OPTIONS = [
  { id: 'bid', label: 'Bid required' },
  { id: 'permission', label: 'Permission required' },
  { id: 'core', label: 'Core' },
  { id: 'open', label: 'Open (no bid)' },
  { id: 'other', label: 'Other' },
]
