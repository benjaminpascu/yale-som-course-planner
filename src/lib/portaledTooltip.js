export const TOOLTIP_Z_INDEX = 100
export const MOBILE_BOTTOM_NAV_ID = 'app-mobile-bottom-nav'
export const TOOLTIP_HIDE_DELAY_MS = 80
export const CALENDAR_TOOLTIP_MIN_WIDTH = 288
export const CALENDAR_TOOLTIP_MAX_WIDTH = 448
/** Description body height in the calendar hover popup (matches ~metadata column). */
export const CALENDAR_DESCRIPTION_LINE_COUNT = 13
/** Course hover popup (Weekly Calendar + Your Plan): wide and tall, so most descriptions fit without scrolling. */
export const LARGE_TOOLTIP_MAX_WIDTH = 640
export const LARGE_TOOLTIP_MAX_HEIGHT_PX = 560
export const LARGE_DESCRIPTION_LINE_COUNT = 22

const VIEWPORT_MARGIN = 16
const TOOLTIP_MAX_HEIGHT_PX = 320
/** Popup padding + course title + "Description" label, around the scrolling description. */
const DESCRIPTION_CHROME_PX = 84

/** Height of fixed mobile bottom nav (3rem row + safe area), or 0 on desktop. */
export function getViewportBottomInsetPx() {
  if (typeof window === 'undefined') return 0
  if (window.matchMedia('(min-width: 1024px)').matches) return 0
  const nav = document.getElementById(MOBILE_BOTTOM_NAV_ID)
  return nav?.getBoundingClientRect().height ?? 48
}

/** Max tooltip width that fits for this anchor (left- or right-aligned). */
export function maxTooltipWidthForAnchor(anchorEl, maxWidth = CALENDAR_TOOLTIP_MAX_WIDTH) {
  const rect = anchorEl.getBoundingClientRect()
  const viewportMax = window.innerWidth - VIEWPORT_MARGIN * 2
  const fromLeftAlign = window.innerWidth - VIEWPORT_MARGIN - rect.left
  const fromRightAlign = rect.right - VIEWPORT_MARGIN
  return Math.max(
    CALENDAR_TOOLTIP_MIN_WIDTH,
    Math.min(maxWidth, viewportMax, Math.max(fromLeftAlign, fromRightAlign)),
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

/**
 * Calendar popup with description: fixed width, description scrolls past a set number
 * of lines. `large` (Your Plan) is wider and taller.
 */
export function calendarCourseTooltipStyle(
  anchorEl,
  { above: preferAbove = true, hasDescription = false, large = false } = {},
) {
  if (!hasDescription) {
    return basePortaledTooltipStyle(anchorEl, { above: preferAbove })
  }

  const rect = anchorEl.getBoundingClientRect()
  const gap = 8
  const widthCap = large ? LARGE_TOOLTIP_MAX_WIDTH : CALENDAR_TOOLTIP_MAX_WIDTH
  const heightCap = large ? LARGE_TOOLTIP_MAX_HEIGHT_PX : TOOLTIP_MAX_HEIGHT_PX
  const width = maxTooltipWidthForAnchor(anchorEl, widthCap)
  const bottomInsetPx = getViewportBottomInsetPx()

  const roomAbove = rect.top - gap - VIEWPORT_MARGIN
  const roomBelow = window.innerHeight - bottomInsetPx - VIEWPORT_MARGIN - rect.bottom - gap
  // The big popup opens on whichever side has more room.
  const above = large ? roomAbove > roomBelow : preferAbove
  const maxHeight = Math.max(96, Math.min(heightCap, above ? roomAbove : roomBelow))

  const style = {
    position: 'fixed',
    left: computePortaledTooltipLeft(rect, width),
    width,
    maxWidth: widthCap,
    zIndex: TOOLTIP_Z_INDEX,
    maxHeight,
    // Only the description scrolls: it gets the popup's height minus title and padding.
    '--tooltip-desc-max': `${Math.max(64, maxHeight - DESCRIPTION_CHROME_PX)}px`,
  }
  if (above) {
    style.bottom = Math.max(bottomInsetPx + gap, window.innerHeight - rect.top + gap)
  } else {
    style.top = rect.bottom + gap
  }
  return style
}

/** Keep a portaled tooltip inside the viewport after it has rendered. */
export function clampPortaledTooltipLeft(anchorEl, tooltipEl) {
  const anchorRect = anchorEl.getBoundingClientRect()
  const width = tooltipEl.offsetWidth
  return computePortaledTooltipLeft(anchorRect, width)
}

/**
 * Your Plan popup beside its row (on the side with more room), so it never
 * covers the rows above or below and the mouse can move straight to the next
 * course. Null when neither side fits; callers then fall back to above/below.
 *
 * @param {{ left: number, right: number, top: number, bottom: number }} rowRect
 * @param {{ width: number, height: number, bottomInset: number }} viewport
 */
export function besidePlacement(rowRect, viewport, { hasDescription = false } = {}) {
  const gap = 8
  const roomRight = viewport.width - VIEWPORT_MARGIN - rowRect.right - gap
  const roomLeft = rowRect.left - VIEWPORT_MARGIN - gap
  const onRight = roomRight >= roomLeft
  const room = onRight ? roomRight : roomLeft
  if (room < CALENDAR_TOOLTIP_MIN_WIDTH) return null

  const width = Math.min(LARGE_TOOLTIP_MAX_WIDTH, room)
  const roomDown = viewport.height - viewport.bottomInset - VIEWPORT_MARGIN - rowRect.top
  const roomUp = rowRect.bottom - VIEWPORT_MARGIN
  // Hang down from the row's top; near the bottom of the screen, grow up from its bottom.
  const down = roomDown >= Math.min(LARGE_TOOLTIP_MAX_HEIGHT_PX, roomUp)
  const maxHeight = Math.max(96, Math.min(LARGE_TOOLTIP_MAX_HEIGHT_PX, down ? roomDown : roomUp))

  const style = {
    position: 'fixed',
    left: onRight ? rowRect.right + gap : rowRect.left - gap - width,
    width,
    zIndex: TOOLTIP_Z_INDEX,
    maxHeight,
  }
  if (hasDescription) {
    style['--tooltip-desc-max'] = `${Math.max(64, maxHeight - DESCRIPTION_CHROME_PX)}px`
  }
  if (down) style.top = rowRect.top
  else style.bottom = viewport.height - rowRect.bottom
  return style
}
