const STORAGE_KEY = 'yale-som-course-planner-plans'
const STORE_VERSION = 1

export function createEmptyPlanStore() {
  return { version: STORE_VERSION, activePlanId: null, plans: [] }
}

function normalizeStore(raw) {
  if (!raw || typeof raw !== 'object') return createEmptyPlanStore()
  const plans = Array.isArray(raw.plans)
    ? raw.plans
        .filter((p) => p && typeof p.id === 'string' && typeof p.name === 'string')
        .map((p) => ({
          id: p.id,
          name: p.name.trim(),
          courseIds: Array.isArray(p.courseIds)
            ? p.courseIds.filter((id) => typeof id === 'string' && id.trim())
            : [],
          createdAt: p.createdAt ?? new Date().toISOString(),
          updatedAt: p.updatedAt ?? p.createdAt ?? new Date().toISOString(),
        }))
        .filter((p) => p.name.length > 0)
    : []

  const activePlanId =
    typeof raw.activePlanId === 'string' &&
    plans.some((p) => p.id === raw.activePlanId)
      ? raw.activePlanId
      : null

  return { version: STORE_VERSION, activePlanId, plans }
}

export function loadPlanStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createEmptyPlanStore()
    return normalizeStore(JSON.parse(raw))
  } catch {
    return createEmptyPlanStore()
  }
}

export function persistPlanStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export function newPlanId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `plan-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function sanitizeCourseIds(courseIds, validCourseIds) {
  const valid = validCourseIds instanceof Set ? validCourseIds : new Set(validCourseIds)
  return [...new Set(courseIds)].filter((id) => valid.has(id))
}

export function courseIdSetFromArray(courseIds) {
  return new Set(courseIds)
}

export function setsEqual(a, b) {
  if (a.size !== b.size) return false
  for (const id of a) {
    if (!b.has(id)) return false
  }
  return true
}

export function getPlanById(store, planId) {
  return store.plans.find((p) => p.id === planId) ?? null
}

export function upsertPlan(store, { id, name, courseIds }) {
  const trimmedName = name.trim()
  if (!trimmedName) {
    throw new Error('Plan name cannot be empty.')
  }

  const now = new Date().toISOString()
  const existing = id ? getPlanById(store, id) : null

  if (existing) {
    const plans = store.plans.map((p) =>
      p.id === id
        ? {
            ...p,
            name: trimmedName,
            courseIds: [...courseIds],
            updatedAt: now,
          }
        : p,
    )
    return {
      ...store,
      activePlanId: store.activePlanId,
      plans,
    }
  }

  const newId = newPlanId()
  const plan = {
    id: newId,
    name: trimmedName,
    courseIds: [...courseIds],
    createdAt: now,
    updatedAt: now,
  }
  return {
    ...store,
    activePlanId: newId,
    plans: [...store.plans, plan],
  }
}

/** Update only the plan name; does not change courses or which plan is active. */
export function renamePlanInStore(store, planId, name) {
  const trimmedName = name.trim()
  if (!trimmedName) {
    throw new Error('Plan name cannot be empty.')
  }
  const existing = getPlanById(store, planId)
  if (!existing) {
    throw new Error('Plan not found.')
  }
  if (trimmedName === existing.name) {
    return store
  }

  const now = new Date().toISOString()
  const plans = store.plans.map((p) =>
    p.id === planId ? { ...p, name: trimmedName, updatedAt: now } : p,
  )
  return { ...store, plans }
}

/** Persist course list for a plan without changing the active plan. */
export function savePlanCourses(store, planId, courseIds) {
  const existing = getPlanById(store, planId)
  if (!existing) {
    throw new Error('Plan not found.')
  }

  const now = new Date().toISOString()
  const plans = store.plans.map((p) =>
    p.id === planId
      ? { ...p, courseIds: [...courseIds], updatedAt: now }
      : p,
  )
  return { ...store, plans }
}

export function duplicatePlanInStore(store, sourcePlanId, newName) {
  const source = getPlanById(store, sourcePlanId)
  if (!source) {
    throw new Error('Plan not found.')
  }
  return upsertPlan(store, {
    id: null,
    name: newName,
    courseIds: [...source.courseIds],
  })
}

export function deletePlanFromStore(store, planId) {
  const plans = store.plans.filter((p) => p.id !== planId)
  const activePlanId =
    store.activePlanId === planId ? null : store.activePlanId
  return { ...store, plans, activePlanId }
}

export function setActivePlanId(store, planId) {
  if (planId !== null && !getPlanById(store, planId)) {
    return store
  }
  return { ...store, activePlanId: planId }
}
