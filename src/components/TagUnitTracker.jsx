import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { buildTagsByCourseNumber } from '../lib/filterCourses'
import { sectionTone } from '../lib/sectionTheme'
import { formatCourseHeading } from '../lib/courseDisplay'
import { formatSessionLabel } from '../lib/sessionDisplay'
import {
  TOOLTIP_HIDE_DELAY_MS,
  basePortaledTooltipStyle,
  clampPortaledTooltipLeft,
} from '../lib/portaledTooltip'
import {
  configuredTargetTagCodes,
  formatRequirementProgress,
  loadRequirementTargets,
  persistRequirementTargets,
} from '../lib/requirementTargets'
import {
  computeTagUnitTotals,
  formatTagUnits,
} from '../lib/tagUnitTracker'
import CollapseChevron from './CollapseChevron'
import RequirementTag from './RequirementTag'
import RequirementTargetsModal from './RequirementTargetsModal'
import SectionHeader from './SectionHeader'

const REQUIREMENTS_SUBTITLE =
  'Progress toward unit targets for your selected plan. Hover a requirement for details.'

const EMPTY_HINT =
  'No requirements yet. Use Add requirements to set your targets.'

/** Fixed body height so tag rows never push the calendar layout. */
const REQUIREMENTS_BODY_CLASS =
  'flex h-[4.75rem] items-center overflow-x-hidden overflow-y-auto px-4'

function AddRequirementsButton({ onClick, inverse = false }) {
  const handleClick = (event) => {
    event.preventDefault()
    event.stopPropagation()
    onClick()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={
        inverse
          ? 'shrink-0 rounded border border-white/40 bg-white/10 px-2.5 py-1 text-xs font-medium text-white hover:bg-white/20'
          : 'shrink-0 rounded border border-yale-300 bg-white px-2.5 py-1 text-xs font-medium text-yale-900 hover:bg-yale-50'
      }
    >
      Add requirements
    </button>
  )
}

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

function RequirementTagItem({ row, fallYear, springYear }) {
  const tooltipId = useId()
  const anchorRef = useRef(null)
  const tooltipRef = useRef(null)
  const hideTimerRef = useRef(null)
  const hasContributors = row.contributors.length > 0
  const metTarget = row.totalUnits >= row.targetUnits
  const [tooltipOpen, setTooltipOpen] = useState(false)
  const [tooltipStyle, setTooltipStyle] = useState(null)

  const refreshTooltipStyle = useCallback(() => {
    if (!anchorRef.current) return
    setTooltipStyle(basePortaledTooltipStyle(anchorRef.current, { above: true }))
  }, [])

  const cancelHideTooltip = useCallback(() => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
  }, [])

  const openTooltip = useCallback(() => {
    if (!hasContributors || !anchorRef.current) return
    cancelHideTooltip()
    refreshTooltipStyle()
    setTooltipOpen(true)
  }, [cancelHideTooltip, hasContributors, refreshTooltipStyle])

  const scheduleHideTooltip = useCallback(() => {
    cancelHideTooltip()
    hideTimerRef.current = window.setTimeout(() => {
      setTooltipOpen(false)
      hideTimerRef.current = null
    }, TOOLTIP_HIDE_DELAY_MS)
  }, [cancelHideTooltip])

  useEffect(() => {
    if (!tooltipOpen) return
    const reposition = () => refreshTooltipStyle()
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    return () => {
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
    }
  }, [tooltipOpen, refreshTooltipStyle])

  useLayoutEffect(() => {
    if (!tooltipOpen || !anchorRef.current || !tooltipRef.current) return
    const left = clampPortaledTooltipLeft(anchorRef.current, tooltipRef.current)
    setTooltipStyle((prev) => {
      if (!prev || prev.left === left) return prev
      return { ...prev, left }
    })
  }, [tooltipOpen, row])

  useEffect(() => () => cancelHideTooltip(), [cancelHideTooltip])

  return (
    <>
      <li
        ref={anchorRef}
        className="relative min-w-0 self-start"
        tabIndex={hasContributors ? 0 : undefined}
        aria-describedby={hasContributors && tooltipOpen ? tooltipId : undefined}
        onMouseEnter={hasContributors ? openTooltip : undefined}
        onMouseLeave={hasContributors ? scheduleHideTooltip : undefined}
        onFocus={hasContributors ? openTooltip : undefined}
        onBlur={hasContributors ? scheduleHideTooltip : undefined}
      >
                <div className="flex min-w-0 items-start justify-between gap-2">
          <RequirementTag tagCode={row.tagCode} muted={row.totalUnits <= 0} />
          <span
            className={
              metTarget
                ? 'shrink-0 text-sm font-medium tabular-nums text-emerald-800'
                : row.totalUnits > 0
                  ? 'shrink-0 text-sm font-medium tabular-nums text-gray-900'
                  : 'shrink-0 text-sm tabular-nums text-gray-400'
            }
          >
            {formatRequirementProgress(row.totalUnits, row.targetUnits)}
          </span>
        </div>
      </li>

      {tooltipOpen && tooltipStyle && hasContributors
        ? createPortal(
            <div
              ref={tooltipRef}
              id={tooltipId}
              role="tooltip"
              className="overflow-y-auto rounded-lg border border-gray-200 bg-white p-3 text-left shadow-xl"
              style={tooltipStyle}
              onMouseEnter={openTooltip}
              onMouseLeave={scheduleHideTooltip}
            >
              <p className="mb-2 text-xs font-medium text-gray-700">
                Contributing courses
              </p>
              <ContributorTooltip
                groups={row.contributorGroups}
                fallYear={fallYear}
                springYear={springYear}
              />
            </div>,
            document.body,
          )
        : null}
    </>
  )
}

