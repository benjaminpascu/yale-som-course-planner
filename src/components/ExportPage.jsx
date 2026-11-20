import { useEffect, useMemo, useState } from 'react'
import {
  downloadExportWorkbook,
  planCourses,
  safeFileName,
  sortCourses,
  tagNames,
} from '../lib/devExport'
import { loadBiddingHistoryCsv } from '../lib/loadData'
import { pickerSchools, SOM_SCHOOL } from '../lib/schools'

const BUTTON =
  'rounded-md bg-yale-700 px-4 py-2 text-sm font-medium text-white hover:bg-yale-900 disabled:cursor-not-allowed disabled:opacity-50'

/**
 * Owner-only page at ?export: download a saved plan's courses, or one school's (or
 * every) course, as Excel with a Bidding sheet first.
 */
export default function ExportPage({ courses, otherStatus, plans }) {
  const [planId, setPlanId] = useState(plans[0]?.id ?? '')
  const coursesById = useMemo(() => new Map(courses.map((c) => [c.courseId, c])), [courses])
  const plan = plans.find((p) => p.id === planId)
  const [biddingCsvText, setBiddingCsvText] = useState(null)
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    loadBiddingHistoryCsv().then(setBiddingCsvText, () => setBiddingCsvText(''))
  }, [])
  const loading = otherStatus === 'loading'
  const busy = loading || biddingCsvText == null || saving
  const [school, setSchool] = useState('')
  const schools = useMemo(() => pickerSchools(courses, null), [courses])
  // Same tag columns in every file, even when a plan has no STEM course.
  const tags = useMemo(() => tagNames(courses), [courses])
  const schoolCourses = school
    ? courses.filter((c) => (c.school || SOM_SCHOOL) === school)
    : courses

  async function save(fileName, list) {
    setSaving(true)
    try {
      await downloadExportWorkbook(fileName, { courses: list, tags, biddingCsvText })
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-dvh bg-gray-50">
      <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-10 text-yale-950">
        <h2 className="text-2xl font-semibold">Export</h2>

        <section className="rounded-lg border border-yale-150 bg-white px-5 py-4">
          <h3 className="font-semibold">Plan</h3>
          {plans.length === 0 ? (
            <p className="mt-2 text-sm text-gray-500">No saved plans in this browser.</p>
          ) : (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <select
                value={planId}
                onChange={(e) => setPlanId(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.courseIds.length})
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={BUTTON}
                disabled={!plan || busy}
                onClick={() =>
                  save(safeFileName(plan.name), planCourses(plan, coursesById))
                }
              >
                Export plan (Excel)
              </button>
            </div>
          )}
        </section>

        <section className="rounded-lg border border-yale-150 bg-white px-5 py-4">
          <h3 className="font-semibold">Course list</h3>
          <p className="mt-1 text-sm text-gray-500">
            {loading
              ? 'Loading courses from other Yale schools…'
              : `${schoolCourses.length.toLocaleString()} sections, every semester`}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <select
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">All schools</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className={BUTTON}
              disabled={busy}
              onClick={() =>
                save(
                  school
                    ? `${safeFileName(schools.find((s) => s.id === school).label)}-courses`
                    : 'all-courses',
                  sortCourses(schoolCourses),
                )
              }
            >
              Export list (Excel)
            </button>
          </div>
        </section>
      </div>
    </main>
  )
}
