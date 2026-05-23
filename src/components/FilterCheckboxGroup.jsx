/**
 * @param {'stack' | 'inline' | 'wrap'} [layout]
 * - stack: vertical list (default)
 * - inline: single horizontal row (e.g. weekdays)
 * - wrap: flowing chips (e.g. sessions, units)
 */
export default function FilterCheckboxGroup({
  legend,
  hint,
  footer,
  options,
  selected,
  onToggle,
  layout = 'stack',
}) {
  const listClassName =
    layout === 'inline'
      ? 'flex flex-wrap justify-between gap-1'
      : layout === 'wrap'
        ? 'flex flex-wrap gap-1.5'
        : 'space-y-1'

  const labelBaseClassName =
    layout === 'inline'
      ? 'flex min-w-0 flex-1 cursor-pointer flex-col items-center gap-1 rounded-md border px-1 py-2 text-xs'
      : layout === 'wrap'
        ? 'inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs'
        : 'flex cursor-pointer items-center gap-2 text-sm text-gray-700'

  const labelIdleClassName =
    layout === 'stack'
      ? ''
      : 'border-gray-200 bg-gray-50 text-gray-700'

  const labelActiveClassName =
    layout === 'stack'
      ? ''
      : 'border-blue-300 bg-blue-50 text-blue-900'

  return (
    <fieldset className="space-y-1.5">
      <legend className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {legend}
      </legend>
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
      <ul className={listClassName}>
        {options.map((opt) => {
          const id = String(opt.id)
          const checked = selected.has(id)
          return (
            <li
              key={id}
              className={layout === 'inline' ? 'min-w-0 flex-1' : undefined}
            >
              <label
                className={`${labelBaseClassName} ${layout === 'stack' ? '' : checked ? labelActiveClassName : labelIdleClassName}`}
              >
                <input
                  type="checkbox"
                  className={
                    layout === 'inline'
                      ? 'size-3.5 rounded border-gray-300 text-blue-800 focus:ring-blue-800'
                      : layout === 'wrap'
                        ? 'size-3 rounded border-gray-300 text-blue-800 focus:ring-blue-800'
                        : 'size-3.5 rounded border-gray-300 text-blue-800 focus:ring-blue-800'
                  }
                  checked={checked}
                  onChange={() => onToggle(id)}
                />
                <span className={layout === 'inline' ? 'font-medium' : ''}>
                  {opt.label}
                </span>
              </label>
            </li>
          )
        })}
      </ul>
      {footer && (
        <p className="text-xs leading-snug text-amber-800">{footer}</p>
      )}
    </fieldset>
  )
}
