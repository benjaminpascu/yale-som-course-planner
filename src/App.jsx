import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import CourseBrowser from './components/CourseBrowser'
import CompareView from './components/compare/CompareView'
import ComparePlansView from './components/ComparePlansView'
import ComputerNotice, { shouldShowComputerNotice } from './components/ComputerNotice'
import HintBubble, { HintBackdrop } from './components/HintBubble'
import { useCompareStore } from './components/compare/useCompareStore'
import MobileBottomNav from './components/MobileBottomNav'
import MobilePlansPanel from './components/MobilePlansPanel'
import NavBar from './components/NavBar'
import PlansMenu from './components/PlansMenu'
import PlanningPanel from './components/PlanningPanel'
import { CalendarSessionTabs, SessionTabHint } from './components/WeeklyCalendar'
import { CompareStepTabs, PlanViewSwitch, SubBar, TermSwitch } from './components/SubBar'
import { SAVE_BUTTON } from './lib/sectionTheme'
import {
  formatTermLabel,
  getCatalogTerms,
  getAcademicYears,
  termCodeToSemester,
} from './lib/academicYear'
import { courseSemester } from './lib/tagUnitTracker'
import { getCalendarViewOptions, getDefaultCalendarView } from './lib/calendarSessionView'
import { buildCourseGroups } from './lib/compareGroups'
import {
  canComparePlans,
  initialCompareSlots,
  normalizeCompareSlots,
  savedPlanCourses,
  setSlotPlan,
  sharedCalendarCourses,
} from './lib/comparePlans'
import { decisionCounts, orderGroups } from './lib/compareShortlist'
import { ensureShuffledOrder, getTermData } from './lib/compareStorage'
import { loadAppData } from './lib/loadData'
import { getConflictingCourseIds } from './lib/scheduleConflicts'
import {
  loadSeenHints,
  nextPlannerHint,
  nextCompareHint,
  persistSeenHints,
} from './lib/onboardingHints'
import {
  courseIdSetFromArray,
  deletePlanFromStore,
  duplicatePlanInStore,
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
import { importPlansIntoStore } from './lib/planTransfer'

// Rank is hidden for launch; only links ending in ?rank show it (the owner's private link).
const RANK_UNLOCKED =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('rank')

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
  const [computerNoticeOpen, setComputerNoticeOpen] = useState(() => shouldShowComputerNotice())
  // Compare Plans (computer only): two plans side by side; [left, right] plan ids.
  const [comparePlansOn, setComparePlansOn] = useState(false)
  const [compareSlots, setCompareSlots] = useState([])
  const [compareEditSide, setCompareEditSide] = useState(0)
  // Fall 1 / Fall 2 (or Spring 1 / 2) shown on the computer calendar(s); switch in the sub bar.
  const [sessionViewChoice, setSessionViewChoice] = useState('')

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

  const catalogTerms = useMemo(() => getCatalogTerms(courses), [courses])

  /** Term shown in the course browser; defaults to the earliest term still running. */
  const activeTermCode = catalogTerms.some((t) => t.id === catalogTermCode)
    ? catalogTermCode
    : (catalogTerms[0]?.id ?? null)

  const { fallYear, springYear } = getAcademicYears(activeTermCode)

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

  // Compare Plans: the open plan is always one side (the one being edited);
  // the other side shows its plan's saved courses.
  const planSlots = comparePlansOn
    ? normalizeCompareSlots(compareSlots, planStore.plans, planStore.activePlanId, compareEditSide)
    : null
  const editSide = planSlots
    ? Math.max(0, planSlots.indexOf(planStore.activePlanId))
    : 0
  const sideCourses = planSlots
    ? planSlots.map((id, side) =>
        side === editSide ? selectedCourses : savedPlanCourses(getPlanById(planStore, id), courses),
      )
    : null
  // One Fall 1 / Fall 2 switch in the sub bar (computer), offering every half-term
  // the plan (or either compared plan) uses this semester.
  const sessionCourses = sharedCalendarCourses(sideCourses ?? [selectedCourses], activeTermCode)
  const sessionOptions = getCalendarViewOptions(sessionCourses, fallYear, springYear)
  const sessionView = sessionOptions.some((o) => o.id === sessionViewChoice)
    ? sessionViewChoice
    : getDefaultCalendarView(sessionCourses)

  // One tip at a time; computer and phone layouts each get their own next tip.
  // The Conflict tip waits until a "Conflict" label is actually showing in this term's list.
  const conflictIds = getConflictingCourseIds(courses, selectedIds)
  const hintState = {
    seen: seenHints,
    selectedCount: selectedIds.size,
    // Same semester filter as the calendar, so tips wait while it's empty.
    shownCount: selectedCourses.filter(
      (c) => courseSemester(c) === termCodeToSemester(activeTermCode),
    ).length,
    hasPlan: planStore.activePlanId != null,
    hasConflict: courses.some(
      (c) => c.termCode === activeTermCode && conflictIds.has(c.courseId) && !selectedIds.has(c.courseId),
    ),
  }
  const desktopHint = nextPlannerHint({ ...hintState, phone: false })
  const phoneHint = nextPlannerHint({ ...hintState, phone: true })
  // The tip actually on screen: each waits until the spot it points at is showing.
  const desktopTip = view === 'planner' && !planSlots ? desktopHint : null
  const phoneTip = (() => {
    if (computerNoticeOpen) return null // Phone tips wait until the "Best on a computer" note is closed.
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

  // Compare tip (shared by the Compare area and the step tabs in the sub bar).
  const compareTip = nextCompareHint({
    seen: seenHints,
    step: compareStep,
    hasCard: compareCounts.decided < compareCounts.total,
    decided: compareCounts.decided,
    canUndo: compareTerm.history.length > 0,
    shortlistCount: compareCounts.yes + compareCounts.maybe,
  })

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

  // Copy a plan's saved courses into "<name> (2)" right under it and open the copy.
  // Returns the copy's id, or null if the student kept their unsaved changes.
  const handleDuplicatePlan = useCallback(
    (planId) => {
      if (
        isDirty &&
        !window.confirm(
          'Switch plans? Unsaved changes to the current plan will be lost.',
        )
      ) {
        return null
      }
      const { store: next, planId: copyId } = duplicatePlanInStore(planStore, planId)
      const copy = getPlanById(next, copyId)
      setSelectedIds(new Set(sanitizeCourseIds(copy.courseIds, validCourseIds)))
      persist(next)
      return copyId
    },
    [isDirty, persist, planStore, validCourseIds],
  )

  // Plans from an exported file: 'add' next to the current ones, or 'replace' them all
  // (then the first imported plan opens). Returns the courses that were left out.
  const handleImportPlans = useCallback(
    (imported, mode) => {
      const { store: next, missing } = importPlansIntoStore(planStore, imported, {
        mode,
        validCourseIds,
      })
      persist(next)
      if (mode === 'replace') {
        setSelectedIds(new Set(getPlanById(next, next.activePlanId).courseIds))
      }
      return missing
    },
    [persist, planStore, validCourseIds],
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

  const startComparePlans = () => {
    const slots = initialCompareSlots(planStore.plans, planStore.activePlanId)
    if (!slots) return
    if (!planStore.activePlanId && !handleSelectPlan(slots[0])) return
    setCompareSlots(slots)
    setCompareEditSide(0)
    setComparePlansOn(true)
  }

  // Clicking the faded side makes it the plan you edit (same warning as switching plans).
  const activateCompareSide = (side) => {
    if (!planSlots) return false
    if (side === editSide) return true
    if (!handleSelectPlan(planSlots[side])) return false
    setCompareEditSide(side)
    return true
  }

  const pickComparePlan = (side, planId) => {
    if (!planSlots) return
    if (side === editSide && !handleSelectPlan(planId)) return
    setCompareSlots(setSlotPlan(planSlots, side, planId))
  }

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
    termCode: activeTermCode,
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
    onTermChange: (termCode) => {
      markHintSeen('term-switch') // Using the switch is what that tip asks for.
      setCatalogTermCode(termCode)
    },
  }

  const compareStepTabsProps = {
    step: compareStep,
    onStepChange: setCompareStep,
    leftCount: compareCounts.total - compareCounts.decided,
    shortlistCount: compareCounts.yes + compareCounts.maybe,
    tip: compareTip,
    onDismissTip: () => markHintSeen(compareTip),
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
    onDuplicatePlan: handleDuplicatePlan,
    onSavePlan: handleSavePlan,
    onDeletePlan: handleDeletePlan,
    onRemoveCourse: removeCourse,
    onClearPlan: clearPlan,
  }

  return (
    <div className="flex min-h-dvh flex-col bg-gray-50 lg:h-dvh lg:overflow-hidden">
      <NavBar mode={view} onModeChange={setView} onShowTips={resetHints} showRank={RANK_UNLOCKED} />

      {/* Sub bar: Single plan / Compare plans (Plan) or steps (Rank) on the left; half-term and term switches on the right. */}
      <SubBar className="hidden lg:block">
        {view === 'planner' ? (
          // Wrapper only anchors the Compare Plans tip below the switch; it adds no space.
          <div className={desktopTip === 'compare-plans' ? SPOTLIGHT : 'relative'}>
            <PlanViewSwitch
              comparing={Boolean(planSlots)}
              canCompare={canComparePlans(planStore.plans)}
              onChange={(compare) => {
                if (!compare) setComparePlansOn(false)
                else if (!planSlots) {
                  markHintSeen('compare-plans')
                  startComparePlans()
                }
              }}
            />
            {desktopTip === 'compare-plans' ? (
              <HintBubble
                arrow="up"
                className="absolute top-full left-0 mt-3"
                onDismiss={() => markHintSeen('compare-plans')}
              >
                Click <b>Compare Plans</b> to see 2 saved plans side by side, e.g. a plan and a
                duplicate of it with one course swapped
              </HintBubble>
            ) : null}
          </div>
        ) : (
          <CompareStepTabs {...compareStepTabsProps} />
        )}
        <div
          className={`flex items-center gap-4 ${desktopTip === 'term-switch' ? SPOTLIGHT : 'relative'}`}
        >
          {desktopTip === 'term-switch' ? (
            <HintBubble
              arrow="up"
              arrowStyle={{ left: 'auto', right: '2.5rem' }}
              className="absolute top-full right-0 mt-3"
              onDismiss={() => markHintSeen('term-switch')}
            >
              Switch between <b>Fall</b> and <b>Spring</b> here. When your plan has half-term
              courses, you can also switch between <b>Fall 1</b> and <b>Fall 2</b>
            </HintBubble>
          ) : null}
          {view === 'planner' && sessionOptions.length > 1 ? (
            <div className="flex items-center gap-1.5">
              <SessionTabHint />
              <CalendarSessionTabs
                options={sessionOptions}
                value={sessionView}
                onChange={(id) => {
                  markHintSeen('term-switch')
                  setSessionViewChoice(id)
                }}
              />
            </div>
          ) : null}
          <TermSwitch {...termSwitchProps} />
        </div>
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
                Save Plan
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
          {planSlots ? (
            <ComparePlansView
              plans={planStore.plans}
              slots={planSlots}
              editSide={editSide}
              sideCourses={sideCourses}
              isDirty={isDirty}
              courses={courses}
              termCode={activeTermCode}
              fallYear={fallYear}
              springYear={springYear}
              sessionView={sessionView}
              onPickPlan={pickComparePlan}
              onActivateSide={activateCompareSide}
              onSavePlan={handleSavePlan}
              onRemoveCourse={removeCourse}
              onClearPlan={clearPlan}
            />
          ) : (
            <PlanningPanel
              {...planningPanelProps}
              sessionView={sessionView}
              headerAction={
                // Same spot as the plan menus in Compare plans: right of the Weekly calendar bar.
                // The wrapper only anchors the save tip below the menu; it adds no space.
                <div className={desktopTip === 'plans-menu' ? SPOTLIGHT : 'relative'}>
                  <PlansMenu
                    align="right"
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
                    onDuplicatePlan={handleDuplicatePlan}
                    onDeletePlan={handleDeletePlan}
                    onImportPlans={handleImportPlans}
                  />
                  {desktopTip === 'plans-menu' ? (
                    <HintBubble
                      arrow="up"
                      arrowStyle={{ left: 'auto', right: '2.5rem' }}
                      className="absolute top-full right-0 mt-3"
                      onDismiss={() => markHintSeen('plans-menu')}
                    >
                      Click here to manage your plans: save, rename, duplicate or switch
                      between them. Plans are kept in this browser, so use <b>Export</b> and{' '}
                      <b>Import</b> to move them to another computer
                    </HintBubble>
                  ) : null}
                </div>
              }
              tip={
                ['calendar-details', 'requirements', 'set-targets', 'your-plan'].includes(desktopTip)
                  ? desktopTip
                  : null
              }
              onDismissTip={() => markHintSeen(desktopTip)}
            />
          )}
        </section>
        {desktopTip === 'add-course' || desktopTip === 'clash' ? (
          <HintBubble
            arrow="left"
            className="absolute top-24 left-[23rem]"
            onDismiss={() => markHintSeen(desktopTip)}
          >
            {desktopTip === 'add-course' ? (
              <>
                Click a course to see its details, then <b>Add to Plan</b> to put it in your plan
              </>
            ) : (
              <>
                <b>Conflict</b> means the course overlaps in time with a course already in your plan
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
      {RANK_UNLOCKED ? (
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
            seenHints={seenHints}
            onHintSeen={markHintSeen}
            tip={compareTip}
          />
        </div>
      ) : null}

      {/* Phone tips float just above the bottom nav, pointing at the tab to tap. */}
      {desktopTip ? (
        <HintBackdrop className="hidden lg:block" onClick={() => markHintSeen(desktopTip)} />
      ) : null}
      {phoneTip ? <HintBackdrop className="lg:hidden" onClick={() => markHintSeen(phoneTip)} /> : null}
      {phoneTip === 'phone-courses' ? (
        <HintBubble
          arrow="down"
          // With Rank hidden, Courses is the middle of 3 tabs, so the tip centers over it.
          arrowStyle={{ left: RANK_UNLOCKED ? 'calc(2rem - 6px)' : 'calc(50% - 6px)' }}
          className={`fixed bottom-[calc(3.75rem+env(safe-area-inset-bottom))] ${RANK_UNLOCKED ? 'left-[calc(37.5vw-2rem)]' : 'left-1/2 -translate-x-1/2'} lg:hidden`}
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
              Tap a course to see its details, then <b>Add to Plan</b> to put it in your plan
            </>
          ) : (
            <>
              <b>Conflict</b> means the course overlaps in time with a course already in your plan
            </>
          )}
        </HintBubble>
      ) : null}
      {phoneTip === 'save-plan' ? (
        <HintBubble
          arrow="down"
          arrowStyle={{ right: 'calc(2rem - 6px)' }}
          className={`fixed ${RANK_UNLOCKED ? 'right-[calc(37.5vw-2rem)]' : 'right-[calc(16.667vw-2rem)]'} bottom-[calc(3.75rem+env(safe-area-inset-bottom))] lg:hidden`}
          onDismiss={() => markHintSeen('save-plan')}
        >
          Tap <b>Plans</b> to save this plan
        </HintBubble>
      ) : null}

      <MobileBottomNav activeTab={mobileTab} onChange={setMobileTab} showRank={RANK_UNLOCKED} />

      {computerNoticeOpen ? <ComputerNotice onContinue={() => setComputerNoticeOpen(false)} /> : null}
    </div>
  )
}

export default App
