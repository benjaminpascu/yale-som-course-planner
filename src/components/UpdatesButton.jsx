import { useEffect, useState } from 'react'
import { hasUnseenUpdate, markUpdatesSeen } from '../lib/updates'

/** Updates button in the top bar: opens /updates; a dot until the newest update has been seen. */
export default function UpdatesButton({ active = false, onClick }) {
  const [unseen, setUnseen] = useState(() => hasUnseenUpdate())

  // Seeing the Updates page (from the button or a direct link) clears the dot.
  useEffect(() => {
    if (!active) return
    markUpdatesSeen()
    setUnseen(false)
  }, [active])

  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      title="What's new"
      className={`flex items-center gap-1.5 text-sm font-medium hover:text-white ${
        active ? 'text-white' : 'text-[#c9d6e8]'
      }`}
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
  )
}
