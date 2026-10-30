import { useRef, useState } from 'react'
import { setNote } from '../../lib/compareStorage'
import Popover from './Popover'

function NoteIcon({ filled }) {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
      <path
        d="M3 2.5h7l3 3v8H3z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Note icon (filled when a note exists) that opens the course note editor. */
export default function NotePopover({ courseKey, courseLabel, note, update }) {
  const [open, setOpen] = useState(false)
  const anchorRef = useRef(null)
  const hasNote = Boolean(note)

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={hasNote ? `Edit note for ${courseLabel}` : `Add note for ${courseLabel}`}
        aria-expanded={open}
        title={hasNote ? note : 'Add note'}
        className={`rounded p-1 hover:bg-gray-100 ${hasNote ? 'text-yale-800' : 'text-gray-300'}`}
      >
        <NoteIcon filled={hasNote} />
      </button>
      {open ? (
        <Popover
          anchorRef={anchorRef}
          onClose={() => setOpen(false)}
          width={320}
          label={`Note for ${courseLabel}`}
        >
          <textarea
            autoFocus
            rows={5}
            defaultValue={note ?? ''}
            onChange={(e) => update((s) => setNote(s, courseKey, e.target.value))}
            placeholder="Note"
            aria-label={`Note for ${courseLabel}`}
            className="w-full resize-y rounded border border-gray-200 px-2 py-1.5 text-xs leading-relaxed focus:border-yale-800 focus:outline-none"
          />
        </Popover>
      ) : null}
    </>
  )
}
