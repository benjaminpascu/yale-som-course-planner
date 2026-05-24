import PlanPanel from './PlanPanel'
import SavedPlansPanel from './SavedPlansPanel'

/** Mobile Plans tab: saved plans management + working course list. */
export default function MobilePlansPanel({
  plans,
  courses,
  activePlanId,
  activePlanName,
  hasSelection,
  isDirty,
  selectedCourses,
  fallYear,
  springYear,
  onAddPlan,
  onSelectPlan,
  onRenamePlan,
  onSavePlan,
  onDeletePlan,
  onRemoveCourse,
  onClearPlan,
}) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <SavedPlansPanel
        variant="flat"
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
        collapsible={false}
        expanded
        planEmptyHint="Name a plan above, then add courses from the Courses tab."
        catalogSelectHint="the Courses tab"
        onSavePlan={() => activePlanId && onSavePlan(activePlanId)}
        onRemoveCourse={onRemoveCourse}
        onClearPlan={onClearPlan}
      />
    </div>
  )
}
