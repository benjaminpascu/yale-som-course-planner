import { WEEKDAYS } from '../lib/courseDisplay'
import {
  SESSION_FULL_TERM_FOOTNOTE,
  formatSessionLabel,
  hasSelectedFullTermSession,
  isFullTermSession,
} from '../lib/sessionDisplay'
import { departmentLabel } from '../lib/departments'
import FilterCheckboxGroup from './FilterCheckboxGroup'
import RequirementTag from './RequirementTag'
import TimeRangeSelect from './TimeRangeSelect'

function formatUnits(units) {
  if (units === 0) return '0 units'
  if (units === 1) return '1 unit'
  return `${units} units`
}

/** Same red Conflict badge as the catalog, at the size of the requirement tags here. */
function ConflictTag() {
  return (
    <span className="inline-flex shrink-0 items-center rounded bg-danger px-1.5 py-0.5 text-xs font-semibold leading-tight text-white">
      Conflict
    </span>
  )
}

const CONFLICT_OPTIONS = [
  { id: 'only', label: 'Only conflicts' },
  { id: 'hide', label: 'Hide conflicts' },
].map((opt) => ({
  ...opt,
  renderLabel: () => (
    <span className="inline-flex items-center gap-1">
      {opt.id === 'only' ? 'Only' : 'Hide'}
      <ConflictTag />
    </span>
  ),
}))

/**
 * Filters → Bidding (spec: docs/specs/bidding-filter.md): minimum average past
 * points per round. Whole numbers only; empty (gray 0) = no minimum.
 */
function BiddingMinimums({ minRound1, minRound2, onChange }) {
  const fields = [
    { key: 'minRound1', id: 'bid-min-round-1', label: 'Round 1 at least', value: minRound1 },
    { key: 'minRound2', id: 'bid-min-round-2', label: 'Round 2 at least', value: minRound2 },
  ]
  return (
    <fieldset className="space-y-1.5">
      <legend className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        Bidding
      </legend>
      <p className="text-xs text-gray-500">Average of past years</p>
      <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
        {fields.map((field) => (
          <div key={field.key}>
            <label htmlFor={field.id} className="text-xs text-gray-600">
              {field.label}
            </label>
            <input
              id={field.id}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="0"
              value={field.value}
              onChange={(e) => onChange(field.key, e.target.value.replace(/\D/g, ''))}
              className="mt-0.5 block w-40 rounded-md border border-yale-200 bg-yale-50/80 px-2 py-2 text-sm tabular-nums placeholder:text-gray-400 hover:bg-yale-50 focus:border-yale-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-yale-800"
            />
          </div>
        ))}
      </div>
    </fieldset>
  )
}

const FILTER_CARD =
  'rounded-lg border border-yale-200/90 bg-white p-3 shadow-sm space-y-4'

export default function CourseFilters({
  somFilters = true,
  sessions,
  categories,
  unitValues,
  bidValues,
  requirementTags = [],
  departments = [],
  filters,
  fallYear = null,
  springYear = null,
  onTimeFromChange,
  onTimeToChange,
  onToggle,
  onBiddingChange,
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
  const bidOptions = bidValues
  const tagOptions = requirementTags.map((name) => ({
    id: name,
    label: name,
    renderLabel: () => <RequirementTag tagCode={name} />,
  }))

  return (
    <aside className="mx-auto w-full max-w-5xl p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className={`${FILTER_CARD} ${somFilters ? '' : 'sm:col-span-2'}`}>
          {somFilters ? (
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
          ) : null}
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
          <FilterCheckboxGroup
            legend="Conflicts"
            layout="wrap"
            options={CONFLICT_OPTIONS}
            selected={filters.conflicts}
            onToggle={(id) => onToggle('conflicts', id)}
          />
        </div>

        {somFilters ? null : (
          <div className={`${FILTER_CARD} sm:col-span-2`}>
            <FilterCheckboxGroup
              legend="Department"
              layout="columns"
              options={departments
                .map((code) => ({ id: code, label: departmentLabel(code) }))
                .sort((a, b) => a.label.localeCompare(b.label))}
              selected={filters.subjects}
              onToggle={(id) => onToggle('subjects', id)}
            />
          </div>
        )}

        {somFilters ? (
        <>
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
            options={bidOptions}
            selected={filters.bidTypes}
            onToggle={(id) => onToggle('bidTypes', id)}
          />
          <BiddingMinimums
            minRound1={filters.minRound1}
            minRound2={filters.minRound2}
            onChange={onBiddingChange}
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
        </>
        ) : null}

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
