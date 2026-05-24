import { useEffect, useMemo, useState } from 'react'
import {
  createEmptyFilters,
  buildTagsByCourseNumber,
  filterCourses,
  getTimeRangeError,
  hasActiveFilters,
  uniqueBidOrPermission,
  uniqueCategories,
  uniqueSessions,
  uniqueUnits,
} from '../lib/filterCourses'
import { getCourseRequirementTags } from '../lib/requirementTags'
import { getConflictingCourseIds } from '../lib/scheduleConflicts'
import { sectionTone } from '../lib/sectionTheme'
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

function formatCatalogSubtitle(filteredCount, rangeStart, rangeEnd, inPlanCount) {
  if (filteredCount === 0) {
    return `${filteredCount} matched · ${inPlanCount} in plan`
  }
  return `Showing ${rangeStart}–${rangeEnd} of ${filteredCount} matched · ${inPlanCount} in plan`
}

function CatalogPagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null

  const { header } = sectionTone('catalog')

  return (
    <nav
      className={`flex shrink-0 flex-wrap items-center justify-between gap-2 border-t px-4 py-2 ${header}`}
      aria-label="Course catalog pages"
    >
      <p className="text-xs leading-none text-yale-100">
        Page {page} of {totalPages}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onPageChange((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          className="rounded border border-yale-500 bg-white px-2 py-0.5 text-xs font-medium leading-none text-yale-900 hover:bg-yale-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={() => onPageChange((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
          className="rounded border border-yale-500 bg-white px-2 py-0.5 text-xs font-medium leading-none text-yale-900 hover:bg-yale-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </nav>
  )
}

function CatalogSearchBar({
  search,
  onSearchChange,
  onOpenFilters,
  panelFilterCount,
  inputId = 'course-search',
}) {
  return (
    <div className="flex min-h-0 items-center gap-2 border-b border-yale-150 px-3 py-1.5">
      <label htmlFor={inputId} className="sr-only">
        Search courses
      </label>
      <input
        id={inputId}
        type="search"
        placeholder="Number, title, faculty…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="min-w-0 flex-1 rounded-md border border-yale-200 bg-yale-50/80 px-2.5 py-1.5 text-xs text-yale-950 focus:border-yale-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-yale-800"
      />
      <button
        type="button"
        onClick={onOpenFilters}
        className="shrink-0 rounded-md border border-yale-200 bg-white px-2.5 py-1.5 text-xs font-medium text-yale-950 shadow-sm hover:bg-yale-50"
      >
        Filters
        {panelFilterCount > 0 ? (
          <span className="ml-1 tabular-nums text-yale-800">{panelFilterCount}</span>
        ) : null}
      </button>
    </div>
  )
}

export default function CourseBrowser({
  courses,
  tags,
  selectedIds,
  selectedCourses = [],
  onToggleCourse,
  fallYear = null,
  springYear = null,
  fullHeight = false,
}) {
  const [filters, setFilters] = useState(createEmptyFilters)
  const [page, setPage] = useState(1)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [expandedCourseId, setExpandedCourseId] = useState(null)

  const tagsByCourseNumber = useMemo(
    () => buildTagsByCourseNumber(tags),
    [tags],
  )

  const sessions = useMemo(() => uniqueSessions(courses), [courses])
  const categories = useMemo(() => uniqueCategories(courses), [courses])
  const unitValues = useMemo(() => uniqueUnits(courses), [courses])
  const bidValues = useMemo(() => uniqueBidOrPermission(courses), [courses])

  const timeRangeError = useMemo(() => getTimeRangeError(filters), [filters])

  const filtered = useMemo(() => {
    if (timeRangeError) return []
    return filterCourses(courses, filters, tagsByCourseNumber)
  }, [courses, filters, tagsByCourseNumber, timeRangeError])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))

  useEffect(() => {
    setPage(1)
    setExpandedCourseId(null)
  }, [filters, timeRangeError])

  useEffect(() => {
    setExpandedCourseId(null)
  }, [page])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const pageCourses = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, page])

  const rangeStart = filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(page * PAGE_SIZE, filtered.length)

  const panelFiltersActive = useMemo(() => {
    const panelOnly = { ...filters, search: '' }
    return hasActiveFilters(panelOnly)
  }, [filters])

  const panelFilterCount = useMemo(() => {
    let count = 0
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

  function getCourseRowProps(course) {
    return {
      course,
      requirementTagCodes: getCourseRequirementTags(
        course.courseNumber,
        tagsByCourseNumber,
      ),
      isSelected: selectedIds.has(course.courseId),
      hasConflict: conflictingIds.has(course.courseId),
      isExpanded: expandedCourseId === course.courseId,
      onExpandToggle: () =>
        setExpandedCourseId((id) =>
          id === course.courseId ? null : course.courseId,
        ),
      onTogglePlan: () => onToggleCourse(course.courseId),
    }
  }

  function handleToggle(key, value) {
    setFilters((prev) => ({
      ...prev,
      [key]: toggleInSet(prev[key], value),
    }))
  }

  function handleClear() {
    setFilters((prev) => ({ ...createEmptyFilters(), search: prev.search }))
  }

  const filterProps = {
    sessions,
    categories,
    unitValues,
    bidValues,
    filters,
    fallYear,
    springYear,
    onTimeFromChange: (timeFrom) =>
      setFilters((prev) => ({ ...prev, timeFrom })),
    onTimeToChange: (timeTo) => setFilters((prev) => ({ ...prev, timeTo })),
    onToggle: handleToggle,
    onClear: handleClear,
    hasFilters: panelFiltersActive,
  }

  const searchBarProps = {
    search: filters.search,
    onSearchChange: (search) =>
      setFilters((prev) => ({ ...prev, search })),
    onOpenFilters: () => setFiltersOpen(true),
    panelFilterCount,
  }

  const filterTone = sectionTone('filters')
  const catalogTone = sectionTone('catalog')

  const catalogSubtitle = formatCatalogSubtitle(
    filtered.length,
    rangeStart,
    rangeEnd,
    selectedCourses.length,
  )

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
          subtitle={catalogSubtitle}
        />

        <CatalogSearchBar {...searchBarProps} />

        <div className="min-h-0 flex-1 overflow-y-auto">
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
            <ul className="divide-y divide-yale-200">
              {pageCourses.map((course) => (
                <CourseRow
                  key={course.courseId}
                  {...getCourseRowProps(course)}
                />
              ))}
            </ul>
          )}
        </div>

        <CatalogPagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </section>

      <section
        className={`flex w-full flex-col lg:hidden ${
          fullHeight ? 'h-full min-h-0' : ''
        } ${catalogTone.section}`}
      >
        <SectionHeader
          tone="catalog"
          title="Course catalog"
          subtitle={catalogSubtitle}
        />

        <CatalogSearchBar {...searchBarProps} inputId="course-search-mobile" />

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
            <div
              className={
                fullHeight ? 'min-h-0 flex-1 overflow-y-auto' : undefined
              }
            >
              <ul className="divide-y divide-yale-200">
                {pageCourses.map((course) => (
                  <CourseRow
                    key={course.courseId}
                    {...getCourseRowProps(course)}
                  />
                ))}
              </ul>
            </div>
            <CatalogPagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </>
        )}
      </section>

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
            aria-label="Filters"
          >
            <div
              className={`sticky top-0 z-10 flex items-center justify-between border-b px-4 py-3 ${filterTone.header}`}
            >
              <p className="text-sm font-semibold text-yale-950">Filters</p>
              <div className="flex items-center gap-2">
                {panelFiltersActive ? (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="rounded border border-yale-300 bg-white px-2.5 py-1 text-xs font-medium text-yale-900 hover:bg-yale-50"
                  >
                    Clear
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setFiltersOpen(false)}
                  className="rounded border border-yale-300 bg-white px-2.5 py-1 text-xs font-medium text-yale-900 hover:bg-yale-50"
                >
                  Close
                </button>
              </div>
            </div>
            <CourseFilters {...filterProps} />
          </div>
        </div>
      ) : null}
    </div>
  )
}
