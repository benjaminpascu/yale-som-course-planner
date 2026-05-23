import { TIME_PICKER_OPTIONS } from '../lib/courseDisplay'

const selectClassName =
  'mt-0.5 w-full max-w-40 rounded-md border border-yale-200 bg-yale-50/80 px-2 py-2 text-sm focus:border-yale-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-yale-800'

export default function TimeRangeSelect({
  timeFrom,
  timeTo,
  onTimeFromChange,
  onTimeToChange,
}) {
  return (
    <fieldset className="space-y-1.5">
      <legend className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        Time range
      </legend>
      <p className="text-xs text-gray-500">
        Pick begin and/or end. Timed courses only.
      </p>
      <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
        <div>
          <label htmlFor="time-from" className="text-xs text-gray-600">
            Begin
          </label>
          <select
            id="time-from"
            value={timeFrom}
            onChange={(e) => onTimeFromChange(e.target.value)}
            className={selectClassName}
          >
            <option value="">Any</option>
            {TIME_PICKER_OPTIONS.map((opt) => (
              <option key={`from-${opt.value}`} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="time-to" className="text-xs text-gray-600">
            End
          </label>
          <select
            id="time-to"
            value={timeTo}
            onChange={(e) => onTimeToChange(e.target.value)}
            className={selectClassName}
          >
            <option value="">Any</option>
            {TIME_PICKER_OPTIONS.map((opt) => (
              <option key={`to-${opt.value}`} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </fieldset>
  )
}
