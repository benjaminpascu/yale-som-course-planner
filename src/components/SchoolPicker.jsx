import { useEffect, useRef, useState } from 'react'

/**
 * Which Yale school's courses the Course Catalog shows (one at a time).
 * Our own list instead of a plain <select>: on a Mac the browser's menu jumps so the
 * checked school sits over the box, which looks misaligned. This one opens right below.
 */
export default function SchoolPicker({ schools, schoolId, onSchoolChange, className = '' }) {
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const rootRef = useRef(null)
  const listRef = useRef(null)
  const current = schools.find((s) => s.id === schoolId) ?? schools[0]

  useEffect(() => {
    if (!open) return
    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  // Keep the highlighted school in view while moving with the arrow keys.
  useEffect(() => {
    if (open) listRef.current?.children[highlight]?.scrollIntoView({ block: 'nearest' })
  }, [open, highlight])

  function openList() {
    setHighlight(Math.max(0, schools.findIndex((s) => s.id === schoolId)))
    setOpen(true)
  }

  function choose(id) {
    setOpen(false)
    if (id !== schoolId) onSchoolChange(id)
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
      if (event.key === 'Escape') event.preventDefault()
      setOpen(false)
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlight((i) => Math.min(schools.length - 1, i + 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlight((i) => Math.max(0, i - 1))
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      choose(schools[highlight].id)
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-label="School"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={handleKeyDown}
        className="flex h-[38px] w-full items-center rounded-md border border-[#c5ced9] bg-white py-1.5 pr-9 pl-3 text-left text-sm font-semibold text-yale-800 hover:bg-yale-50"
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
          aria-label="School"
          className="absolute top-full left-0 z-50 mt-1 max-h-[70vh] w-max max-w-[calc(100vw-2rem)] min-w-full overflow-y-auto rounded-md border border-[#c5ced9] bg-white py-1 shadow-lg"
        >
          {schools.map((s, i) => {
            const selected = s.id === schoolId
            return (
              <li
                key={s.id}
                role="option"
                aria-selected={selected}
                onPointerEnter={() => setHighlight(i)}
                onClick={() => choose(s.id)}
                className={`cursor-pointer px-3 py-1.5 text-sm text-yale-800 ${
                  i === highlight ? 'bg-yale-50' : ''
                } ${selected ? 'font-semibold' : ''}`}
              >
                {s.label}
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
