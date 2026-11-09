const SEEN_KEY = 'computerNoticeSeen'

/** True until the student taps "Continue anyway" during this visit (shows again on the next visit). */
export function shouldShowComputerNotice() {
  try {
    return sessionStorage.getItem(SEEN_KEY) !== '1'
  } catch {
    return true
  }
}

function rememberComputerNoticeSeen() {
  try {
    sessionStorage.setItem(SEEN_KEY, '1')
  } catch {
    // Private mode etc.: the note just shows again next time.
  }
}

/**
 * Full-screen "Best on a computer" message, phone layout only (hidden from the `lg`
 * breakpoint up). Students can still continue on the phone.
 */
export default function ComputerNotice({ onContinue }) {
  const handleContinue = () => {
    rememberComputerNoticeSeen()
    onContinue()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="computer-notice-title"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-yale-800 px-8 text-center text-white lg:hidden"
    >
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-16 w-16 text-yale-200"
      >
        <rect x="4" y="5" width="16" height="11" rx="1.5" />
        <path d="M2 19h20" />
      </svg>
      <div className="space-y-2">
        <h2 id="computer-notice-title" className="text-2xl font-semibold">
          Best on a computer
        </h2>
        <p className="mx-auto max-w-xs text-base text-yale-150">
          Open this page on your laptop to plan your courses.
        </p>
      </div>
      <button
        type="button"
        onClick={handleContinue}
        className="mt-2 h-12 w-full max-w-xs rounded-lg border-[1.5px] border-yale-200 text-base font-medium text-white hover:bg-white/10 active:bg-white/20"
      >
        Continue on phone anyway
      </button>
    </div>
  )
}
