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

  test('the popup is the only thing that scrolls (no separate description height)', () => {
    const style = besidePlacement(row(370, 700, 120, 160), viewport, { hasDescription: true })
    expect(style['--tooltip-desc-max']).toBeUndefined()
  })

  test('a wide bidding table: no room beside the row → null, so it opens above/below at full width', () => {
    // 400 px free on the right, 396 on the left.
    const narrowRow = row(420, 1016, 200, 240)
    expect(besidePlacement(narrowRow, viewport, { minWidth: 450 })).toBeNull()
    expect(besidePlacement(narrowRow, viewport, { minWidth: 300 }).width).toBe(400)
  })

  test('a table wider than the usual 640 px widens the popup beyond it', () => {
    const style = besidePlacement(row(100, 500, 200, 240), viewport, { minWidth: 715 })
    expect(style.width).toBe(715)
  })

  test('Single plan (rows span the whole right side): opens over the empty right part of the row', () => {
    // Row 370–1420, course name ends at 800, remove × starts at 1380.
    const style = besidePlacement(row(370, 1420, 200, 240), viewport, { textRight: 800, contentRight: 1380 })
    expect(style.left).toBeGreaterThanOrEqual(800 + 8)
    expect(style.left + style.width).toBeLessThanOrEqual(1380 - 8)
    expect(style.width).toBeGreaterThan(500)
  })

  test('Compare plans: a wide neighbor column still wins over the row itself', () => {
    const left = besidePlacement(row(370, 895, 200, 240), viewport, { textRight: 800, contentRight: 860 })
    expect(left.left).toBe(895 + 8)
    const right = besidePlacement(row(905, 1420, 200, 240), viewport, { textRight: 1300, contentRight: 1380 })
    expect(right.left + right.width).toBe(905 - 8)
  })
})
