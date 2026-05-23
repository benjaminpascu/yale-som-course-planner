import PlanPanel from './PlanPanel'
import TagUnitTracker from './TagUnitTracker'
import WeeklyCalendar from './WeeklyCalendar'

/** Top stack: calendar → requirements → your plan (full width). */
export default function PlanningPanel({
  selectedCourses,
  hasSelection,
  tags,
  plans,
  activePlanId,
  activePlanName,
  isDirty,
  onNewPlan,
  onSelectPlan,
  onSavePlan,
  onRenamePlan,
  onDeletePlan,
  onRemoveCourse,
  onClearPlan,
}) {
  return (
    <div className="flex w-full flex-col">
      <WeeklyCalendar
        selectedCourses={selectedCourses}
        hasSelection={hasSelection}
        onRemoveCourse={onRemoveCourse}
      />
      <TagUnitTracker selectedCourses={selectedCourses} tags={tags} />
      <PlanPanel
        selectedCourses={selectedCourses}
        plans={plans}
        activePlanId={activePlanId}
        activePlanName={activePlanName}
        isDirty={isDirty}
        onNewPlan={onNewPlan}
        onSelectPlan={onSelectPlan}
        onSavePlan={onSavePlan}
        onRenamePlan={onRenamePlan}
        onDeletePlan={onDeletePlan}
        onRemoveCourse={onRemoveCourse}
        onClearPlan={onClearPlan}
      />
    </div>
  )
}
