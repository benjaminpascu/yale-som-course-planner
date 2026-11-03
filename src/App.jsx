import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import CourseBrowser from './components/CourseBrowser'
import CompareView from './components/compare/CompareView'
import HintBubble, { HintBackdrop } from './components/HintBubble'
import { useCompareStore } from './components/compare/useCompareStore'
import MobileBottomNav from './components/MobileBottomNav'
import MobilePlansPanel from './components/MobilePlansPanel'
import NavBar from './components/NavBar'
import PlansMenu from './components/PlansMenu'
import PlanningPanel from './components/PlanningPanel'
import { CompareStepTabs, SubBar, TermSwitch } from './components/SubBar'
import { SAVE_BUTTON } from './lib/sectionTheme'
import {
  formatTermLabel,
  getCatalogTerms,
  getSemesterCalendarYears,
} from './lib/academicYear'
import { buildCourseGroups } from './lib/compareGroups'
import { decisionCounts, orderGroups } from './lib/compareShortlist'
import { ensureShuffledOrder, getTermData } from './lib/compareStorage'
import { loadAppData } from './lib/loadData'
import {
  COMPARE_INTRO,
  loadSeenHints,
  nextPlannerHint,
  persistSeenHints,
} from './lib/onboardingHints'
import {
  courseIdSetFromArray,
  deletePlanFromStore,
  getPlanById,
  loadPlanStore,
  persistPlanStore,
  sanitizeCourseIds,
  setActivePlanId,
  setsEqual,
  renamePlanInStore,
  savePlanCourses,
  upsertPlan,
} from './lib/planStorage'

