import { useEffect, useState } from 'react'
import { parseScoreInput, scoreColor } from '../../lib/compareScoring'

function toText(value) {
  return value == null ? '' : String(value)
}

/**
 * One 1–10 score cell. Valid input saves immediately; invalid input shows red
 * and reverts on blur. Arrow Up/Down/Enter move within the same table column.
 */
export default function ScoreInput({
  value,
  onCommit,
  ariaLabel,
  rowIndex = null,
  colIndex = null,
}) {
  const [text, setText] = useState(toText(value))
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) setText(toText(value))
  }, [value, focused])

  const invalid = parseScoreInput(text) === undefined

  function handleChange(event) {
    const next = event.target.value
    setText(next)
    const parsed = parseScoreInput(next)
    if (parsed !== undefined && parsed !== value) onCommit(parsed)
  }

  function moveTo(event, rowDelta) {
    if (rowIndex == null) return
    const table = event.currentTarget.closest('table')
    const target = table?.querySelector(
      `input[data-row="${rowIndex + rowDelta}"][data-col="${colIndex}"]`,
    )
    if (!target) return
    event.preventDefault()
    target.focus()
  }

  function handleKeyDown(event) {
    if (event.key === 'ArrowDown' || event.key === 'Enter') moveTo(event, 1)
    else if (event.key === 'ArrowUp') moveTo(event, -1)
    else if (event.key === 'Escape') {
      setText(toText(value))
      event.currentTarget.blur()
    }
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={text}
      aria-label={ariaLabel}
      aria-invalid={invalid || undefined}
      data-row={rowIndex ?? undefined}
      data-col={colIndex ?? undefined}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onFocus={(event) => {
        setFocused(true)
        event.currentTarget.select()
      }}
      onBlur={() => {
        setFocused(false)
        setText(toText(value))
      }}
      style={{ backgroundColor: invalid ? undefined : (scoreColor(value) ?? undefined) }}
      className={`h-8 w-11 rounded border text-center text-sm font-semibold tabular-nums text-gray-900 focus:outline-none focus:ring-2 focus:ring-yale-800 ${
        invalid
          ? 'border-red-400 bg-red-50 text-red-700'
          : 'border-gray-200 bg-white'
      }`}
    />
  )
}
