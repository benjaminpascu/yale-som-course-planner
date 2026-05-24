import { useEffect, useMemo, useState } from 'react'
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
import { getCourseRequirementTags } from '../lib/requirementTags'
import { getConflictingCourseIds } from '../lib/scheduleConflicts'
import { sectionTone } from '../lib/sectionTheme'
import CollapseChevron from './CollapseChevron'
import CourseFilters from './CourseFilters'
import CourseRow from './CourseRow'
import SectionHeader from './SectionHeader'

const PAGE_SIZE = 25

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
  selectedCourses = [],
  onToggleCourse,
  fallYear = null,
  springYear = null,
}) {
  const [filters, setFilters] = useState(createEmptyFilters)
  const [page, setPage] = useState(1)
  const [filtersOpen, setFiltersOpen] = useState(false)

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

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))

  useEffect(() => {
    setPage(1)
  }, [filters, timeRangeError])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const pageCourses = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, page])

  const rangeStart = filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(page * PAGE_SIZE, filtered.length)

  const active = hasActiveFilters(filters)
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.search.trim()) count += 1
    if (filters.timeFrom) count += 1
    if (filters.timeTo) count += 1
    count += filters.sessions.size
    count += filters.days.size
    count += filters.units.size
    count += filters.bidTypes.size
    count += filters.categories.size
    count += filters.tagCodes.size
    return count
  }, [filters])

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
    fallYear,
    springYear,
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

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') setFiltersOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <section
        className={`hidden h-full min-h-0 w-full lg:flex lg:flex-col lg:overflow-hidden ${catalogTone.section}`}
      >
        <SectionHeader
          tone="catalog"
          title="Course catalog"
          subtitle={`${filtered.length} matched · ${selectedCourses.length} in plan`}
        />

        <div className="border-b border-yale-150 px-4 py-2">
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="w-full rounded-md border border-yale-200 bg-white px-3 py-2 text-left text-sm font-medium text-yale-950 shadow-sm hover:bg-yale-50"
          >
            Search &amp; filters
            {active ? (
              <span className="ml-1 text-yale-800">({activeFilterCount} active)</span>
            ) : null}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
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
            <>
              <ul className="divide-y divide-gray-200/80">
                {pageCourses.map((course) => (
                  <CourseRow
                    key={course.courseId}
                    course={course}
                    requirementTagCodes={getCourseRequirementTags(
                      course.courseNumber,
                      tagsByCourseNumber,
                    )}
                    isSelected={selectedIds.has(course.courseId)}
                    hasConflict={conflictingIds.has(course.courseId)}
                    onToggle={() => onToggleCourse(course.courseId)}
                  />
                ))}
              </ul>
              {totalPages > 1 ? (
                <nav
                  className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200/80 bg-gray-50/80 px-4 py-3"
                  aria-label="Course catalog pages"
                >
                  <p className="text-sm text-gray-600">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={page >= totalPages}
                      className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </nav>
              ) : null}
            </>
          )}
        </div>

        {filtersOpen ? (
          <div
            className="fixed inset-0 z-40 bg-black/35"
            onClick={() => setFiltersOpen(false)}
            aria-hidden
          >
            <div
              className={`h-full w-[min(54rem,100vw-2.5rem)] overflow-y-auto bg-white shadow-2xl ${filterTone.section}`}
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Search and filters"
            >
              <div
                className={`sticky top-0 z-10 flex items-center justify-between border-b px-4 py-3 ${filterTone.header}`}
              >
                <p className="text-sm font-semibold text-yale-950">
                  Search &amp; filters
                </p>
                <button
                  type="button"
                  onClick={() => setFiltersOpen(false)}
                  className="rounded border border-yale-300 bg-white px-2.5 py-1 text-xs font-medium text-yale-900 hover:bg-yale-50"
                >
                  Close
                </button>
              </div>
              <CourseFilters {...filterProps} />
            </div>
          </div>
        ) : null}
      </section>

      <section className={`w-full lg:hidden ${catalogTone.section}`}>
        <SectionHeader
          tone="catalog"
          title="Course catalog"
          subtitle={
            filtered.length === 0
              ? `${filtered.length} of ${courses.length} courses`
              : `${rangeStart}–${rangeEnd} of ${filtered.length} (${courses.length} total)`
          }
        />

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
          <>
            <ul className="divide-y divide-gray-200/80">
              {pageCourses.map((course) => (
                <CourseRow
                  key={course.courseId}
                  course={course}
                  requirementTagCodes={getCourseRequirementTags(
                    course.courseNumber,
                    tagsByCourseNumber,
                  )}
                  isSelected={selectedIds.has(course.courseId)}
                  hasConflict={conflictingIds.has(course.courseId)}
                  onToggle={() => onToggleCourse(course.courseId)}
                />
              ))}
            </ul>
            {totalPages > 1 ? (
              <nav
                className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200/80 bg-gray-50/80 px-4 py-3"
                aria-label="Course catalog pages"
              >
                <p className="text-sm text-gray-600">
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={page >= totalPages}
                    className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </nav>
            ) : null}
          </>
        )}
      </section>
    </div>
  )
}
