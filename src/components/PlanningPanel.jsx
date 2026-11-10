import { useEffect, useState } from 'react'
import HintBubble from './HintBubble'
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
  termCode,
  hasSelection,
  fallYear,
  springYear,
  courses = [],
  activePlanId,
  activePlanName,
  isDirty,
  onSavePlan,
  onRemoveCourse,
  onClearPlan,
  tip = null,
  onDismissTip,
  sessionView,
  headerAction = null,
}) {
  const [expandedPane, setExpandedPane] = useState('calendar')
  const calendarOnly = variant === 'calendar'

  // Opening "Your plan" is what that tip asks for.
  useEffect(() => {
    if (tip === 'your-plan' && expandedPane === 'plan') onDismissTip?.()
  }, [tip, expandedPane, onDismissTip])

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden">
      <WeeklyCalendar
        className={tip === 'calendar-details' ? 'relative z-[45]' : ''}
        selectedCourses={selectedCourses}
        termCode={termCode}
        fallYear={fallYear}
        springYear={springYear}
        sessionView={sessionView}
        headerAction={headerAction}
        collapsible={!calendarOnly}
        fillViewport={calendarOnly}
        expanded={calendarOnly ? true : expandedPane === 'calendar'}
        onToggle={() =>
          setExpandedPane((pane) => (pane === 'calendar' ? 'plan' : 'calendar'))
        }
      />
      {/* Tips float over the page; the area they point at is lifted above the dimmed layer. */}
      <div
        className={`shrink-0 ${tip === 'requirements' || tip === 'set-targets' ? 'relative z-[45]' : ''}`}
      >
        {tip === 'requirements' ? (
          <HintBubble arrow="down" className="absolute bottom-full left-6 mb-3" onDismiss={onDismissTip}>
            {calendarOnly ? 'Tap' : 'Hover over'} a requirement to see which courses count toward it
          </HintBubble>
        ) : null}
        {tip === 'set-targets' ? (
          <HintBubble
            arrow="down"
            arrowStyle={{ right: '2.5rem' }}
            className="absolute right-4 bottom-full mb-3"
            onDismiss={onDismissTip}
          >
            <b>Requirements</b> tracks the units your courses earn toward your credit requirements.{' '}
            {calendarOnly ? 'Tap' : 'Click'} <b>Set Targets</b> to define how many units you need
          </HintBubble>
        ) : null}
        <TagUnitTracker
          selectedCourses={selectedCourses}
          termCode={termCode}
          courses={courses}
          fallYear={fallYear}
          springYear={springYear}
        />
      </div>
      {!calendarOnly ? (
        <PlanPanel
          showHeaderSummary={false}
          className={tip === 'your-plan' ? 'relative z-[45]' : ''}
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
      {tip === 'calendar-details' ? (
        <HintBubble className="absolute top-28 right-6" onDismiss={onDismissTip}>
          The <b>Weekly Calendar</b> is a timetable of the courses you&apos;ve added.{' '}
          {calendarOnly ? 'Tap' : 'Hover over'} a course for its details
        </HintBubble>
      ) : null}
      {tip === 'your-plan' ? (
        <HintBubble arrow="down" className="absolute bottom-12 left-6" onDismiss={onDismissTip}>
          <b>Your Plan</b> is an overview of all courses in the plan you have open. Click to see it
        </HintBubble>
      ) : null}
    </div>
  )
}
