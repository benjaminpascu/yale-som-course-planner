/**
 * Compare Plans: two saved plans side by side in the Plan view. `slots` is
 * `[leftPlanId, rightPlanId]`; the open (active) plan is always one of them and
 * is the side being edited. The other side shows its plan's saved courses.
 */
import { termCodeToSemester } from './academicYear.js'
import { hasMeetingTime } from './parseCourses.js'
import { courseSemester } from './tagUnitTracker.js'

/** Compare Plans needs two saved plans. */
export function canComparePlans(plans) {
  return plans.length >= 2
}

/**
 * Starting pair: the open plan on the left, the plan listed under it on the
 * right (the one above if it's last). With no open plan, the first two plans.
 * @returns {[string, string] | null}
 */
export function initialCompareSlots(plans, activePlanId) {
  if (!canComparePlans(plans)) return null
  const index = plans.findIndex((p) => p.id === activePlanId)
  if (index === -1) return [plans[0].id, plans[1].id]
  const partner = plans[index + 1] ?? plans[index - 1]
  return [plans[index].id, partner.id]
}

/** Show `planId` on one side (0 = left, 1 = right); never the same plan twice. */
export function setSlotPlan(slots, side, planId) {
  if (slots[1 - side] === planId || slots[side] === planId) return slots
  const next = [...slots]
  next[side] = planId
  return next
}

/**
 * Keep the pair valid after plans change: a newly opened plan goes on the side
 * being edited (`editSide`), deleted plans are replaced, and both sides always
 * differ. Returns `slots` unchanged when nothing needs fixing, null when fewer
 * than two plans are left.
 */
export function normalizeCompareSlots(slots, plans, activePlanId, editSide = 0) {
  if (!canComparePlans(plans)) return null
  const ids = new Set(plans.map((p) => p.id))
  const next = slots.map((id) => (ids.has(id) ? id : null))
  if (activePlanId && ids.has(activePlanId) && !next.includes(activePlanId)) {
    next[editSide] = activePlanId
  }
  for (let side = 0; side < 2; side += 1) {
    if (next[side] && next[side] !== next[1 - side]) continue
    next[side] = plans.find((p) => !next.includes(p.id))?.id ?? null
  }
  if (next[0] === slots[0] && next[1] === slots[1]) return slots
  return next
}

/** A plan's saved courses, in catalog order (courses no longer offered are skipped). */
export function savedPlanCourses(plan, courses) {
  if (!plan) return []
  const ids = new Set(plan.courseIds)
  return courses.filter((c) => ids.has(c.courseId))
}

/**
 * Both plans' timed courses in the chosen semester, without repeats. Feeds the
 * one Fall 1 / Fall 2 switch shared by both calendars.
 */
export function sharedCalendarCourses(courseLists, termCode) {
  const semester = termCodeToSemester(termCode)
  const seen = new Set()
  const out = []
  for (const list of courseLists) {
    for (const course of list) {
      if (seen.has(course.courseId) || !hasMeetingTime(course)) continue
      if (semester && courseSemester(course) !== semester) continue
      seen.add(course.courseId)
      out.push(course)
    }
  }
  return out
}
