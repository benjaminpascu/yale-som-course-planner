import { useMemo, useState } from 'react'
import {
  createEmptyFilters,
  buildTagsByCourseNumber,
  filterCourses,
  getTimeRangeError,
  hasActiveFilters,
  uniqueCategories,
  uniqueSessions,
  uniqueUnits,
} from '../lib/filterCourses'
import CourseFilters from './CourseFilters'
import CourseRow from './CourseRow'

function toggleInSet(set, value) {
  const next = new Set(set)
  if (next.has(value)) next.delete(value)
  else next.add(value)
  return next
}

export default function CourseBrowser({ courses, tags }) {
  const [filters, setFilters] = useState(createEmptyFilters)

  const tagsByCourseNumber = useMemo(
    () => buildTagsByCourseNumber(tags),
    [tags],
  )

  const sessions = useMemo(() => uniqueSessions(courses), [courses])
  const categories = useMemo(() => uniqueCategories(courses), [courses])
  const unitValues = useMemo(() => uniqueUnits(courses), [courses])

  const timeRangeError = useMemo(() => getTimeRangeError(filters), [filters])

  const filtered = useMemo(() => {
    if (timeRangeError) return []
    return filterCourses(courses, filters, tagsByCourseNumber)
  }, [courses, filters, tagsByCourseNumber, timeRangeError])

  const active = hasActiveFilters(filters)

  function handleToggle(key, value) {
    setFilters((prev) => ({
      ...prev,
      [key]: toggleInSet(prev[key], value),
    }))
  }

  function handleClear() {
    setFilters(createEmptyFilters())
  }

  return (
    <div className="flex flex-col lg:flex-row">
      <CourseFilters
        sessions={sessions}
        categories={categories}
        unitValues={unitValues}
        filters={filters}
        onSearchChange={(search) =>
          setFilters((prev) => ({ ...prev, search }))
        }
        onTimeFromChange={(timeFrom) =>
          setFilters((prev) => ({ ...prev, timeFrom }))
        }
        onTimeToChange={(timeTo) =>
          setFilters((prev) => ({ ...prev, timeTo }))
        }
        onToggle={handleToggle}
        onClear={handleClear}
        hasFilters={active}
      />

      <section className="min-w-0 flex-1">
        <p className="border-b border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-600">
          Showing {filtered.length} of {courses.length} courses
        </p>
        {filtered.length === 0 ? (
          <p
            className={`px-4 py-8 text-center text-sm ${
              timeRangeError ? 'text-amber-800' : 'text-gray-500'
            }`}
          >
            {timeRangeError ??
              'No courses found. Try expanding your selection criteria.'}
          </p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filtered.map((course) => (
              <CourseRow key={course.courseId} course={course} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
