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
import { getConflictingCourseIds } from '../lib/scheduleConflicts'
import { sectionTone } from '../lib/sectionTheme'
import CollapseChevron from './CollapseChevron'
import CourseFilters from './CourseFilters'
import CourseRow from './CourseRow'
import SectionHeader from './SectionHeader'

function toggleInSet(set, value) {
  const next = new Set(set)
  if (next.has(value)) next.delete(value)
  else next.add(value)
  return next
}

export default function CourseBrowser({
  courses,
  tags,
  selectedIds,
  onToggleCourse,
}) {
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

  const conflictingIds = useMemo(
    () => getConflictingCourseIds(courses, selectedIds),
    [courses, selectedIds],
  )

  function handleToggle(key, value) {
    setFilters((prev) => ({
      ...prev,
      [key]: toggleInSet(prev[key], value),
    }))
  }

  function handleClear() {
    setFilters(createEmptyFilters())
  }

  const filterProps = {
    sessions,
    categories,
    unitValues,
    filters,
    onSearchChange: (search) =>
      setFilters((prev) => ({ ...prev, search })),
    onTimeFromChange: (timeFrom) =>
      setFilters((prev) => ({ ...prev, timeFrom })),
    onTimeToChange: (timeTo) => setFilters((prev) => ({ ...prev, timeTo })),
    onToggle: handleToggle,
    onClear: handleClear,
    hasFilters: active,
  }

  const filterTone = sectionTone('filters')
  const catalogTone = sectionTone('catalog')

  return (
    <div className="flex w-full flex-col">
      <details className={`group border-b ${filterTone.section}`}>
        <summary
          className={`flex cursor-pointer list-none items-center gap-2 border-b px-4 py-3 text-sm font-semibold text-yale-950 marker:content-none [&::-webkit-details-marker]:hidden ${filterTone.header}`}
        >
          <CollapseChevron />
          <span className="flex-1">Search &amp; filters</span>
          {active ? (
            <span className="font-normal text-yale-800">(active)</span>
          ) : null}
        </summary>
        <CourseFilters {...filterProps} />
      </details>

      <section className={`w-full ${catalogTone.section}`}>
        <SectionHeader
          tone="catalog"
          title="Course catalog"
          subtitle={`Showing ${filtered.length} of ${courses.length} courses · ${selectedIds.size} in plan`}
        />
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
          <ul className="divide-y divide-gray-200/80">
            {filtered.map((course) => (
              <CourseRow
                key={course.courseId}
                course={course}
                isSelected={selectedIds.has(course.courseId)}
                hasConflict={conflictingIds.has(course.courseId)}
                onToggle={() => onToggleCourse(course.courseId)}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
