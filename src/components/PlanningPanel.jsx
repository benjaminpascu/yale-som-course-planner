import PlanPanel from './PlanPanel'
import SavedPlansPanel from './SavedPlansPanel'
import TagUnitTracker from './TagUnitTracker'
import WeeklyCalendar from './WeeklyCalendar'

/** Top stack: calendar → requirements → saved plans → your plan (full width). */
export default function PlanningPanel({
  courses,
  selectedCourses,
  hasSelection,
  fallYear,
  springYear,
  tags,
  plans,
  activePlanId,
  activePlanName,
  isDirty,
  onAddPlan,
  onSelectPlan,
  onRenamePlan,
  onSavePlan,
  onDeletePlan,
  onRemoveCourse,
  onClearPlan,
}) {
  return (
    <div className="flex w-full flex-col">
      <WeeklyCalendar
        selectedCourses={selectedCourses}
        hasSelection={hasSelection}
        fallYear={fallYear}
        springYear={springYear}
      />
      <TagUnitTracker
        selectedCourses={selectedCourses}
        tags={tags}
        fallYear={fallYear}
        springYear={springYear}
      />
      <SavedPlansPanel
        plans={plans}
        courses={courses}
        activePlanId={activePlanId}
        hasSelection={hasSelection}
        isDirty={isDirty}
        onAddPlan={onAddPlan}
        onSelectPlan={onSelectPlan}
        onRenamePlan={onRenamePlan}
        onSavePlan={onSavePlan}
        onDeletePlan={onDeletePlan}
      />
      <PlanPanel
        selectedCourses={selectedCourses}
        activePlanName={activePlanName}
        isDirty={isDirty}
        fallYear={fallYear}
        springYear={springYear}
        onSavePlan={() => activePlanId && onSavePlan(activePlanId)}
        onRemoveCourse={onRemoveCourse}
        onClearPlan={onClearPlan}
      />
    </div>
  )
}
