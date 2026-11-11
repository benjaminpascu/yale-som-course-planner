import { useEffect, useState } from 'react'
import { parseWeightInput } from '../../lib/compareScoring'

const format = (weight) => weight.toFixed(2)

/** A criterion weight (0–1). Saves each valid value; shows two decimals when not editing. */
export default function WeightInput({ weight, onCommit, ariaLabel }) {
  const [text, setText] = useState(format(weight))
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) setText(format(weight))
  }, [weight, focused])

  const invalid = parseWeightInput(text) === undefined

  return (
    <input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={text}
      aria-label={ariaLabel}
      aria-invalid={invalid || undefined}
      onChange={(event) => {
        setText(event.target.value)
        const parsed = parseWeightInput(event.target.value)
        if (parsed !== undefined && parsed !== weight) onCommit(parsed)
      }}
      onFocus={(event) => {
        setFocused(true)
        event.currentTarget.select()
      }}
      onBlur={() => setFocused(false)}
      className={`h-8 w-16 rounded-md border text-center text-sm font-semibold tabular-nums text-[#1a1f2b] focus:outline-none focus:ring-2 focus:ring-yale-800 ${
        invalid ? 'border-danger bg-danger/5 text-danger' : 'border-[#dde3ea] bg-[#f5f7fa]'
      }`}
    />
  )
}
