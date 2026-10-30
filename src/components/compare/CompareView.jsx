import { useCallback, useMemo, useState } from 'react'
import { buildCourseGroups } from '../../lib/compareGroups'
import { toggleSelected } from '../../lib/compareStorage'
import CourseBrowser from '../CourseBrowser'
import SectionHeader from '../SectionHeader'
import CompareTable from './CompareTable'
import CourseDetailModal from './CourseDetailModal'
import SetupPanel from './SetupPanel'

const HEADER_BUTTON =
  'shrink-0 rounded border border-yale-300 bg-white px-2.5 py-1 text-xs font-medium text-yale-900 hover:bg-yale-50 disabled:cursor-not-allowed disabled:opacity-50'

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

function ComparePanel({
  courses,
  selectedGroups,
  emptyMessage,
  store,
  update,
  saveFailed,
  fallYear,
  springYear,
}) {
  const [detailGroup, setDetailGroup] = useState(null)
  const [setupOpen, setSetupOpen] = useState(false)
  const comparedProfessors = useMemo(
    () => [...new Set(selectedGroups.flatMap((g) => g.professors))],
    [selectedGroups],
  )

  return (
    <section className="flex h-full min-h-0 flex-col bg-white">
      <SectionHeader tone="calendar" title="Compare courses">
        <div className="flex gap-2">
          <button type="button" onClick={() => setSetupOpen(true)} className={HEADER_BUTTON}>
            Set up
          </button>
        </div>
      </SectionHeader>
      <div className="min-h-0 flex-1 overflow-auto">
        {selectedGroups.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-gray-500">
            {emptyMessage}
          </p>
        ) : (
          <CompareTable
            groups={selectedGroups}
            store={store}
            update={update}
            onOpenDetails={setDetailGroup}
          />
        )}
        <p
          className={`px-4 py-3 text-[11px] ${
            saveFailed ? 'font-medium text-red-700' : 'text-gray-400'
          }`}
        >
          {saveFailed
            ? "Couldn't save — export to Excel to keep a copy."
            : 'Saved in this browser only.'}
        </p>
      </div>
      <SetupPanel
        open={setupOpen}
        onClose={() => setSetupOpen(false)}
        store={store}
        update={update}
        allCourses={courses}
        comparedProfessors={comparedProfessors}
      />
      {detailGroup ? (
        <CourseDetailModal
          group={detailGroup}
          fallYear={fallYear}
          springYear={springYear}
          onClose={() => setDetailGroup(null)}
        />
      ) : null}
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
  const { store, update, saveFailed, recovered, dismissRecovered } = compare
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

  const panelProps = {
    courses,
    selectedGroups,
    store,
    update,
    saveFailed,
    fallYear,
    springYear,
  }

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
            {...panelProps}
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
            {...panelProps}
            emptyMessage="Tick courses on the left to compare them."
          />
        </div>
      </section>
    </main>
  )
}
