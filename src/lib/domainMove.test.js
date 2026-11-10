import { describe, expect, it, vi } from 'vitest'
import {
  NEW_ORIGIN,
  OLD_HOST,
  buildMoveUrl,
  collectMovableData,
  handleDomainMove,
  mergeMovedData,
  readMovePayload,
} from './domainMove.js'

const PLANS = 'yale-som-course-planner-plans'
const HINTS = 'yale-som-course-planner-hints'
const REQS = 'yale-som-course-planner-requirements'
const TARGETS = 'yale-som-course-planner-requirement-targets'
const COMPARE = 'yale-som-course-planner-compare'

function fakeStorage(entries = {}) {
  const map = new Map(Object.entries(entries))
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    dump: () => Object.fromEntries(map),
  }
}

const planStore = (activePlanId, plans) => JSON.stringify({ version: 1, activePlanId, plans })
const plan = (id, name, courseIds = []) => ({ id, name, courseIds, createdAt: 't', updatedAt: 't' })

function moveHash(data) {
  return new URL(buildMoveUrl({ pathname: '/', search: '' }, data)).hash
}

describe('collectMovableData', () => {
  it('takes the saved data and skips backups, empties and other sites', () => {
    const storage = fakeStorage({
      [PLANS]: planStore('a', [plan('a', 'Plan A')]),
      [HINTS]: '["welcome"]',
      [REQS]: '',
      [`${COMPARE}-backup-123`]: '{"old":true}',
      somethingElse: 'x',
    })
    const data = collectMovableData(storage)
    expect(Object.keys(data).sort()).toEqual([HINTS, PLANS])
  })
})

describe('buildMoveUrl', () => {
  it('keeps the path and ?rank, and adds no data when there is none', () => {
    expect(buildMoveUrl({ pathname: '/', search: '?rank' }, {})).toBe(`${NEW_ORIGIN}/?rank`)
  })

  it('round-trips data, including accents and emoji in plan names', () => {
    const data = { [PLANS]: planStore('a', [plan('a', 'Plan Zoë 🎓', ['1'])]) }
    const url = new URL(buildMoveUrl({ pathname: '/', search: '?rank' }, data))
    expect(url.origin).toBe(NEW_ORIGIN)
    expect(url.search).toBe('?rank')
    expect(readMovePayload(url.hash)).toEqual(data)
  })
})

describe('readMovePayload', () => {
  it('ignores other hashes and broken data without throwing', () => {
    expect(readMovePayload('')).toBeNull()
    expect(readMovePayload('#something')).toBeNull()
    expect(readMovePayload('#move=%%%')).toBeNull()
    expect(readMovePayload('#move=a')).toBeNull()
    expect(readMovePayload(`#move=${btoa('{"v":2,"data":{}}')}`)).toBeNull()
  })
})

