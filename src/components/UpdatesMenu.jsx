import { useEffect, useRef, useState } from 'react'
import { APP_VERSION, UPDATES, formatUpdateDate, hasUnseenUpdate, markUpdatesSeen } from '../lib/updates'

/** Updates button in the top bar: patch notes pop-up, with a dot until the newest update is opened. */
export default function UpdatesMenu() {
  const [open, setOpen] = useState(false)
  const [unseen, setUnseen] = useState(() => hasUnseenUpdate())
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return

    function handleKeyDown(event) {
      if (event.key === 'Escape') setOpen(false)
    }

    function handlePointerDown(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    document.addEventListener('pointerdown', handlePointerDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [open])

  function handleToggle() {
    if (!open && unseen) {
      markUpdatesSeen()
      setUnseen(false)
    }
    setOpen((prev) => !prev)
  }

  const menuId = 'updates-menu-panel'

  return (
    <div ref={rootRef} className="relative flex">
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? menuId : undefined}
        title="What's new"
        className="flex items-center gap-1.5 text-sm font-medium text-[#c9d6e8] hover:text-white"
      >
        <span className="relative shrink-0">
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
            className="h-5 w-5"
          >
            <path d="M12 3.5c.5 3.9 2.6 6 6.5 6.5-3.9.5-6 2.6-6.5 6.5-.5-3.9-2.6-6-6.5-6.5 3.9-.5 6-2.6 6.5-6.5z" />
            <path d="M18.5 15.5c.2 1.6 1 2.4 2.5 2.5-1.5.2-2.3 1-2.5 2.5-.2-1.5-1-2.3-2.5-2.5 1.5-.1 2.3-.9 2.5-2.5z" />
          </svg>
          {unseen ? (
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-yale-900 bg-amber-400" />
          ) : null}
        </span>
        <span className="hidden sm:inline">Updates</span>
        <span className="sr-only sm:hidden">Updates</span>
        {unseen ? <span className="sr-only">(new)</span> : null}
      </button>

      {open ? (
        <div
          id={menuId}
          role="dialog"
          aria-label="Updates"
          className="absolute left-0 top-full z-50 mt-3 max-h-[min(28rem,calc(100vh-6rem))] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto rounded-lg border border-yale-200 bg-white p-4 text-sm text-yale-950 shadow-xl"
        >
          <div className="flex items-baseline justify-between">
            <p className="text-base font-semibold">Updates</p>
            <p className="text-xs text-gray-500">v{APP_VERSION}</p>
          </div>
          <ol className="mt-3 space-y-3">
            {UPDATES.map((update) => (
              <li key={update.version}>
                <p className="font-semibold">
                  {update.version}{' '}
                  <span className="font-normal text-gray-500">
                    · {update.date ? formatUpdateDate(update.date) : update.label}
                  </span>
                </p>
                {update.changes.length > 0 ? (
                  <ul className="mt-1 list-disc space-y-1 pl-5 leading-snug">
                    {update.changes.map((change) => (
                      <li key={change}>{change}</li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  )
}
