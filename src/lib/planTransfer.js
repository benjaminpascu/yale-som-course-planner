/**
 * Export saved plans to a JSON file and import them back (e.g. on another computer).
 * The file keeps each course's ID plus a readable label, so a course that is no
 * longer in the catalog can still be named when it's left out on import.
 */
import { newPlanId, nextCopyName } from './planStorage.js'

const APP_ID = 'yale-som-course-planner'
const FILE_VERSION = 1

function courseLabel(course) {
  const number = [course.courseNumber, course.section].filter(Boolean).join('-')
  return [number, course.title].filter(Boolean).join(' ')
}

/** File contents for the given saved plans. */
export function buildPlanExport(plans, coursesById, now = new Date()) {
  return {
    app: APP_ID,
    version: FILE_VERSION,
    exportedAt: now.toISOString(),
    plans: plans.map((plan) => ({
      name: plan.name,
      courses: plan.courseIds.map((courseId) => {
        const course = coursesById.get(courseId)
        return { courseId, label: course ? courseLabel(course) : courseId }
      }),
    })),
  }
}

export function planExportFileName(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  return `som-course-plans-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.json`
}

/** Download the saved plans as a JSON file. */
export function downloadPlanExport(plans, coursesById) {
  const json = JSON.stringify(buildPlanExport(plans, coursesById), null, 2)
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = planExportFileName()
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

const NOT_A_PLAN_FILE = "This file isn't a plans file from this site."

/**
 * Read an exported file. Returns [{ name, courses: [{ courseId, label }] }];
 * throws an Error with a message for the student if the file can't be used.
 */
export function parsePlanImport(text) {
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error(NOT_A_PLAN_FILE)
  }
  if (!data || data.app !== APP_ID || !Array.isArray(data.plans)) {
    throw new Error(NOT_A_PLAN_FILE)
  }

  const plans = data.plans
    .filter((p) => p && typeof p.name === 'string' && p.name.trim())
    .map((p) => ({
      name: p.name.trim(),
      courses: (Array.isArray(p.courses) ? p.courses : [])
        .filter((c) => c && typeof c.courseId === 'string' && c.courseId.trim())
        .map((c) => ({
          courseId: c.courseId.trim(),
          label: typeof c.label === 'string' && c.label.trim() ? c.label.trim() : c.courseId.trim(),
        })),
    }))

  if (plans.length === 0) throw new Error('This file has no plans in it.')
  return plans
}

/**
 * Put imported plans into the store. 'add' keeps current plans (a clashing name
 * becomes "Name (2)") and the open plan; 'replace' swaps them all out and opens the
 * first imported plan. Courses not in the catalog are left out and returned in
 * `missing` (each label once).
 */
export function importPlansIntoStore(store, imported, { mode, validCourseIds }) {
  const now = new Date().toISOString()
  const plans = mode === 'replace' ? [] : [...store.plans]
  const missing = new Set()

  for (const item of imported) {
    const courseIds = []
    for (const { courseId, label } of item.courses) {
      if (!validCourseIds.has(courseId)) missing.add(label)
      else if (!courseIds.includes(courseId)) courseIds.push(courseId)
    }
    const taken = plans.some((p) => p.name === item.name)
    plans.push({
      id: newPlanId(),
      name: taken ? nextCopyName(plans, item.name) : item.name,
      courseIds,
      createdAt: now,
      updatedAt: now,
    })
  }

  const activePlanId = mode === 'replace' ? plans[0].id : store.activePlanId
  return {
    store: { ...store, activePlanId, plans },
    missing: [...missing],
    count: imported.length,
  }
}