function RequirementsGrid({ rows, fallYear, springYear }) {
  if (rows.length === 0) {
    return (
      <div className={`${REQUIREMENTS_BODY_CLASS} justify-center text-center`}>
        <p className="whitespace-nowrap text-sm text-gray-600">{EMPTY_HINT}</p>
      </div>
    )
  }

  return (
    <div className={REQUIREMENTS_BODY_CLASS}>
      <ul className="grid w-full min-w-0 items-start gap-x-4 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {rows.map((row) => (
          <RequirementTagItem
            key={row.tagCode}
            row={row}
            fallYear={fallYear}
            springYear={springYear}
          />
        ))}
      </ul>
    </div>
  )
}

export default function TagUnitTracker({
  selectedCourses,
  tags,
  fallYear = null,
  springYear = null,
}) {
  const [targets, setTargets] = useState(() => loadRequirementTargets())
  const [modalOpen, setModalOpen] = useState(false)

  const tagsByCourseNumber = useMemo(
    () => buildTagsByCourseNumber(tags),
    [tags],
  )

  const totals = useMemo(
    () => computeTagUnitTotals(selectedCourses, tagsByCourseNumber),
    [selectedCourses, tagsByCourseNumber],
  )

  const visibleRows = useMemo(() => {
    const codes = new Set(configuredTargetTagCodes(targets))
    return totals
      .filter((row) => codes.has(row.tagCode))
      .map((row) => ({
        ...row,
        targetUnits: targets[row.tagCode],
      }))
  }, [totals, targets])

  const handleSaveTargets = (nextTargets) => {
    setTargets(nextTargets)
    persistRequirementTargets(nextTargets)
  }

  const reqTone = sectionTone('requirements')

  return (
    <>
      <section
        className={`hidden shrink-0 border-b lg:block ${reqTone.section}`}
        aria-label="Requirements"
      >
        <SectionHeader
          tone="requirements"
          title="Requirements"
          subtitle={REQUIREMENTS_SUBTITLE}
        >
          <AddRequirementsButton onClick={() => setModalOpen(true)} />
        </SectionHeader>
        <RequirementsGrid
          rows={visibleRows}
          fallYear={fallYear}
          springYear={springYear}
        />
      </section>

      <details className={`group shrink-0 border-b lg:hidden ${reqTone.section}`}>
        <summary
          className={`flex cursor-pointer list-none flex-col gap-0.5 border-b px-4 py-2.5 marker:content-none [&::-webkit-details-marker]:hidden ${reqTone.header}`}
        >
          <div className="flex items-center gap-2">
            <CollapseChevron />
            <span className="flex-1 text-sm font-semibold text-yale-950">
              Requirements
            </span>
            <AddRequirementsButton onClick={() => setModalOpen(true)} />
          </div>
          <p className="pl-6 text-xs text-yale-700">{REQUIREMENTS_SUBTITLE}</p>
        </summary>

        <RequirementsGrid
          rows={visibleRows}
          fallYear={fallYear}
          springYear={springYear}
        />
      </details>

      <RequirementTargetsModal
        open={modalOpen}
        targets={targets}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveTargets}
      />
    </>
  )
}
