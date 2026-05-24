export const TOOLTIP_Z_INDEX = 100
export const MOBILE_BOTTOM_NAV_ID = 'app-mobile-bottom-nav'
export const TOOLTIP_HIDE_DELAY_MS = 80
export const CALENDAR_TOOLTIP_MIN_WIDTH = 288
export const CALENDAR_TOOLTIP_MAX_WIDTH = 448
/** Description body height in the calendar hover popup (matches ~metadata column). */
export const CALENDAR_DESCRIPTION_LINE_COUNT = 13

const VIEWPORT_MARGIN = 16
const TOOLTIP_MAX_HEIGHT_PX = 320

/** Height of fixed mobile bottom nav (3rem row + safe area), or 0 on desktop. */
export function getViewportBottomInsetPx() {
  if (typeof window === 'undefined') return 0
  if (window.matchMedia('(min-width: 1024px)').matches) return 0
  const nav = document.getElementById(MOBILE_BOTTOM_NAV_ID)
  return nav?.getBoundingClientRect().height ?? 48
}

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
export function basePortaledTooltipStyle(
  anchorEl,
  { above = true, bottomInsetPx = getViewportBottomInsetPx() } = {},
) {
  const rect = anchorEl.getBoundingClientRect()
  const gap = 8
  const maxWidth = window.innerWidth - VIEWPORT_MARGIN * 2

  if (above) {
    const bottomFromAnchor = window.innerHeight - rect.top + gap
    const bottom = Math.max(bottomInsetPx + gap, bottomFromAnchor)
    const maxHeight = Math.min(
      TOOLTIP_MAX_HEIGHT_PX,
      window.innerHeight - bottom - VIEWPORT_MARGIN,
    )

    return {
      position: 'fixed',
      left: rect.left,
      width: 'max-content',
      maxWidth,
      zIndex: TOOLTIP_Z_INDEX,
      maxHeight: Math.max(96, maxHeight),
      bottom,
    }
  }

  const top = rect.bottom + gap
  const maxHeight = Math.min(
    TOOLTIP_MAX_HEIGHT_PX,
    window.innerHeight - bottomInsetPx - VIEWPORT_MARGIN - top,
  )

  return {
    position: 'fixed',
    left: rect.left,
    width: 'max-content',
    maxWidth,
    zIndex: TOOLTIP_Z_INDEX,
    maxHeight: Math.max(96, maxHeight),
    top,
  }
}

/** Calendar popup with description: fixed width, description scrolls at 15 lines. */
export function calendarCourseTooltipStyle(anchorEl, { above = true, hasDescription = false } = {}) {
  if (!hasDescription) {
    return basePortaledTooltipStyle(anchorEl, { above })
  }

  const rect = anchorEl.getBoundingClientRect()
  const gap = 8
  const width = maxTooltipWidthForAnchor(anchorEl)
  const bottomInsetPx = getViewportBottomInsetPx()

  if (above) {
    const bottomFromAnchor = window.innerHeight - rect.top + gap
    const bottom = Math.max(bottomInsetPx + gap, bottomFromAnchor)
    const maxHeight = Math.min(
      TOOLTIP_MAX_HEIGHT_PX,
      window.innerHeight - bottom - VIEWPORT_MARGIN,
    )

    return {
      position: 'fixed',
      left: computePortaledTooltipLeft(rect, width),
      width,
      maxWidth: CALENDAR_TOOLTIP_MAX_WIDTH,
      zIndex: TOOLTIP_Z_INDEX,
      maxHeight: Math.max(96, maxHeight),
      bottom,
    }
  }

  const top = rect.bottom + gap
  const maxHeight = Math.min(
    TOOLTIP_MAX_HEIGHT_PX,
    window.innerHeight - bottomInsetPx - VIEWPORT_MARGIN - top,
  )

  return {
    position: 'fixed',
    left: computePortaledTooltipLeft(rect, width),
    width,
    maxWidth: CALENDAR_TOOLTIP_MAX_WIDTH,
    zIndex: TOOLTIP_Z_INDEX,
    maxHeight: Math.max(96, maxHeight),
    top,
  }
}

/** Keep a portaled tooltip inside the viewport after it has rendered. */
export function clampPortaledTooltipLeft(anchorEl, tooltipEl) {
  const anchorRect = anchorEl.getBoundingClientRect()
  const width = tooltipEl.offsetWidth
  return computePortaledTooltipLeft(anchorRect, width)
}
