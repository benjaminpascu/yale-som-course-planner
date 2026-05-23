import { useCallback, useEffect, useMemo, useState } from 'react'
import CourseBrowser from './components/CourseBrowser'
import PlanningPanel from './components/PlanningPanel'
import { getAcademicYearLabel } from './lib/academicYear'
import { loadAppData } from './lib/loadData'

const YALE_COURSE_LIST_URL = 'https://som.yale.edu/elective-core-courses'

function App() {
  const [courses, setCourses] = useState([])
  const [tags, setTags] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState(null)
  const [selectedIds, setSelectedIds] = useState(() => new Set())

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
