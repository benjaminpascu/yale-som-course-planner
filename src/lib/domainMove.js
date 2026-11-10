/**
 * Moving from the old address to the new one (Nov 2026).
 *
 * Browsers keep saved data per address, so a plain redirect would strand
 * everyone's plans on the old address. Instead, the old address reads the
 * saved data and forwards to the new address with it in the #fragment (never
 * sent to any server); the new address merges it in before the app starts.
 * Each browser moves in once, so plans deleted afterwards don't come back.
 */
import { COMPARE_STORAGE_KEY } from './compareStorage.js'
import { HINTS_STORAGE_KEY } from './onboardingHints.js'
import { PLAN_STORAGE_KEY, nextCopyName } from './planStorage.js'
import { REQUIREMENT_SETTINGS_KEY } from './requirementSettings.js'
import { REQUIREMENT_TARGETS_KEY } from './requirementTargets.js'

export const OLD_HOST = 'yale-som-course-planner.vercel.app'
export const NEW_ORIGIN = 'https://somtimes.vercel.app'

const HASH_PREFIX = '#move='
const PAYLOAD_VERSION = 1
const MOVED_IN_KEY = 'yale-som-course-planner-moved-in'
const MOVABLE_KEYS = [
  PLAN_STORAGE_KEY,
  REQUIREMENT_SETTINGS_KEY,
  REQUIREMENT_TARGETS_KEY,
  COMPARE_STORAGE_KEY,
  HINTS_STORAGE_KEY,
]

function toBase64Url(text) {
  let binary = ''
  for (const byte of new TextEncoder().encode(text)) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(text) {
  const base64 = text.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64 + '==='.slice((base64.length + 3) % 4))
  return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)))
}

function parseJson(text) {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

/** The saved data worth moving: { storageKey: savedText }. */
export function collectMovableData(storage) {
  const data = {}
  for (const key of MOVABLE_KEYS) {
    const value = storage.getItem(key)
    if (value) data[key] = value
  }
  return data
}

/** New-address URL with the same path and query (e.g. ?rank), carrying the data. */
export function buildMoveUrl(location, data) {
  const base = `${NEW_ORIGIN}${location.pathname}${location.search}`
  if (Object.keys(data).length === 0) return base
  return base + HASH_PREFIX + toBase64Url(JSON.stringify({ v: PAYLOAD_VERSION, data }))
}

/** The moved data from a #move= fragment, or null if there is none or it can't be read. */
export function readMovePayload(hash) {
  if (!hash.startsWith(HASH_PREFIX)) return null
  try {
    const payload = JSON.parse(fromBase64Url(hash.slice(HASH_PREFIX.length)))
    if (payload?.v !== PAYLOAD_VERSION || !payload.data || typeof payload.data !== 'object') {
      return null
    }
    return payload.data
  } catch {
    return null
  }
}

/** Plans already on the new address stay; moved plans are added (a clashing name becomes "Name (2)"). */
function mergePlans(currentText, incoming) {
  if (!Array.isArray(incoming?.plans)) return null
  const current = parseJson(currentText ?? '')
  if (!Array.isArray(current?.plans)) return incoming

  const plans = [...current.plans]
  const ids = new Set(plans.map((p) => p?.id))
  for (const p of incoming.plans) {
    if (!p || typeof p.id !== 'string' || typeof p.name !== 'string' || ids.has(p.id)) continue
    const name = plans.some((q) => q?.name === p.name.trim()) ? nextCopyName(plans, p.name) : p.name
    plans.push({ ...p, name })
    ids.add(p.id)
  }
  return { ...current, activePlanId: current.activePlanId ?? incoming.activePlanId ?? null, plans }
}

/**
 * Merge moved data into this browser's saved data. Settings already here are
 * kept; seen tips are combined. Returns false if this browser already moved in.
 */
export function mergeMovedData(storage, data) {
  if (storage.getItem(MOVED_IN_KEY)) return false

  for (const key of MOVABLE_KEYS) {
    const text = data[key]
    if (typeof text !== 'string') continue
    const incoming = parseJson(text)
    if (incoming === undefined) continue

    if (key === PLAN_STORAGE_KEY) {
      const merged = mergePlans(storage.getItem(key), incoming)
      if (merged) storage.setItem(key, JSON.stringify(merged))
    } else if (key === HINTS_STORAGE_KEY) {
      const current = parseJson(storage.getItem(key) ?? '[]')
      const seen = [...(Array.isArray(current) ? current : []), ...(Array.isArray(incoming) ? incoming : [])]
      storage.setItem(key, JSON.stringify([...new Set(seen)]))
    } else if (storage.getItem(key) === null) {
      storage.setItem(key, text)
    }
  }

  storage.setItem(MOVED_IN_KEY, '1')
  return true
}

/**
 * Run before the app starts. On the old address, forwards to the new one and
 * returns true (don't start the app). On the new address, takes in moved data.
 */
export function handleDomainMove(win = window) {
  const { location } = win
  if (location.hostname === OLD_HOST) {
    let data = {}
    try {
      data = collectMovableData(win.localStorage)
    } catch {
      // Saved data blocked: still send them to the new address.
    }
    location.replace(buildMoveUrl(location, data))
    return true
  }

  if (location.hash.startsWith(HASH_PREFIX)) {
    const data = readMovePayload(location.hash)
    win.history.replaceState(null, '', `${location.pathname}${location.search}`)
    try {
      if (data) mergeMovedData(win.localStorage, data)
    } catch {
      // Saved data blocked or full: the app still starts.
    }
  }
  return false
}
