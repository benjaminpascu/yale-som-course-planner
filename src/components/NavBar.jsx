import ContactMenu from './ContactMenu'

const MODES = [
  { id: 'planner', label: 'Planner' },
  { id: 'compare', label: 'Compare' },
]

/**
 * Global navy bar, the same on every page: title, Planner | Compare tabs
 * (desktop; phones switch modes in the bottom nav), contact button.
 */
export default function NavBar({ mode, onModeChange }) {
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
        <div className="ml-auto">
          <ContactMenu />
        </div>
      </div>
    </header>
  )
}
