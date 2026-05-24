import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import CourseBrowser from './components/CourseBrowser'
import MobileBottomNav from './components/MobileBottomNav'
import MobilePlansPanel from './components/MobilePlansPanel'
import PlansMenu from './components/PlansMenu'
import PlanningPanel from './components/PlanningPanel'
import { SAVE_BUTTON } from './lib/sectionTheme'
import { getSemesterCalendarYears } from './lib/academicYear'
import { loadAppData } from './lib/loadData'
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

const YALE_COURSE_LIST_URL = 'https://som.yale.edu/elective-core-courses'

function App() {
  const [courses, setCourses] = useState([])
  const [tags, setTags] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState(null)
  const [planStore, setPlanStore] = useState(() => loadPlanStore())
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [mobileTab, setMobileTab] = useState('calendar')
  const planHydratedRef = useRef(false)

  const validCourseIds = useMemo(
    () => new Set(courses.map((c) => c.courseId)),
    [courses],
  )

  useEffect(() => {
    loadAppData()
      .then(({ courses: loadedCourses, tags: loadedTags }) => {
        setCourses(loadedCourses)
        setTags(loadedTags)
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
    tags,
    activePlanId: planStore.activePlanId,
    activePlanName: activePlan?.name ?? null,
    isDirty,
    onSavePlan: handleSavePlan,
    onRemoveCourse: removeCourse,
    onClearPlan: clearPlan,
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
      <header className="shrink-0 border-b border-yale-950 bg-yale-900 px-4 py-3 text-white sm:py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold">
              Yale SOM Course Planner
            </h1>
            <p className="mt-1 text-sm text-yale-100">
              {fallYear != null && springYear != null ? (
                <>
                  Academic Year {fallYear}-{String(springYear).slice(-2)}
                  <span aria-hidden className="px-1.5">
                    ·
                  </span>
                </>
              ) : null}
              {courses.length} courses loaded
            </p>
            <p className="mt-0.5 text-xs text-yale-200">
              Source:{' '}
              <a
                href={YALE_COURSE_LIST_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-white underline decoration-yale-200/80 underline-offset-2 hover:decoration-white"
              >
                Yale SOM Course List
              </a>
            </p>
            <p className="mt-2 text-xs text-yale-100 lg:hidden">
              <span className="font-medium text-white">
                {activePlan?.name ?? 'No plan selected'}
              </span>
              {isDirty ? (
                <span className="font-medium text-amber-300"> · unsaved</span>
              ) : null}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            {planStore.activePlanId && isDirty ? (
              <button
                type="button"
                onClick={() => handleSavePlan(planStore.activePlanId)}
                className={`rounded-md px-3 py-2 text-sm font-medium lg:hidden ${SAVE_BUTTON}`}
              >
                Save plan
              </button>
            ) : null}
            <div className="hidden lg:block">
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
            </div>
          </div>
        </div>
      </header>

      <main className="hidden min-h-0 w-full flex-1 grid-cols-1 bg-white lg:grid lg:grid-cols-[22rem_minmax(0,1fr)] lg:overflow-hidden">
        <aside className="flex min-h-0 flex-col overflow-hidden border-r-2 border-yale-600">
          <CourseBrowser
            courses={courses}
            tags={tags}
            selectedIds={selectedIds}
            selectedCourses={selectedCourses}
            onToggleCourse={toggleCourse}
            fallYear={fallYear}
            springYear={springYear}
          />
        </aside>
        <section className="flex min-h-0 flex-col overflow-hidden">
          <PlanningPanel {...planningPanelProps} />
        </section>
      </main>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white pb-[calc(3rem+env(safe-area-inset-bottom))] lg:hidden">
        {mobileTab === 'calendar' ? (
          <PlanningPanel {...planningPanelProps} variant="calendar" />
        ) : null}
        {mobileTab === 'catalog' ? (
          <CourseBrowser
            courses={courses}
            tags={tags}
            selectedIds={selectedIds}
            selectedCourses={selectedCourses}
            onToggleCourse={toggleCourse}
            fallYear={fallYear}
            springYear={springYear}
            fullHeight
          />
        ) : null}
        {mobileTab === 'plans' ? <MobilePlansPanel {...plansPanelProps} /> : null}
      </div>

      <MobileBottomNav activeTab={mobileTab} onChange={setMobileTab} />
    </div>
  )
}

export default App
