import { useState } from 'react'
import PlanPanel from './PlanPanel'
import TagUnitTracker from './TagUnitTracker'
import WeeklyCalendar from './WeeklyCalendar'

/**
 * Desktop: calendar ↔ plan accordion with requirements between.
 * Mobile calendar tab: calendar + requirements only (`variant="calendar"`).
 */
export default function PlanningPanel({
  variant = 'desktop',
  selectedCourses,
  hasSelection,
  fallYear,
  springYear,
  tags,
  activePlanId,
  activePlanName,
  isDirty,
  onSavePlan,
  onRemoveCourse,
  onClearPlan,
}) {
  const [expandedPane, setExpandedPane] = useState('calendar')
  const calendarOnly = variant === 'calendar'

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
      <WeeklyCalendar
        selectedCourses={selectedCourses}
        hasSelection={hasSelection}
        fallYear={fallYear}
        springYear={springYear}
        collapsible={!calendarOnly}
        fillViewport={calendarOnly}
        expanded={calendarOnly ? true : expandedPane === 'calendar'}
        onToggle={() =>
          setExpandedPane((pane) => (pane === 'calendar' ? 'plan' : 'calendar'))
        }
      />
      <div className="shrink-0">
        <TagUnitTracker
          selectedCourses={selectedCourses}
          tags={tags}
          fallYear={fallYear}
          springYear={springYear}
        />
      </div>
      {!calendarOnly ? (
        <PlanPanel
          selectedCourses={selectedCourses}
          activePlanName={activePlanName}
          isDirty={isDirty}
          fallYear={fallYear}
          springYear={springYear}
          expanded={expandedPane === 'plan'}
          onToggle={() =>
            setExpandedPane((pane) => (pane === 'plan' ? 'calendar' : 'plan'))
          }
          onSavePlan={() => activePlanId && onSavePlan(activePlanId)}
          onRemoveCourse={onRemoveCourse}
          onClearPlan={onClearPlan}
        />
      ) : null}
    </div>
  )
}
