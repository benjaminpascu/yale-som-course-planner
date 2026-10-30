import { useEffect, useRef, useState } from 'react'
import { parseScoreInput, ratingTone, scoreToCommit } from '../../lib/compareScoring'

function toText(value) {
  return value == null ? '' : String(value)
}

/**
 * One 1–10 rating box (64×36), tinted by value. Valid input saves at once;
 * invalid input shows red and never replaces the earlier rating. Escape undoes
 * the edit; Arrow Up/Down and Enter move within the same column.
 */
export default function RatingInput({ value, onCommit, ariaLabel, rowIndex, colIndex, disabled = false }) {
  const [text, setText] = useState(toText(value))
  const [focused, setFocused] = useState(false)
  const valueAtFocus = useRef(value)

  // While not being edited, track the saved value: it's what an invalid edit falls back to.
  useEffect(() => {
    if (focused) return
    valueAtFocus.current = value
    setText(toText(value))
  }, [value, focused])

  const invalid = parseScoreInput(text) === undefined
  const tone = ratingTone(value)

  function handleChange(event) {
    const next = event.target.value
    setText(next)
    const commit = scoreToCommit(next, valueAtFocus.current)
    if (commit !== value) onCommit(commit)
  }

  function moveTo(event, rowDelta) {
    const target = event.currentTarget
      .closest('[data-rating-grid]')
      ?.querySelector(`input[data-row="${rowIndex + rowDelta}"][data-col="${colIndex}"]`)
    if (!target) return
    event.preventDefault()
    target.focus()
  }

  function handleKeyDown(event) {
    if (event.key === 'ArrowDown' || event.key === 'Enter') moveTo(event, 1)
    else if (event.key === 'ArrowUp') moveTo(event, -1)
    else if (event.key === 'Escape') {
      if (valueAtFocus.current !== value) onCommit(valueAtFocus.current)
      setText(toText(valueAtFocus.current))
      event.currentTarget.blur()
    }
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder="–"
      value={text}
      disabled={disabled}
      title={disabled ? 'No professor listed' : undefined}
      aria-label={ariaLabel}
      aria-invalid={invalid || undefined}
      data-row={rowIndex}
      data-col={colIndex}
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
      style={
        invalid
          ? undefined
          : { backgroundColor: tone.bg, color: tone.fg, borderColor: tone.bd }
      }
      className={`h-9 w-16 rounded-md border text-center text-sm font-bold tabular-nums placeholder:font-normal placeholder:text-[#8a95a5] focus:outline-none focus:ring-2 focus:ring-yale-800 disabled:cursor-not-allowed disabled:bg-[#f5f7fa] ${
        invalid ? 'border-red-400 bg-red-50 text-red-700' : ''
      }`}
    />
  )
}
