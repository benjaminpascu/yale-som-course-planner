import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import CourseBrowser from './components/CourseBrowser'
import PlanningPanel from './components/PlanningPanel'
import { getAcademicYearLabel } from './lib/academicYear'
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

  const academicYear = useMemo(() => getAcademicYearLabel(courses), [courses])

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

  const handleNewPlan = useCallback(() => {
    if (isDirty) {
      const ok = window.confirm(
        'Start a new plan? Unsaved changes to the current plan will stay there when you open it again from the list.',
      )
      if (!ok) return
    }
    persist(setActivePlanId(planStore, null))
    setSelectedIds(new Set())
  }, [isDirty, persist, planStore])

  const handleSelectPlan = useCallback(
    (planId) => {
      if (planId === planStore.activePlanId) return

      if (
        isDirty &&
        !window.confirm(
          'Switch plans? Unsaved changes to the current plan will be lost.',
        )
      ) {
        return
      }

      const plan = getPlanById(planStore, planId)
      if (!plan) return

      const ids = sanitizeCourseIds(plan.courseIds, validCourseIds)
      setSelectedIds(new Set(ids))
      persist(setActivePlanId(planStore, planId))
    },
    [isDirty, persist, planStore, validCourseIds],
  )

  const handleSavePlan = useCallback(() => {
    if (!planStore.activePlanId) {
      const name = window.prompt('Name this plan:', 'My plan')
      if (name === null) return
      const trimmed = name.trim()
      if (!trimmed) return

      const next = upsertPlan(planStore, {
        id: null,
        name: trimmed,
        courseIds: [...selectedIds],
      })
      persist(next)
      return
    }

    const plan = getPlanById(planStore, planStore.activePlanId)
    if (!plan) return

    const next = upsertPlan(planStore, {
      id: plan.id,
      name: plan.name,
      courseIds: [...selectedIds],
    })
    persist(next)
  }, [persist, planStore, selectedIds])

  const handleRenamePlan = useCallback(() => {
    const plan = planStore.activePlanId
      ? getPlanById(planStore, planStore.activePlanId)
      : null
    if (!plan) return

    const name = window.prompt('Rename plan:', plan.name)
    if (name === null) return
    const trimmed = name.trim()
    if (!trimmed || trimmed === plan.name) return

    const next = upsertPlan(planStore, {
      id: plan.id,
      name: trimmed,
      courseIds: [...selectedIds],
    })
    persist(next)
  }, [persist, planStore, selectedIds])

  const handleDeletePlan = useCallback(() => {
    const plan = planStore.activePlanId
      ? getPlanById(planStore, planStore.activePlanId)
      : null
    if (!plan) return

    if (
      !window.confirm(`Delete "${plan.name}"? This cannot be undone.`)
    ) {
      return
    }

    const next = deletePlanFromStore(planStore, plan.id)
    persist(next)
    setSelectedIds(new Set())
  }, [persist, planStore])

  if (status === 'loading') {
    return (
      <div className="p-6 text-gray-600">
        Loading course data…
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="p-6 text-red-700">
        <p className="font-semibold">Could not load data</p>
        <p className="mt-1 text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-yale-200 bg-yale-800 px-4 py-3 text-white sm:px-6 sm:py-4">
        <h1 className="text-xl font-semibold">
          Yale SOM Course Planner
        </h1>
        <p className="mt-1 text-sm text-yale-100">
          {academicYear ? (
            <>
              Academic Year {academicYear}
              <span aria-hidden className="px-1.5">
                ·
              </span>
            </>
          ) : null}
          {courses.length} courses loaded
          <span aria-hidden className="px-1.5">
            ·
          </span>
          {tags.length} tag mappings loaded
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
      </header>

      <main className="flex w-full flex-col bg-white">
        <PlanningPanel
          selectedCourses={selectedCourses}
          hasSelection={selectedIds.size > 0}
          tags={tags}
          plans={planStore.plans}
          activePlanId={planStore.activePlanId}
          activePlanName={activePlan?.name ?? null}
          isDirty={isDirty}
          onNewPlan={handleNewPlan}
          onSelectPlan={handleSelectPlan}
          onSavePlan={handleSavePlan}
          onRenamePlan={handleRenamePlan}
          onDeletePlan={handleDeletePlan}
          onRemoveCourse={removeCourse}
          onClearPlan={clearPlan}
        />
        <CourseBrowser
          courses={courses}
          tags={tags}
          selectedIds={selectedIds}
          onToggleCourse={toggleCourse}
        />
      </main>
    </div>
  )
}

export default App
