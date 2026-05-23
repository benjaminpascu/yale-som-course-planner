import { useMemo } from 'react'
import { buildTagsByCourseNumber } from '../lib/filterCourses'
import { sectionTone } from '../lib/sectionTheme'
import {
  computeTagUnitTotals,
  formatTagUnits,
} from '../lib/tagUnitTracker'
import SectionHeader from './SectionHeader'

function ContributorTooltip({ contributors }) {
  if (contributors.length === 0) {
    return (
      <p className="text-xs text-gray-500">
        No courses in your plan carry this tag.
      </p>
    )
  }

  return (
    <ul className="space-y-1 text-xs">
      {contributors.map((c) => (
        <li key={c.courseNumber}>
          <span className="font-medium text-gray-900">{c.courseNumber}</span>
          <span className="text-gray-600"> — {formatTagUnits(c.units)}</span>
          <p className="truncate text-gray-500">{c.title}</p>
        </li>
      ))}
    </ul>
  )
}

export default function TagUnitTracker({ selectedCourses, tags }) {
  const tagsByCourseNumber = useMemo(
    () => buildTagsByCourseNumber(tags),
    [tags],
  )

  const totals = useMemo(
    () => computeTagUnitTotals(selectedCourses, tagsByCourseNumber),
    [selectedCourses, tagsByCourseNumber],
  )

  const reqTone = sectionTone('requirements')

  return (
    <section className={`shrink-0 border-b ${reqTone.section}`}>
      <SectionHeader
        tone="requirements"
        title="Requirements"
        subtitle="Units toward each Yale requirement tag from courses in your plan."
      />

      <div className="px-4 py-3">
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {totals.map((row) => (
          <li
            key={row.tagCode}
            className={`group relative rounded-md border px-2.5 py-2 shadow-sm ${reqTone.inset} hover:border-yale-300 hover:shadow`}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span
                className={
                  row.totalUnits > 0
                    ? 'text-sm text-gray-900'
                    : 'text-sm text-gray-500'
                }
              >
                {row.label}
              </span>
              <span
                className={
                  row.totalUnits > 0
                    ? 'shrink-0 text-sm font-medium tabular-nums text-gray-900'
                    : 'shrink-0 text-sm tabular-nums text-gray-400'
                }
              >
                {formatTagUnits(row.totalUnits)}
              </span>
            </div>

            <div
              className="pointer-events-none absolute left-0 top-full z-20 mt-1 hidden w-72 rounded-md border border-gray-200 bg-white p-3 shadow-lg group-hover:block"
              role="tooltip"
            >
              <p className="mb-1.5 text-xs font-medium text-gray-700">
                Contributing courses
              </p>
              <ContributorTooltip contributors={row.contributors} />
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-2 text-xs text-amber-900/90">
        Tags are student-maintained. Verify requirements with your advisor.
      </p>
      </div>
    </section>
  )
}
