import { BID_FILTER_OPTIONS, WEEKDAYS } from '../lib/courseDisplay'
import {
  SESSION_FULL_TERM_FOOTNOTE,
  formatSessionLabel,
  hasSelectedFullTermSession,
  isFullTermSession,
} from '../lib/sessionDisplay'
import {
  REQUIREMENT_TAG_CODES,
  REQUIREMENT_TAG_LABELS,
} from '../lib/requirementTags'
import FilterCheckboxGroup from './FilterCheckboxGroup'
import TimeRangeSelect from './TimeRangeSelect'

function formatUnits(units) {
  if (units === 0) return '0 units'
  if (units === 1) return '1 unit'
  return `${units} units`
}

const FILTER_CARD =
  'rounded-lg border border-yale-200/90 bg-white p-3 shadow-sm space-y-4'

export default function CourseFilters({
  sessions,
  categories,
  unitValues,
  filters,
  fallYear = null,
  springYear = null,
  onSearchChange,
  onTimeFromChange,
  onTimeToChange,
  onToggle,
  onClear,
  hasFilters,
}) {
  const sessionOptions = sessions.map((s) => ({
    id: s,
    label: formatSessionLabel(s, {
      showAsterisk: filters.sessions.has(s) && isFullTermSession(s),
      fallYear,
      springYear,
    }),
  }))
  const showSessionFootnote = hasSelectedFullTermSession(filters.sessions)
  const dayOptions = WEEKDAYS.map((d) => ({ id: d, label: d }))
  const unitOptions = unitValues.map((u) => ({
    id: String(u),
    label: formatUnits(u),
  }))
  const categoryOptions = categories.map((c) => ({ id: c, label: c }))
  const tagOptions = REQUIREMENT_TAG_CODES.map((code) => ({
    id: code,
    label: REQUIREMENT_TAG_LABELS[code] ?? code,
  }))

  return (
    <aside className="mx-auto w-full max-w-5xl p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className={`${FILTER_CARD} sm:col-span-2`}>
          <label
            htmlFor="course-search"
            className="text-xs font-semibold uppercase tracking-wide text-gray-500"
          >
            Search
          </label>
          <input
            id="course-search"
            type="search"
            placeholder="Number, title, faculty…"
            value={filters.search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="mt-1.5 w-full rounded-md border border-yale-200 bg-yale-50/80 px-3 py-2 text-sm focus:border-yale-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-yale-800"
          />
        </div>

        <div className={FILTER_CARD}>
          <FilterCheckboxGroup
            legend="Session"
            layout="wrap"
            footer={
              showSessionFootnote ? SESSION_FULL_TERM_FOOTNOTE : undefined
            }
            options={sessionOptions}
            selected={filters.sessions}
            onToggle={(id) => onToggle('sessions', id)}
          />
          <FilterCheckboxGroup
            legend="Day of week"
            hint="Timed courses only"
            layout="wrap"
            options={dayOptions}
            selected={filters.days}
            onToggle={(id) => onToggle('days', id)}
          />
          <TimeRangeSelect
            timeFrom={filters.timeFrom}
            timeTo={filters.timeTo}
            onTimeFromChange={onTimeFromChange}
            onTimeToChange={onTimeToChange}
          />
        </div>

        <div className={FILTER_CARD}>
          <FilterCheckboxGroup
            legend="Units"
            layout="wrap"
            options={unitOptions}
            selected={new Set([...filters.units].map((u) => String(u)))}
            onToggle={(id) => onToggle('units', Number(id))}
          />
          <FilterCheckboxGroup
            legend="Bid or permission"
            layout="wrap"
            options={BID_FILTER_OPTIONS}
            selected={filters.bidTypes}
            onToggle={(id) => onToggle('bidTypes', id)}
          />
        </div>

        <div className={`${FILTER_CARD} sm:col-span-2`}>
          <FilterCheckboxGroup
            legend="Category"
            layout="columns"
            options={categoryOptions}
            selected={filters.categories}
            onToggle={(id) => onToggle('categories', id)}
          />
          <FilterCheckboxGroup
            legend="Requirements"
            layout="wrap"
            options={tagOptions}
            selected={filters.tagCodes}
            onToggle={(id) => onToggle('tagCodes', id)}
          />
        </div>

        {hasFilters ? (
          <button
            type="button"
            onClick={onClear}
            className="w-full rounded-md border border-yale-200 bg-white px-3 py-2 text-sm font-medium text-yale-900 shadow-sm hover:bg-yale-50 sm:col-span-2"
          >
            Clear all filters
          </button>
        ) : null}
      </div>
    </aside>
  )
}
