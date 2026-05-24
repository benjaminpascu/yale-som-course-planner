import PlanPanel from './PlanPanel'
import SavedPlansPanel from './SavedPlansPanel'
import SectionHeader from './SectionHeader'
import { PlanDisclaimer } from './Disclaimer'
import { sectionTone } from '../lib/sectionTheme'

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
  const catalogTone = sectionTone('catalog')

  return (
    <div
      className={`flex h-full min-h-0 flex-col overflow-y-auto ${catalogTone.section}`}
    >
      <SectionHeader
        tone="catalog"
        title="Plans"
        subtitle="Select a plan to show on the calendar"
      />
      <SavedPlansPanel
        variant="flat"
        compact
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
        compact
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
      <PlanDisclaimer className="shrink-0 border-t border-yale-200 px-4 py-2 text-[10px] leading-snug text-gray-500" />
    </div>
  )
}
