import { describe, expect, test } from 'vitest'
import { LARGE_TOOLTIP_MAX_HEIGHT_PX, besidePlacement } from './portaledTooltip'

const viewport = { width: 1440, height: 900, bottomInset: 0 }
const row = (left, right, top, bottom) => ({ left, right, top, bottom })

describe('besidePlacement', () => {
  test('a row on the left opens its popup to the right of the row', () => {
    const style = besidePlacement(row(370, 700, 200, 240), viewport)
    expect(style.left).toBe(700 + 8)
  })

  test('a row on the right opens its popup to the left of the row', () => {
    const style = besidePlacement(row(1000, 1420, 200, 240), viewport)
    expect(style.left + style.width).toBe(1000 - 8)
  })

  test('no side with room for a popup: null, so the caller falls back to above/below', () => {
    expect(besidePlacement(row(100, 300, 200, 240), { ...viewport, width: 500 })).toBeNull()
  })

  test('a row near the bottom grows its popup upward and stays on screen', () => {
    const style = besidePlacement(row(370, 700, 820, 860), viewport)
    expect(style.top).toBeUndefined()
    expect(style.bottom).toBe(900 - 860)
    expect(style.maxHeight).toBeLessThanOrEqual(Math.min(LARGE_TOOLTIP_MAX_HEIGHT_PX, 860 - 16))
  })

  test('a row near the top hangs its popup down from the row', () => {
    const style = besidePlacement(row(370, 700, 120, 160), viewport)
    expect(style.top).toBe(120)
    expect(style.maxHeight).toBeLessThanOrEqual(900 - 16 - 120)
  })

  test('long descriptions scroll inside the popup', () => {
    const style = besidePlacement(row(370, 700, 120, 160), viewport, { hasDescription: true })
    expect(style['--tooltip-desc-max']).toMatch(/px$/)
  })
})