describe('mergeMovedData', () => {
  it('copies everything into a fresh browser', () => {
    const data = {
      [PLANS]: planStore('a', [plan('a', 'Plan A', ['1'])]),
      [HINTS]: '["welcome"]',
      [REQS]: '{"x":1}',
      [TARGETS]: '{"STEM":4}',
      [COMPARE]: '{"version":1}',
    }
    const storage = fakeStorage()
    expect(mergeMovedData(storage, data)).toBe(true)
    for (const [key, value] of Object.entries(data)) expect(storage.getItem(key)).toBe(value)
  })

  it('adds old plans next to plans already made on the new address', () => {
    const storage = fakeStorage({
      [PLANS]: planStore('n', [plan('n', 'Plan A', ['9']), plan('same', 'Shared')]),
    })
    mergeMovedData(storage, {
      [PLANS]: planStore('a', [plan('a', 'Plan A', ['1']), plan('same', 'Shared'), plan('b', 'Plan B')]),
    })
    const merged = JSON.parse(storage.getItem(PLANS))
    expect(merged.activePlanId).toBe('n')
    expect(merged.plans.map((p) => [p.id, p.name])).toEqual([
      ['n', 'Plan A'],
      ['same', 'Shared'],
      ['a', 'Plan A (2)'],
      ['b', 'Plan B'],
    ])
    expect(merged.plans[2].courseIds).toEqual(['1'])
  })

  it('opens the moved active plan when the new address has none open', () => {
    const storage = fakeStorage({ [PLANS]: planStore(null, []) })
    mergeMovedData(storage, { [PLANS]: planStore('a', [plan('a', 'Plan A')]) })
    expect(JSON.parse(storage.getItem(PLANS)).activePlanId).toBe('a')
  })

  it('keeps settings already on the new address and combines seen tips', () => {
    const storage = fakeStorage({ [REQS]: '{"new":1}', [HINTS]: '["a","b"]' })
    mergeMovedData(storage, { [REQS]: '{"old":1}', [HINTS]: '["b","c"]', [TARGETS]: '{"STEM":4}' })
    expect(storage.getItem(REQS)).toBe('{"new":1}')
    expect(JSON.parse(storage.getItem(HINTS)).sort()).toEqual(['a', 'b', 'c'])
    expect(storage.getItem(TARGETS)).toBe('{"STEM":4}')
  })

  it('moves in only once, so deleted plans do not come back', () => {
    const storage = fakeStorage()
    const data = { [PLANS]: planStore('a', [plan('a', 'Plan A')]) }
    mergeMovedData(storage, data)
    storage.setItem(PLANS, planStore(null, []))
    expect(mergeMovedData(storage, data)).toBe(false)
    expect(JSON.parse(storage.getItem(PLANS)).plans).toEqual([])
  })

  it('skips unreadable values and unknown keys', () => {
    const storage = fakeStorage()
    mergeMovedData(storage, { [REQS]: '{broken', evil: 'x', [HINTS]: 5 })
    expect(storage.dump()).toEqual({ 'yale-som-course-planner-moved-in': '1' })
  })
})

describe('handleDomainMove', () => {
  function fakeWindow({ hostname, search = '', hash = '', storage = fakeStorage() }) {
    return {
      location: { hostname, pathname: '/', search, hash, replace: vi.fn() },
      history: { replaceState: vi.fn() },
      localStorage: storage,
    }
  }

  it('on the old address, forwards to the new one with the saved data', () => {
    const storage = fakeStorage({ [PLANS]: planStore('a', [plan('a', 'Plan A')]) })
    const win = fakeWindow({ hostname: OLD_HOST, search: '?rank', storage })
    expect(handleDomainMove(win)).toBe(true)
    const target = new URL(win.location.replace.mock.calls[0][0])
    expect(target.origin + target.pathname + target.search).toBe(`${NEW_ORIGIN}/?rank`)
    expect(readMovePayload(target.hash)).toEqual({ [PLANS]: storage.getItem(PLANS) })
  })

  it('still forwards when the old browser blocks saved data', () => {
    const win = fakeWindow({ hostname: OLD_HOST })
    Object.defineProperty(win, 'localStorage', {
      get() {
        throw new Error('blocked')
      },
    })
    expect(handleDomainMove(win)).toBe(true)
    expect(win.location.replace).toHaveBeenCalledWith(`${NEW_ORIGIN}/`)
  })

  it('on the new address, takes the data in and clears it from the address bar', () => {
    const data = { [PLANS]: planStore('a', [plan('a', 'Plan A')]) }
    const win = fakeWindow({ hostname: 'somtimes.vercel.app', search: '?rank', hash: moveHash(data) })
    expect(handleDomainMove(win)).toBe(false)
    expect(win.history.replaceState).toHaveBeenCalledWith(null, '', '/?rank')
    expect(win.localStorage.getItem(PLANS)).toBe(data[PLANS])
  })

  it('does nothing on a normal visit', () => {
    const win = fakeWindow({ hostname: 'somtimes.vercel.app' })
    expect(handleDomainMove(win)).toBe(false)
    expect(win.history.replaceState).not.toHaveBeenCalled()
    expect(win.location.replace).not.toHaveBeenCalled()
  })
})
