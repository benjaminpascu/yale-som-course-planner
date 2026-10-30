import { useEffect, useRef, useState } from 'react'

const CONTACT_EMAIL = 'benjamin.pascu@yale.edu'
const SLACK_HANDLE = 'benjamin.pascu'
const EMAIL_SUBJECT = 'Course Planner feedback'
const YALE_COURSE_LIST_URL = 'https://som.yale.edu/elective-core-courses'

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
        aria-label="Suggestions? Contact me"
        className="flex h-9 w-9 items-center justify-center gap-2 rounded-full border border-white/45 bg-transparent text-sm font-medium text-white hover:bg-white/10 sm:w-auto sm:px-3.5"
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
          className="h-4 w-4 shrink-0"
        >
          <path d="M4 4h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H10l-4 3.5V17H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" />
        </svg>
        <span className="hidden sm:inline">Suggestions? Contact me</span>
      </button>

      {open ? (
        <div
          id={menuId}
          role="dialog"
          aria-label="Contact"
          className="absolute right-0 top-full z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-lg border border-yale-200 bg-white p-4 text-sm text-yale-950 shadow-xl"
        >
          <p className="font-semibold">Suggestions or found a bug?</p>
          <p className="mt-1 text-gray-600">
            Made with love for the Yale community{' '}
            <span role="img" aria-label="blue heart">
              💙
            </span>
          </p>

          <div className="mt-4 space-y-3">
            <div>
              <p className="font-medium text-gray-500">Email</p>
              <div className="mt-0.5 flex items-center justify-between gap-2">
                <a
                  href={mailto}
                  className="truncate font-medium text-yale-700 underline underline-offset-2 hover:text-yale-900"
                >
                  {CONTACT_EMAIL}
                </a>
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="shrink-0 rounded border border-yale-200 px-2 py-0.5 font-medium text-yale-800 hover:bg-yale-50"
                >
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
            <div>
              <p className="font-medium text-gray-500">Slack</p>
              <p className="mt-0.5">
                Reach out to <span className="font-medium">{SLACK_HANDLE}</span>
              </p>
            </div>
          </div>

          <p className="mt-4 border-t border-yale-150 pt-3 text-gray-500">
            Course data:{' '}
            <a
              href={YALE_COURSE_LIST_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-yale-700 underline underline-offset-2 hover:text-yale-900"
            >
              Yale SOM Course List
            </a>
          </p>
        </div>
      ) : null}
    </div>
  )
}
