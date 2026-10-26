import { useEffect, useRef, useState } from 'react'

const CONTACT_NAME = 'Benjamin Pascu'
const CONTACT_EMAIL = 'benjamin.pascu@yale.edu'
const SLACK_HANDLE = '@benjamin.pascu'
const EMAIL_SUBJECT = 'Course Planner feedback'

export default function ContactMenu() {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
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

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])

  async function handleCopyEmail() {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL)
      setCopied(true)
    } catch {
      // Clipboard can be blocked; the address is still visible to copy by hand.
    }
  }

  const menuId = 'contact-menu-panel'
  const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(EMAIL_SUBJECT)}`

  return (
    <div ref={rootRef} className="relative flex shrink-0">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? menuId : undefined}
        className="flex items-center gap-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-yale-900 shadow-sm hover:bg-yale-50"
      >
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-4 w-4 shrink-0"
        >
          <path
            fillRule="evenodd"
            d="M3.43 2.524A41.29 41.29 0 0 1 10 2c2.236 0 4.43.18 6.57.524 1.437.231 2.43 1.49 2.43 2.902v5.148c0 1.413-.993 2.67-2.43 2.902a41.202 41.202 0 0 1-5.183.501.78.78 0 0 0-.528.224l-3.579 3.58A.75.75 0 0 1 6 17.25v-3.443a41.033 41.033 0 0 1-2.57-.33C1.993 13.244 1 11.986 1 10.573V5.426c0-1.413.993-2.67 2.43-2.902Z"
            clipRule="evenodd"
          />
        </svg>
        <span className="sm:hidden">Contact</span>
        <span className="hidden sm:inline">Suggestions? Contact me</span>
      </button>

      {open ? (
        <div
          id={menuId}
          role="dialog"
          aria-label="Contact"
          className="absolute right-0 top-full z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-lg border border-yale-200 bg-white p-4 text-yale-950 shadow-xl"
        >
          <p className="text-sm font-semibold">Suggestions or found a bug?</p>
          <p className="mt-1 text-xs text-gray-600">
            This planner is built by {CONTACT_NAME}. Ideas for new features or
            fixes are very welcome.
          </p>

          <div className="mt-3 space-y-3 text-sm">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Email
              </p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <a
                  href={mailto}
                  className="truncate font-medium text-yale-700 underline underline-offset-2 hover:text-yale-900"
                >
                  {CONTACT_EMAIL}
                </a>
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="shrink-0 rounded border border-yale-200 px-2 py-0.5 text-xs font-medium text-yale-800 hover:bg-yale-50"
                >
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Slack
              </p>
              <p className="mt-1">
                Message <span className="font-medium">{SLACK_HANDLE}</span> on
                Slack
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
