import PlanPanel from './PlanPanel'
import SavedPlansPanel from './SavedPlansPanel'
import SectionHeader from './SectionHeader'
import TagUnitTracker from './TagUnitTracker'
import WeeklyCalendar from './WeeklyCalendar'
import { sectionTone } from '../lib/sectionTheme'

/** Top stack: calendar → requirements → plans (breaker) → saved + current plan. */
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
      <div className={`flex flex-col ${sectionTone('plansBreaker').section}`}>
        <SectionHeader tone="plansBreaker" title="Plans" />
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
    </div>
  )
}
