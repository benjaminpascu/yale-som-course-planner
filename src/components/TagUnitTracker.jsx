import { useMemo } from 'react'
import { buildTagsByCourseNumber } from '../lib/filterCourses'
import { sectionTone } from '../lib/sectionTheme'
import { formatCourseHeading } from '../lib/courseDisplay'
import { formatSessionLabel } from '../lib/sessionDisplay'
import {
  computeTagUnitTotals,
  formatTagUnits,
  getSemesterBreakdownLines,
} from '../lib/tagUnitTracker'
import CollapseChevron from './CollapseChevron'
import { TagDisclaimer } from './Disclaimer'
import RequirementTag from './RequirementTag'

function ContributorTooltip({ groups, fallYear, springYear }) {
  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <div key={group.session}>
          <p className="text-xs font-medium text-gray-700">
            {formatSessionLabel(group.session, { fallYear, springYear })}
            {' — '}
            <span className="tabular-nums">{formatTagUnits(group.units)}</span>
          </p>
          <ul className="mt-1.5 space-y-1 border-l-2 border-gray-200 pl-3 text-xs">
            {group.contributors.map((c) => (
              <li key={c.courseNumber} className="text-gray-900">
                {formatCourseHeading(c)}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

export default function TagUnitTracker({
  selectedCourses,
  tags,
  fallYear = null,
  springYear = null,
}) {
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
    <details className={`group shrink-0 border-b ${reqTone.section}`}>
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
            const semesterLines = getSemesterBreakdownLines(row.bySemester, {
              fallYear,
              springYear,
            })
            return (
              <li
                key={row.tagCode}
                className={`relative rounded-md border px-2.5 py-2 shadow-sm ${reqTone.inset}${
                  hasContributors
                    ? ' group/tag hover:border-yale-300 hover:shadow'
                    : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <RequirementTag
                    tagCode={row.tagCode}
                    muted={row.totalUnits <= 0}
                  />
                  <div className="flex shrink-0 flex-col items-end gap-0.5">
                    <span
                      className={
                        row.totalUnits > 0
                          ? 'text-sm font-medium tabular-nums text-gray-900'
                          : 'text-sm tabular-nums text-gray-400'
                      }
                    >
                      {formatTagUnits(row.totalUnits)}
                    </span>
                    {semesterLines ? (
                      <div className="flex flex-col items-end gap-0.5 text-[10px] leading-tight tabular-nums text-gray-500">
                        {semesterLines.map((line) => (
                          <span key={line.key} className="whitespace-nowrap">
                            {line.text}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>

                {hasContributors ? (
                  <div
                    className="pointer-events-none absolute right-0 top-full z-20 mt-1 hidden w-max min-w-[22rem] max-w-[min(36rem,calc(100vw-2rem))] rounded-md border border-gray-200 bg-white p-3 shadow-lg group-hover/tag:block"
                    role="tooltip"
                  >
                    <p className="mb-2 text-xs font-medium text-gray-700">
                      Contributing courses
                    </p>
                    <ContributorTooltip
                      groups={row.contributorGroups}
                      fallYear={fallYear}
                      springYear={springYear}
                    />
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
