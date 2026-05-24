export const TOOLTIP_Z_INDEX = 100
export const TOOLTIP_HIDE_DELAY_MS = 80
export const CALENDAR_TOOLTIP_MIN_WIDTH = 288
export const CALENDAR_TOOLTIP_MAX_WIDTH = 448

const VIEWPORT_MARGIN = 16

/** Max tooltip width that fits for this anchor (left- or right-aligned). */
export function maxTooltipWidthForAnchor(anchorEl) {
  const rect = anchorEl.getBoundingClientRect()
  const viewportMax = window.innerWidth - VIEWPORT_MARGIN * 2
  const fromLeftAlign = window.innerWidth - VIEWPORT_MARGIN - rect.left
  const fromRightAlign = rect.right - VIEWPORT_MARGIN
  return Math.max(
    CALENDAR_TOOLTIP_MIN_WIDTH,
    Math.min(CALENDAR_TOOLTIP_MAX_WIDTH, viewportMax, Math.max(fromLeftAlign, fromRightAlign)),
  )
}

/** Pick left so the tooltip stays on screen; flip to expand left when needed. */
export function computePortaledTooltipLeft(anchorRect, width) {
  const viewport = window.innerWidth
  let left = anchorRect.left

  if (left + width > viewport - VIEWPORT_MARGIN) {
    left = anchorRect.right - width
  }

  left = Math.max(VIEWPORT_MARGIN, left)

  if (left + width > viewport - VIEWPORT_MARGIN) {
    left = VIEWPORT_MARGIN
  }

  return left
}

/** Fixed position anchored to an element; width follows content up to viewport max. */
export function basePortaledTooltipStyle(anchorEl, { above = true } = {}) {
  const rect = anchorEl.getBoundingClientRect()
  const gap = 4
  const maxWidth = window.innerWidth - VIEWPORT_MARGIN * 2

  return {
    position: 'fixed',
    left: rect.left,
    width: 'max-content',
    maxWidth,
    zIndex: TOOLTIP_Z_INDEX,
    maxHeight: '20rem',
    ...(above
      ? { bottom: window.innerHeight - rect.top + gap }
      : { top: rect.bottom + gap }),
  }
}

/** Calendar popup with description: start at max width, then balance in layout. */
export function calendarCourseTooltipStyle(anchorEl, { above = true, hasDescription = false } = {}) {
  if (!hasDescription) {
    return basePortaledTooltipStyle(anchorEl, { above })
  }

  const rect = anchorEl.getBoundingClientRect()
  const gap = 4
  const width = maxTooltipWidthForAnchor(anchorEl)

  return {
    position: 'fixed',
    left: computePortaledTooltipLeft(rect, width),
    width,
    maxWidth: window.innerWidth - VIEWPORT_MARGIN * 2,
    zIndex: TOOLTIP_Z_INDEX,
    maxHeight: '20rem',
    ...(above
      ? { bottom: window.innerHeight - rect.top + gap }
      : { top: rect.bottom + gap }),
  }
}

/** Narrow until description column height matches metadata column height. */
export function balanceCalendarCourseTooltipWidth(tooltipEl, anchorEl) {
  const metadata = tooltipEl.querySelector('[data-tooltip-metadata]')
  const description = tooltipEl.querySelector('[data-tooltip-description]')
  if (!metadata || !description) return null

  let lo = CALENDAR_TOOLTIP_MIN_WIDTH
  let hi = maxTooltipWidthForAnchor(anchorEl)
  let best = hi

  for (let i = 0; i < 10; i++) {
    const mid = Math.round((lo + hi) / 2)
    tooltipEl.style.width = `${mid}px`
    const metaH = metadata.getBoundingClientRect().height
    const descH = description.getBoundingClientRect().height

    if (descH < metaH) {
      hi = mid - 1
    } else {
      best = mid
      lo = mid + 1
    }
  }

  return Math.max(CALENDAR_TOOLTIP_MIN_WIDTH, Math.min(best, hi))
}

/** Keep a portaled tooltip inside the viewport after it has rendered. */
export function clampPortaledTooltipLeft(anchorEl, tooltipEl) {
  const anchorRect = anchorEl.getBoundingClientRect()
  const width = tooltipEl.offsetWidth
  return computePortaledTooltipLeft(anchorRect, width)
}