function App() {
  const [courses, setCourses] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState(null)
  const [planStore, setPlanStore] = useState(() => loadPlanStore())
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [mobileTab, setMobileTab] = useState('calendar')
  const [view, setView] = useState('planner')
  const [compareStep, setCompareStep] = useState('shortlist')
  // One compare store for both layouts, so desktop and mobile never diverge.
  const compare = useCompareStore()
  const [catalogTermCode, setCatalogTermCode] = useState(null)
  const planHydratedRef = useRef(false)
  const [seenHints, setSeenHints] = useState(() => loadSeenHints())

  const markHintSeen = useCallback((id) => {
    setSeenHints((prev) => {
      if (prev.has(id)) return prev
      const next = new Set(prev)
      next.add(id)
      persistSeenHints(next)
      return next
    })
  }, [])

  const resetHints = useCallback(() => {
    const next = new Set()
    persistSeenHints(next)
    setSeenHints(next)
  }, [])

  const validCourseIds = useMemo(
    () => new Set(courses.map((c) => c.courseId)),
    [courses],
  )

  useEffect(() => {
    loadAppData()
      .then(({ courses: loadedCourses }) => {
        setCourses(loadedCourses)
        setStatus('ready')
      })
      .catch((err) => {
        setError(err.message)
        setStatus('error')
      })
  }, [])

  useEffect(() => {
    if (status !== 'ready' || courses.length === 0 || planHydratedRef.current) {
      return
    }
    planHydratedRef.current = true

    const active = planStore.activePlanId
      ? getPlanById(planStore, planStore.activePlanId)
      : null
    if (active) {
      const ids = sanitizeCourseIds(active.courseIds, validCourseIds)
      setSelectedIds(new Set(ids))
    }
  }, [status, courses.length, planStore, validCourseIds])

  const persist = useCallback((nextStore) => {
    setPlanStore(nextStore)
    persistPlanStore(nextStore)
  }, [])

  const activePlan = useMemo(
    () =>
      planStore.activePlanId
        ? getPlanById(planStore, planStore.activePlanId)
        : null,
    [planStore],
  )

  const savedCourseIds = useMemo(
    () => courseIdSetFromArray(activePlan?.courseIds ?? []),
    [activePlan],
  )

  const isDirty = useMemo(
    () => !setsEqual(selectedIds, savedCourseIds),
    [selectedIds, savedCourseIds],
  )

  const selectedCourses = useMemo(
    () => courses.filter((c) => selectedIds.has(c.courseId)),
    [courses, selectedIds],
  )

  const { fallYear, springYear } = useMemo(
    () => getSemesterCalendarYears(courses),
    [courses],
  )

  const catalogTerms = useMemo(() => getCatalogTerms(courses), [courses])

  /** Term shown in the course browser; defaults to the earliest term loaded. */
  const activeTermCode = catalogTerms.some((t) => t.id === catalogTermCode)
    ? catalogTermCode
    : (catalogTerms[0]?.id ?? null)

  const compareCatalog = useMemo(
    () => buildCourseGroups(courses.filter((c) => c.termCode === activeTermCode)),
    [courses, activeTermCode],
  )
  const compareTerm = getTermData(compare.store, activeTermCode)
  const compareGroups = useMemo(
    () => orderGroups(compareCatalog, compareTerm.order),
    [compareCatalog, compareTerm.order],
  )
  const compareOpen = view === 'compare' || mobileTab === 'compare'
  const { update: updateCompare } = compare

  // Shuffle the Shortlist once per term, the first time Compare is opened for it.
  useEffect(() => {
    if (!compareOpen || !activeTermCode || compareCatalog.length === 0) return
    updateCompare((s) =>
      ensureShuffledOrder(s, activeTermCode, compareCatalog.map((g) => g.key), Math.random),
    )
  }, [compareOpen, activeTermCode, compareCatalog, updateCompare])
  const compareCounts = decisionCounts(compareGroups, compareTerm.decisions)

  // One tip at a time; computer and phone layouts each get their own next tip.
  const hintState = {
    seen: seenHints,
    selectedCount: selectedIds.size,
    hasPlan: planStore.activePlanId != null,
  }
  const desktopHint = nextPlannerHint({ ...hintState, phone: false })
  const phoneHint = nextPlannerHint({ ...hintState, phone: true })
  // The tip actually on screen: each waits until the spot it points at is showing.
  const desktopTip = view === 'planner' ? desktopHint : null
  const phoneTip = (() => {
    if (phoneHint === 'phone-courses') return ['catalog', 'compare'].includes(mobileTab) ? null : phoneHint
    if (phoneHint === 'add-course' || phoneHint === 'clash') return mobileTab === 'catalog' ? phoneHint : null
    if (['calendar-details', 'requirements', 'set-targets'].includes(phoneHint)) {
      return mobileTab === 'calendar' ? phoneHint : null
    }
    if (phoneHint === 'save-plan') return ['plans', 'compare'].includes(mobileTab) ? null : phoneHint
    return null
  })()
  // Lifts the area a tip points at above the dark layer; no size or position change.
  const SPOTLIGHT = 'relative z-[45]'

  // Adding a course means the "add a course" tip did its job.
  const prevSelectedCountRef = useRef(selectedIds.size)
  useEffect(() => {
    if (selectedIds.size > prevSelectedCountRef.current) markHintSeen('add-course')
    prevSelectedCountRef.current = selectedIds.size
  }, [selectedIds, markHintSeen])

  // Phone tips that point at a tab go away once that tab is opened.
  useEffect(() => {
    if (mobileTab === 'catalog' && phoneHint === 'phone-courses') markHintSeen('phone-courses')
    if (mobileTab === 'plans' && phoneHint === 'save-plan') markHintSeen('save-plan')
  }, [mobileTab, phoneHint, markHintSeen])

  const toggleCourse = useCallback((courseId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(courseId)) next.delete(courseId)
      else next.add(courseId)
      return next
    })
  }, [])

  const removeCourse = useCallback((courseId) => {
    setSelectedIds((prev) => {
      if (!prev.has(courseId)) return prev
      const next = new Set(prev)
      next.delete(courseId)
      return next
    })
  }, [])

  const clearPlan = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const handleSelectPlan = useCallback(
    (planId) => {
      if (planId === planStore.activePlanId) return true

      if (
        isDirty &&
        !window.confirm(
          'Switch plans? Unsaved changes to the current plan will be lost.',
        )
      ) {
        return false
      }

      const plan = getPlanById(planStore, planId)
      if (!plan) return false

      const ids = sanitizeCourseIds(plan.courseIds, validCourseIds)
      setSelectedIds(new Set(ids))
      persist(setActivePlanId(planStore, planId))
      return true
    },
    [isDirty, persist, planStore, validCourseIds],
  )

  const handleAddPlan = useCallback(
    (name) => {
      const trimmed = name.trim()
      if (!trimmed) return

      if (
        isDirty &&
        planStore.activePlanId &&
        !window.confirm(
          'You have unsaved changes on the current plan. Add a new plan anyway? Your previous plan keeps its last saved courses.',
        )
      ) {
        return
      }

      const saveCurrentSelection =
        selectedIds.size > 0 && (!planStore.activePlanId || isDirty)

      const next = upsertPlan(planStore, {
        id: null,
        name: trimmed,
        courseIds: saveCurrentSelection ? [...selectedIds] : [],
      })
      persist(next)

      if (!saveCurrentSelection) {
        setSelectedIds(new Set())
      }
    },
    [isDirty, persist, planStore, selectedIds],
  )

  const handleSavePlan = useCallback(
    (planId) => {
      if (planId !== planStore.activePlanId) return
      const plan = getPlanById(planStore, planId)
      if (!plan) return

      const next = savePlanCourses(planStore, plan.id, [...selectedIds])
      persist(next)
    },
    [persist, planStore, selectedIds],
  )

  const handleRenamePlan = useCallback(
    (planId, name) => {
      const plan = getPlanById(planStore, planId)
      if (!plan) return
      const trimmed = name.trim()
      if (!trimmed || trimmed === plan.name) return

      const next = renamePlanInStore(planStore, planId, trimmed)
      persist(next)
    },
    [persist, planStore],
  )

  const handleDeletePlan = useCallback(
    (planId) => {
      const plan = getPlanById(planStore, planId)
      if (!plan) return

      const next = deletePlanFromStore(planStore, planId)
      persist(next)

      if (planStore.activePlanId === planId) {
        setSelectedIds(new Set())
      }
    },
    [persist, planStore],
  )

  if (status === 'loading') {
    return (
      <div className="px-4 py-6 text-gray-600">
        Loading course data…
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="px-4 py-6 text-red-700">
        <p className="font-semibold">Could not load data</p>
        <p className="mt-1 text-sm">{error}</p>
      </div>
    )
  }

  const planningPanelProps = {
    selectedCourses,
    hasSelection: selectedIds.size > 0,
    fallYear,
    springYear,
    courses,
    activePlanId: planStore.activePlanId,
    activePlanName: activePlan?.name ?? null,
    isDirty,
    onSavePlan: handleSavePlan,
    onRemoveCourse: removeCourse,
    onClearPlan: clearPlan,
  }

  const termSwitchProps = {
    terms: catalogTerms,
    termCode: activeTermCode,
    onTermChange: setCatalogTermCode,
  }

  const compareStepTabsProps = {
    step: compareStep,
    onStepChange: setCompareStep,
    leftCount: compareCounts.total - compareCounts.decided,
    shortlistCount: compareCounts.yes + compareCounts.maybe,
  }

  const plansPanelProps = {
    plans: planStore.plans,
    courses,
    activePlanId: planStore.activePlanId,
    activePlanName: activePlan?.name ?? null,
    hasSelection: selectedIds.size > 0,
    isDirty,
    selectedCourses,
    fallYear,
    springYear,
    onAddPlan: handleAddPlan,
    onSelectPlan: handleSelectPlan,
    onRenamePlan: handleRenamePlan,
    onSavePlan: handleSavePlan,
    onDeletePlan: handleDeletePlan,
    onRemoveCourse: removeCourse,
    onClearPlan: clearPlan,
  }

  return (
    <div className="flex min-h-dvh flex-col bg-gray-50 lg:h-dvh lg:overflow-hidden">
      <NavBar mode={view} onModeChange={setView} onShowTips={resetHints} />

      {/* Sub bar: plan (Planner) or steps (Compare) on the left, term switch on the right. */}
      <SubBar className="hidden lg:block">
        {view === 'planner' ? (
          // Wrapper only anchors the save tip beside the Plan button; it adds no space.
          <div className={desktopTip === 'save-plan' ? SPOTLIGHT : 'relative'}>
            <PlansMenu
              plans={planStore.plans}
              courses={courses}
              activePlanId={planStore.activePlanId}
              activePlanName={activePlan?.name ?? null}
              hasSelection={selectedIds.size > 0}
              isDirty={isDirty}
              onAddPlan={handleAddPlan}
              onSelectPlan={handleSelectPlan}
              onSavePlan={handleSavePlan}
              onRenamePlan={handleRenamePlan}
              onDeletePlan={handleDeletePlan}
            />
            {desktopTip === 'save-plan' ? (
              <HintBubble
                arrow="left"
                className="absolute top-1/2 left-full ml-4 -translate-y-1/2"
                onDismiss={() => markHintSeen('save-plan')}
              >
                Save this plan here
              </HintBubble>
            ) : null}
          </div>
        ) : (
          <CompareStepTabs {...compareStepTabsProps} />
        )}
        <TermSwitch {...termSwitchProps} />
      </SubBar>

      {/* Phones follow the bottom-nav tab; plans are managed in the Plans tab. */}
      <SubBar className="lg:hidden">
        {mobileTab === 'compare' ? (
          <CompareStepTabs {...compareStepTabsProps} />
        ) : (
          <div className="flex min-w-0 items-center gap-2">
            <p className="min-w-0 truncate text-sm text-[#1a1f2b]">
              <span className="font-semibold">{activePlan?.name ?? 'No plan selected'}</span>
              {isDirty ? <span className="font-medium text-amber-700"> · unsaved</span> : null}
            </p>
            {planStore.activePlanId && isDirty ? (
              <button
                type="button"
                onClick={() => handleSavePlan(planStore.activePlanId)}
                className={`h-9 shrink-0 rounded-md px-3 text-sm font-medium ${SAVE_BUTTON}`}
              >
                Save plan
              </button>
            ) : null}
          </div>
        )}
        <TermSwitch {...termSwitchProps} />
      </SubBar>

      <main
        className={`relative hidden min-h-0 w-full flex-1 grid-cols-1 bg-white lg:grid-cols-[22rem_minmax(0,1fr)] lg:overflow-hidden ${
          view === 'planner' ? 'lg:grid' : ''
        }`}
      >
        <aside
          className={`flex min-h-0 flex-col overflow-hidden border-r-2 border-yale-600 ${
            desktopTip === 'add-course' || desktopTip === 'clash' ? SPOTLIGHT : ''
          }`}
        >
          <CourseBrowser
            courses={courses}
            selectedIds={selectedIds}
            selectedCourses={selectedCourses}
            onToggleCourse={toggleCourse}
            fallYear={fallYear}
            springYear={springYear}
            termCode={activeTermCode}
          />
        </aside>
        <section className="flex min-h-0 flex-col overflow-hidden">
          <PlanningPanel
            {...planningPanelProps}
            tip={
              ['calendar-details', 'requirements', 'set-targets', 'your-plan'].includes(desktopTip)
                ? desktopTip
                : null
            }
            onDismissTip={() => markHintSeen(desktopTip)}
          />
        </section>
        {desktopTip === 'add-course' || desktopTip === 'clash' ? (
          <HintBubble
            arrow="left"
            className="absolute top-24 left-[23rem]"
            onDismiss={() => markHintSeen(desktopTip)}
          >
            {desktopTip === 'add-course' ? (
              <>
                Click a course, then <b>Add to plan</b>
              </>
            ) : (
              <>
                <b>Conflict</b> = clashes with your plan
              </>
            )}
          </HintBubble>
        ) : null}
      </main>

      <div
        className={`${mobileTab === 'compare' ? 'hidden' : 'flex'} min-h-0 flex-1 flex-col overflow-hidden bg-white pb-[calc(3rem+env(safe-area-inset-bottom))] lg:hidden ${
          phoneTip === 'add-course' || phoneTip === 'clash' ? SPOTLIGHT : ''
        }`}
      >
        {mobileTab === 'calendar' ? (
          <PlanningPanel
            {...planningPanelProps}
            variant="calendar"
            tip={phoneTip}
            onDismissTip={() => markHintSeen(phoneTip)}
          />
        ) : null}
        {mobileTab === 'catalog' ? (
          <CourseBrowser
            courses={courses}
            selectedIds={selectedIds}
            selectedCourses={selectedCourses}
            onToggleCourse={toggleCourse}
            fallYear={fallYear}
            springYear={springYear}
            termCode={activeTermCode}
            fullHeight
          />
        ) : null}
        {mobileTab === 'plans' ? <MobilePlansPanel {...plansPanelProps} /> : null}
      </div>

      {/* One Compare area for every screen size (so keyboard shortcuts never fire twice). */}
      <div
        className={`${mobileTab === 'compare' ? 'flex' : 'hidden'} ${
          view === 'compare' ? 'lg:flex' : 'lg:hidden'
        } relative min-h-0 flex-1 flex-col bg-[#f3f5f8] pb-[calc(3rem+env(safe-area-inset-bottom))] lg:overflow-y-auto lg:pb-0`}
      >
        <CompareView
          compare={compare}
          groups={compareGroups}
          term={compareTerm}
          counts={compareCounts}
          termCode={activeTermCode}
          termLabel={formatTermLabel(activeTermCode)}
          step={compareStep}
          onStepChange={setCompareStep}
          showIntro={!seenHints.has(COMPARE_INTRO)}
          onIntroDone={() => markHintSeen(COMPARE_INTRO)}
        />
      </div>

      {/* Phone tips float just above the bottom nav, pointing at the tab to tap. */}
      {desktopTip ? (
        <HintBackdrop className="hidden lg:block" onClick={() => markHintSeen(desktopTip)} />
      ) : null}
      {phoneTip ? <HintBackdrop className="lg:hidden" onClick={() => markHintSeen(phoneTip)} /> : null}
      {phoneTip === 'phone-courses' ? (
        <HintBubble
          arrow="down"
          arrowStyle={{ left: 'calc(2rem - 6px)' }}
          className="fixed bottom-[calc(3.75rem+env(safe-area-inset-bottom))] left-[calc(37.5vw-2rem)] lg:hidden"
          onDismiss={() => markHintSeen('phone-courses')}
        >
          Tap <b>Courses</b> to add courses
        </HintBubble>
      ) : null}
      {phoneTip === 'add-course' || phoneTip === 'clash' ? (
        <HintBubble
          className="fixed bottom-[calc(3.75rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 lg:hidden"
          onDismiss={() => markHintSeen(phoneTip)}
        >
          {phoneTip === 'add-course' ? (
            <>
              Tap a course, then <b>Add to plan</b>
            </>
          ) : (
            <>
              <b>Conflict</b> = clashes with your plan
            </>
          )}
        </HintBubble>
      ) : null}
      {phoneTip === 'save-plan' ? (
        <HintBubble
          arrow="down"
          arrowStyle={{ right: 'calc(2rem - 6px)' }}
          className="fixed right-[calc(37.5vw-2rem)] bottom-[calc(3.75rem+env(safe-area-inset-bottom))] lg:hidden"
          onDismiss={() => markHintSeen('save-plan')}
        >
          Tap <b>Plans</b> to save this plan
        </HintBubble>
      ) : null}

      <MobileBottomNav activeTab={mobileTab} onChange={setMobileTab} />
    </div>
  )
}

export default App
