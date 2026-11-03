import ContactMenu from './ContactMenu'

const MODES = [
  { id: 'planner', label: 'Planner' },
  { id: 'compare', label: 'Compare' },
]

/**
 * Global navy bar, the same on every page: title, Planner | Compare tabs
 * (desktop; phones switch modes in the bottom nav), Help (shows the tips again), contact button.
 */
export default function NavBar({ mode, onModeChange, onShowTips }) {
  return (
    <header className="shrink-0 bg-yale-900 text-white">
      <div className="flex min-h-14 flex-wrap items-center gap-x-8 gap-y-2 px-4 sm:px-8">
        <h1 className="py-3 text-base font-bold">Yale SOM Course Planner</h1>
        <nav className="hidden self-stretch lg:flex" aria-label="Mode">
          {MODES.map((m) => {
            const active = m.id === mode
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onModeChange(m.id)}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center border-b-[3px] px-3 text-sm ${
                  active
                    ? 'border-white font-semibold text-white'
                    : 'border-transparent font-medium text-[#c9d6e8] hover:text-white'
                }`}
              >
                {m.label}
              </button>
            )
          })}
        </nav>
        <button
          type="button"
          onClick={onShowTips}
          title="Show tips again"
          className="flex items-center gap-1.5 text-sm font-medium text-[#c9d6e8] hover:text-white"
        >
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            className="h-5 w-5 shrink-0"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.4" />
            <circle cx="12" cy="17" r=".6" fill="currentColor" />
          </svg>
          <span className="hidden sm:inline">Help</span>
          <span className="sr-only sm:hidden">Help</span>
        </button>
        <div className="ml-auto">
          <ContactMenu />
        </div>
      </div>
    </header>
  )
}
