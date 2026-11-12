import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import {
  APP_VERSION,
  UPDATES,
  UPDATES_SEEN_KEY,
  formatUpdateDate,
  isUpdatesPath,
  hasUnseenUpdate,
  markUpdatesSeen,
} from './updates'

function memoryStorage(initial = {}) {
  const data = { ...initial }
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = String(v)
    },
    data,
  }
}

const toParts = (v) => v.split('.').map(Number)
function isNewer(a, b) {
  const [pa, pb] = [toParts(a), toParts(b)]
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) > (pb[i] ?? 0)
  }
  return false
}

describe('UPDATES list', () => {
  test('newest first, no repeated versions', () => {
    for (let i = 1; i < UPDATES.length; i++) {
      expect(isNewer(UPDATES[i - 1].version, UPDATES[i].version)).toBe(true)
    }
  })

  test('every update after launch has a date and at least one change', () => {
    for (const u of UPDATES.filter((u) => u.version !== '1.0.0')) {
      expect(u.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(u.changes.length).toBeGreaterThan(0)
    }
  })

  test('package.json version matches the newest update', () => {
    const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'))
    expect(pkg.version).toBe(APP_VERSION)
  })
})

describe('isUpdatesPath', () => {
  test('matches /updates, with or without a trailing slash', () => {
    expect(isUpdatesPath('/updates')).toBe(true)
    expect(isUpdatesPath('/updates/')).toBe(true)
    expect(isUpdatesPath('/')).toBe(false)
    expect(isUpdatesPath('/updates-old')).toBe(false)
  })
})

describe('formatUpdateDate', () => {
  test('shows a short US date', () => {
    expect(formatUpdateDate('2026-11-11')).toBe('Nov 11, 2026')
  })
})

describe('new-update dot', () => {
  test('shows until Updates is opened, then hides', () => {
    const storage = memoryStorage()
    expect(hasUnseenUpdate(storage)).toBe(true)
    markUpdatesSeen(storage)
    expect(storage.data[UPDATES_SEEN_KEY]).toBe(APP_VERSION)
    expect(hasUnseenUpdate(storage)).toBe(false)
  })

  test('comes back when a newer update ships', () => {
    expect(hasUnseenUpdate(memoryStorage({ [UPDATES_SEEN_KEY]: '0.9.0' }))).toBe(true)
  })

  test('blocked storage: no dot, no crash', () => {
    const blocked = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    }
    expect(hasUnseenUpdate(blocked)).toBe(false)
    expect(() => markUpdatesSeen(blocked)).not.toThrow()
  })
})
