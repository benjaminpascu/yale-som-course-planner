import { TIME_PICKER_OPTIONS } from '../lib/courseDisplay'
import Dropdown from './Dropdown'

const TIME_OPTIONS = [{ value: '', label: 'Any' }, ...TIME_PICKER_OPTIONS]

const buttonClassName =
  'rounded-md border border-yale-200 bg-yale-50/80 py-2 pl-2 text-sm hover:bg-yale-50 focus:border-yale-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-yale-800'

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
      <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
        <div>
          <label htmlFor="time-from" className="text-xs text-gray-600">
            Begin
          </label>
          <Dropdown
            id="time-from"
            options={TIME_OPTIONS}
            value={timeFrom}
            onChange={onTimeFromChange}
            className="mt-0.5 w-40"
            buttonClassName={buttonClassName}
            listClassName="max-h-60"
          />
        </div>
        <div>
          <label htmlFor="time-to" className="text-xs text-gray-600">
            End
          </label>
          <Dropdown
            id="time-to"
            options={TIME_OPTIONS}
            value={timeTo}
            onChange={onTimeToChange}
            className="mt-0.5 w-40"
            buttonClassName={buttonClassName}
            listClassName="max-h-60"
          />
        </div>
      </div>
    </fieldset>
  )
}
