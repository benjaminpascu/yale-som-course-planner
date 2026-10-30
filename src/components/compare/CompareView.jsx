import { useCallback, useMemo, useState } from 'react'
import { buildCourseGroups } from '../../lib/compareGroups'
import { toggleSelected } from '../../lib/compareStorage'
import CourseBrowser from '../CourseBrowser'
import SectionHeader from '../SectionHeader'

function RecoveredNotice({ onDismiss }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900">
      <span>
        Your saved comparison couldn&apos;t be read. A backup was kept in this
        browser.
      </span>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 rounded border border-amber-300 bg-white px-2 py-0.5 font-medium hover:bg-amber-100"
      >
        Dismiss
      </button>
    </div>
  )
}

function ComparePanel({ selectedGroups, emptyMessage }) {
  return (
    <section className="flex h-full min-h-0 flex-col bg-white">
      <SectionHeader tone="calendar" title="Compare courses" />
      <div className="min-h-0 flex-1 overflow-auto">
        {selectedGroups.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-gray-500">
            {emptyMessage}
          </p>
        ) : (
          <ul className="divide-y divide-gray-100 text-xs">
            {selectedGroups.map((g) => (
              <li key={g.key} className="px-4 py-2">
                {g.courseNumber} — {g.title}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

/**
 * Compare Courses: the planner's catalog sidebar (tick mode) on the left and
 * the comparison on the right. Mobile switches between the two.
 */
export default function CompareView({
  compare,
  courses,
  terms,
  termCode,
  onTermChange,
  fallYear,
  springYear,
  variant = 'desktop',
}) {
  const { store, update, recovered, dismissRecovered } = compare
  const [mobileStep, setMobileStep] = useState('table')

  const termCourses = useMemo(
    () => courses.filter((c) => c.termCode === termCode),
    [courses, termCode],
  )
  const groups = useMemo(() => buildCourseGroups(termCourses), [termCourses])
  const groupByKey = useMemo(
    () => new Map(groups.map((g) => [g.key, g])),
    [groups],
  )

  const selectedGroups = useMemo(
    () =>
      (store.selected[termCode] ?? [])
        .map((key) => groupByKey.get(key))
        .filter(Boolean),
    [store.selected, termCode, groupByKey],
  )
  const selectedKeys = useMemo(
    () => new Set(selectedGroups.map((g) => g.key)),
    [selectedGroups],
  )

  const toggleKey = useCallback(
    (key) => update((s) => toggleSelected(s, termCode, key)),
    [update, termCode],
  )

  const browser = (
    <CourseBrowser
      courses={courses}
      mode="compare"
      compareSelectedKeys={selectedKeys}
      onToggleCompareKey={toggleKey}
      fallYear={fallYear}
      springYear={springYear}
      terms={terms}
      termCode={termCode}
      onTermChange={onTermChange}
      fullHeight={variant === 'mobile'}
    />
  )

  const notice = recovered ? <RecoveredNotice onDismiss={dismissRecovered} /> : null

  if (variant === 'mobile') {
    if (mobileStep === 'add') {
      return (
        <div className="flex h-full min-h-0 flex-col pb-14">
          {notice}
          <div className="min-h-0 flex-1">{browser}</div>
          <div className="fixed inset-x-0 bottom-[calc(3rem+env(safe-area-inset-bottom))] z-40 border-t border-gray-200 bg-white p-2">
            <button
              type="button"
              onClick={() => setMobileStep('table')}
              className="w-full rounded-md bg-yale-800 px-3 py-2 text-sm font-semibold text-white hover:bg-yale-900"
            >
              Done
            </button>
          </div>
        </div>
      )
    }
    return (
      <div className="flex h-full min-h-0 flex-col pb-14">
        {notice}
        <div className="min-h-0 flex-1">
          <ComparePanel
            selectedGroups={selectedGroups}
            emptyMessage="Add courses to compare them."
          />
        </div>
        <div className="fixed inset-x-0 bottom-[calc(3rem+env(safe-area-inset-bottom))] z-40 border-t border-gray-200 bg-white p-2">
          <button
            type="button"
            onClick={() => setMobileStep('add')}
            className="w-full rounded-md border border-yale-300 bg-white px-3 py-2 text-sm font-semibold text-yale-900 hover:bg-yale-50"
          >
            + Add courses
          </button>
        </div>
      </div>
    )
  }

  return (
    <main className="grid min-h-0 w-full flex-1 grid-cols-[22rem_minmax(0,1fr)] overflow-hidden bg-white">
      <aside className="flex min-h-0 flex-col overflow-hidden border-r-2 border-yale-600">
        {browser}
      </aside>
      <section className="flex min-h-0 flex-col overflow-hidden">
        {notice}
        <div className="min-h-0 flex-1">
          <ComparePanel
            selectedGroups={selectedGroups}
            emptyMessage="Tick courses on the left to compare them."
          />
        </div>
      </section>
    </main>
  )
}
