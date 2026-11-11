import { useState } from 'react'
import { PLAN_BUTTON_EDITING, PLAN_BUTTON_OTHER, SAVE_BUTTON } from '../lib/sectionTheme'
import PlanPanel from './PlanPanel'
import TagUnitTracker from './TagUnitTracker'
import WeeklyCalendar from './WeeklyCalendar'

const CONTROLS = 'button, a, input, select, textarea, label, [role="button"]'

/**
 * Compare Plans: two saved plans side by side (computer only), laid out in rows
 * so both calendars line up and the Requirements bar spans both plans, as in the
 * normal view. The side being edited has a green "Plan:" button and takes
 * "Add to plan"; clicking the other side's empty space (or removing a course
 * there) makes it the one you edit.
 */
export default function ComparePlansView({
  plans,
  slots,
  editSide,
  sideCourses,
  isDirty,
  courses,
  termCode,
  fallYear,
  springYear,
  sessionView,
  onPickPlan,
  onActivateSide,
  onSavePlan,
  onRemoveCourse,
  onClearPlan,
}) {
  // One calendar ↔ "Your plan" toggle for both sides, so the rows stay aligned.
  const [expandedPane, setExpandedPane] = useState('calendar')
  const togglePane = () =>
    setExpandedPane((pane) => (pane === 'calendar' ? 'plan' : 'calendar'))

  const planName = (side) => plans.find((p) => p.id === slots[side])?.name ?? null

  // Each half of a row. Buttons on the other side work right away (open/close,
  // details); a click on its empty space makes it the side you edit.
  const cells = (render, className = '') =>
    slots.map((planId, side) => {
      const editing = side === editSide
      return (
        <div
          key={side}
          onClick={(e) => {
            if (editing || e.target.closest(CONTROLS)) return
            onActivateSide(side)
          }}
          className={`relative flex min-h-0 min-w-0 flex-col ${
            side === 1 ? 'border-l border-[#dde3ea]' : ''
          } ${editing ? '' : 'cursor-pointer'} ${className}`}
        >
          {render(side, editing)}
        </div>
      )
    })

  // Removing or clearing on the other side first switches to it, then does it.
  const removeOn = (side) => (courseId) => {
    if (side === editSide || onActivateSide(side)) onRemoveCourse(courseId)
  }
  const clearOn = (side) => () => {
    if (side === editSide || onActivateSide(side)) onClearPlan()
  }

  const calendarOpen = expandedPane === 'calendar'

  // "unsaved" + Plan menu (+ Save plan) at the right of each calendar header, so the
  // grey bar lines up with the course list's header as in the normal view.
  const planMenu = (side) => {
    const planId = slots[side]
    return (
      <div className="flex items-center gap-2">
        {side === editSide && isDirty ? (
          <span className="shrink-0 text-sm font-medium text-caution">unsaved</span>
        ) : null}
        {/* Looks like the "Plan:" button; an invisible menu on top keeps the ▾ right after the name. */}
        <label
          className={`relative flex h-9 min-w-0 items-center gap-1.5 rounded-md border px-3 text-sm focus-within:ring-2 focus-within:ring-yale-300 ${
            side === editSide ? PLAN_BUTTON_EDITING : PLAN_BUTTON_OTHER
          }`}
        >
          <span className="font-semibold">Plan:</span>
          <span className="max-w-[12rem] truncate">{planName(side)}</span>
          <span aria-hidden>▾</span>
          <select
            value={planId}
            onChange={(e) => onPickPlan(side, e.target.value)}
            aria-label="Plan"
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          >
            {plans.map((p) => (
              <option key={p.id} value={p.id} disabled={p.id === slots[1 - side]}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        {side === editSide && isDirty ? (
          <>
            <button
              type="button"
              onClick={() => onSavePlan(planId)}
              className={`h-9 shrink-0 rounded-md px-3 text-sm font-medium ${SAVE_BUTTON}`}
            >
              Save Plan
            </button>
          </>
        ) : null}
      </div>
    )
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
      <div className={`grid grid-cols-2 ${calendarOpen ? 'min-h-0 flex-1' : 'shrink-0'}`}>
        {cells((side) => (
          <WeeklyCalendar
            selectedCourses={sideCourses[side]}
            termCode={termCode}
            fallYear={fallYear}
            springYear={springYear}
            sessionView={sessionView}
            expanded={calendarOpen}
            onToggle={togglePane}
            headerAction={planMenu(side)}
            onRemoveCourse={removeOn(side)}
            className="flex-1"
          />
        ))}
      </div>

      {/* One Requirements bar (title + Select Requirements) for both plans; choices are shared. */}
      <TagUnitTracker part="header" selectedCourses={[]} termCode={termCode} courses={courses} />
      <div className="grid shrink-0 grid-cols-2">
        {cells((side) => (
          <TagUnitTracker
            part="rows"
            selectedCourses={sideCourses[side]}
            termCode={termCode}
            courses={courses}
            fallYear={fallYear}
            springYear={springYear}
          />
        ))}
      </div>

      {/* One "Your plan" bar for both plans (like Requirements); each plan's list opens below it. */}
      <PlanPanel
        part="header"
        selectedCourses={[]}
        activePlanName={null}
        expanded={!calendarOpen}
        onToggle={togglePane}
      />
      {calendarOpen ? null : (
        <div className="grid min-h-0 flex-1 grid-cols-2">
          {cells((side, editing) => (
            <PlanPanel
              part="body"
              className="flex-1"
              selectedCourses={sideCourses[side]}
              activePlanName={planName(side)}
              isDirty={editing && isDirty}
              fallYear={fallYear}
              springYear={springYear}
              expanded
              onToggle={togglePane}
              onSavePlan={() => onSavePlan(slots[side])}
              onRemoveCourse={removeOn(side)}
              onClearPlan={clearOn(side)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
