import { useMemo } from 'react'
import { buildTagsByCourseNumber } from '../lib/filterCourses'
import { sectionTone } from '../lib/sectionTheme'
import { formatCourseHeading } from '../lib/courseDisplay'
import {
  computeTagUnitTotals,
  formatTagUnits,
} from '../lib/tagUnitTracker'
import CollapseChevron from './CollapseChevron'
import { TagDisclaimer } from './Disclaimer'
import RequirementTag from './RequirementTag'

function ContributorTooltip({ contributors }) {
  return (
    <ul className="space-y-1 text-xs">
      {contributors.map((c) => (
        <li key={c.courseNumber} className="truncate text-gray-900">
          {formatCourseHeading(c)}
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
    <details className={`group shrink-0 border-b ${reqTone.section}`} open>
      <summary
        className={`flex cursor-pointer list-none items-center gap-2 border-b px-4 py-3 text-sm font-semibold text-yale-950 marker:content-none [&::-webkit-details-marker]:hidden ${reqTone.header}`}
      >
        <CollapseChevron />
        <span className="flex-1">Requirements</span>
      </summary>

      <div className="border-b border-gray-200 px-4 py-2">
        <p className="text-xs text-yale-700">
          Units toward each Yale requirement tag from courses in your plan.
        </p>
      </div>

      <div className="px-4 py-3">
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {totals.map((row) => {
            const hasContributors = row.contributors.length > 0
            return (
              <li
                key={row.tagCode}
                className={`relative rounded-md border px-2.5 py-2 shadow-sm ${reqTone.inset}${
                  hasContributors
                    ? ' group/tag hover:border-yale-300 hover:shadow'
                    : ''
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <RequirementTag
                    tagCode={row.tagCode}
                    muted={row.totalUnits <= 0}
                  />
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

                {hasContributors ? (
                  <div
                    className="pointer-events-none absolute left-0 top-full z-20 mt-1 hidden w-72 rounded-md border border-gray-200 bg-white p-3 shadow-lg group-hover/tag:block"
                    role="tooltip"
                  >
                    <p className="mb-1.5 text-xs font-medium text-gray-700">
                      Contributing courses
                    </p>
                    <ContributorTooltip contributors={row.contributors} />
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>

        <TagDisclaimer className="mt-2" />
      </div>
    </details>
  )
}
