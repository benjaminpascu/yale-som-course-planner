const TABS = [
  { id: 'calendar', label: 'Calendar' },
  { id: 'catalog', label: 'Courses' },
  { id: 'plans', label: 'Plans' },
]

export default function MobileBottomNav({ activeTab, onChange }) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-yale-950 bg-yale-900 pb-[env(safe-area-inset-bottom)] lg:hidden"
      aria-label="Main"
    >
      <div className="grid grid-cols-3">
        {TABS.map((tab) => {
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-[3rem] flex-col items-center justify-center px-2 py-2 text-xs font-medium transition-colors ${
                active
                  ? 'bg-yale-800 text-white'
                  : 'text-yale-200 hover:bg-yale-800/60 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
