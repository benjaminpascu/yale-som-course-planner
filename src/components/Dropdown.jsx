import { useEffect, useRef, useState } from 'react'

/**
 * Our own dropdown instead of a plain <select>: on a Mac the browser's menu jumps so the
 * checked option sits over the box, which looks misaligned. This one opens right below,
 * with the same ▾ arrow as the Plan button.
 *
 * @param {{
 *   options: { value: string, label: string }[]
 *   value: string
 *   onChange: (value: string) => void
 *   id?: string
 *   ariaLabel?: string
 *   className?: string
 *   buttonClassName: string
 *   listClassName?: string
 * }} props
 */
export default function Dropdown({
  options,
  value,
  onChange,
  id,
  ariaLabel,
  className = '',
  buttonClassName,
  listClassName = 'max-h-[70vh] w-max max-w-[calc(100vw-2rem)]',
}) {
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const rootRef = useRef(null)
  const listRef = useRef(null)
  const current = options.find((o) => o.value === value) ?? options[0]

  useEffect(() => {
    if (!open) return
    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  // Keep the highlighted option in view (on opening, the chosen one).
  useEffect(() => {
    if (open) listRef.current?.children[highlight]?.scrollIntoView({ block: 'nearest' })
  }, [open, highlight])

  function openList() {
    setHighlight(Math.max(0, options.findIndex((o) => o.value === value)))
    setOpen(true)
  }

  function choose(next) {
    setOpen(false)
    if (next !== value) onChange(next)
  }

  function handleKeyDown(event) {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
        event.preventDefault()
        openList()
      }
      return
    }
    if (event.key === 'Escape' || event.key === 'Tab') {
      // Escape closes only the list, not the panel around it.
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
      }
      setOpen(false)
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlight((i) => Math.min(options.length - 1, i + 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlight((i) => Math.max(0, i - 1))
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      choose(options[highlight].value)
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        id={id}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={handleKeyDown}
        className={`flex w-full items-center pr-9 text-left ${buttonClassName}`}
      >
        <span className="truncate">{current?.label}</span>
      </button>
      <span aria-hidden className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-yale-800">
        ▾
      </span>
      {open ? (
        <ul
          ref={listRef}
          role="listbox"
          aria-label={ariaLabel}
          className={`absolute top-full left-0 z-50 mt-1 min-w-full overflow-y-auto rounded-md border border-[#c5ced9] bg-white py-1 shadow-lg ${listClassName}`}
        >
          {options.map((o, i) => {
            const selected = o.value === value
            return (
              <li
                key={o.value}
                role="option"
                aria-selected={selected}
                onPointerEnter={() => setHighlight(i)}
                onClick={() => choose(o.value)}
                className={`cursor-pointer px-3 py-1.5 text-sm text-yale-800 ${
                  i === highlight ? 'bg-yale-50' : ''
                } ${selected ? 'font-semibold' : ''}`}
              >
                {o.label}
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
