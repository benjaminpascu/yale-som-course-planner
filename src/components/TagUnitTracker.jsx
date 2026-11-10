import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { sectionTone } from '../lib/sectionTheme'
import { formatTermLabel, termCodeToSemester } from '../lib/academicYear'
import { formatCourseHeading } from '../lib/courseDisplay'
import { formatSessionLabel } from '../lib/sessionDisplay'
import {
  TOOLTIP_HIDE_DELAY_MS,
  basePortaledTooltipStyle,
  clampPortaledTooltipLeft,
  getViewportBottomInsetPx,
} from '../lib/portaledTooltip'
import { formatRequirementProgress } from '../lib/requirementTargets'
import {
  loadRequirementSettings,
  persistRequirementSettings,
  requirementRows,
} from '../lib/requirementSettings'
import { uniqueRequirementTags } from '../lib/requirementTags'
import { formatTagUnits } from '../lib/tagUnitTracker'
import RequirementTag from './RequirementTag'
import RequirementSettingsModal from './RequirementSettingsModal'
import SectionHeader from './SectionHeader'

const EMPTY_HINT = 'Nothing selected'

/** Desktop: fixed body height so tag rows never push the calendar layout. Mobile: auto height. */
const REQUIREMENTS_BODY_CLASS =
  'flex px-4 py-2 lg:h-[4.75rem] lg:items-center lg:overflow-x-hidden lg:overflow-y-auto lg:py-0'

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
      Select Requirements
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
  const hasTarget = row.targetUnits != null && row.targetUnits > 0
  const metTarget = hasTarget && row.totalUnits >= row.targetUnits
  const [tooltipOpen, setTooltipOpen] = useState(false)
  const [tooltipStyle, setTooltipStyle] = useState(null)

  const refreshTooltipStyle = useCallback(() => {
    if (!anchorRef.current) return
    setTooltipStyle(
      basePortaledTooltipStyle(anchorRef.current, { above: true }),
    )
  }, [])

  const cancelHideTooltip = useCallback(() => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
  }, [])

  const handleTagClick = useCallback(
    (event) => {
      if (!hasContributors) return
      if (!window.matchMedia('(max-width: 1023px)').matches) return
      event.stopPropagation()
      cancelHideTooltip()
      if (tooltipOpen) {
        setTooltipOpen(false)
        return
      }
      refreshTooltipStyle()
      setTooltipOpen(true)
    },
    [cancelHideTooltip, hasContributors, refreshTooltipStyle, tooltipOpen],
  )

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
    const anchor = anchorRef.current
    const tooltip = tooltipRef.current
    const left = clampPortaledTooltipLeft(anchor, tooltip)
    const tooltipRect = tooltip.getBoundingClientRect()
    const maxBottom = window.innerHeight - getViewportBottomInsetPx() - 16

    setTooltipStyle((prev) => {
      if (!prev) return prev
      let bottom = prev.bottom
      if (tooltipRect.bottom > maxBottom && typeof bottom === 'number') {
        bottom = bottom + (tooltipRect.bottom - maxBottom)
      }
      if (left === prev.left && bottom === prev.bottom) return prev
      return { ...prev, left, bottom }
    })
  }, [tooltipOpen, row])

  useEffect(() => () => cancelHideTooltip(), [cancelHideTooltip])

  const unitsLabel = hasTarget
    ? formatRequirementProgress(row.totalUnits, row.targetUnits)
    : formatTagUnits(row.totalUnits)

  return (
    <>
      <li
        ref={anchorRef}
        className="relative min-w-0 self-start"
        tabIndex={hasContributors ? 0 : undefined}
        aria-describedby={hasContributors && tooltipOpen ? tooltipId : undefined}
        onClick={handleTagClick}
        onMouseEnter={hasContributors ? openTooltip : undefined}
        onMouseLeave={hasContributors ? scheduleHideTooltip : undefined}
        onFocus={hasContributors ? openTooltip : undefined}
        onBlur={hasContributors ? scheduleHideTooltip : undefined}
      >
        <div className="flex min-w-0 items-center gap-2">
          {row.isTotal ? (
            // Plain outlined chip, so Total never reads as a requirement tag.
            <span className="inline-flex shrink-0 items-center rounded border border-gray-300 px-1.5 py-0.5 text-xs font-semibold leading-tight text-gray-700">
              {row.label}
            </span>
          ) : (
            <RequirementTag tagCode={row.tagCode} />
          )}
          <span
            className={
              metTarget
                ? 'shrink-0 text-sm font-medium tabular-nums text-emerald-800'
                : row.totalUnits > 0
                  ? 'shrink-0 text-sm font-medium tabular-nums text-gray-900'
                  : 'shrink-0 text-sm tabular-nums text-gray-400'
            }
          >
            {unitsLabel}
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
      {/* Each label sits right beside its units; the space goes between items instead. */}
      <ul className="flex w-full min-w-0 flex-wrap items-center gap-x-10 gap-y-1.5">
        {rows.map((row) => (
          <RequirementTagItem
            key={row.isTotal ? `__${row.label}` : row.tagCode}
            row={row}
            fallYear={fallYear}
            springYear={springYear}
          />
        ))}
      </ul>
    </div>
  )
}

const SETTINGS_CHANGED_EVENT = 'requirement-settings-changed'

export default function TagUnitTracker({
  selectedCourses,
  termCode = null,
  courses = [],
  fallYear = null,
  springYear = null,
  // Compare Plans: one full-width header ('header') above each plan's units ('rows').
  part = 'all',
}) {
  const tagNames = useMemo(() => uniqueRequirementTags(courses), [courses])
  const [settings, setSettings] = useState(() => loadRequirementSettings(tagNames))
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    setSettings(loadRequirementSettings(tagNames))
    // Compare Plans shows two trackers; choices made in one show in the other.
    const reload = () => setSettings(loadRequirementSettings(tagNames))
    window.addEventListener(SETTINGS_CHANGED_EVENT, reload)
    return () => window.removeEventListener(SETTINGS_CHANGED_EVENT, reload)
  }, [tagNames])

  // Semester Total and requirements count the semester picked with the Fall/Spring
  // switch; Year Total counts the whole plan. Only ticked lines show.
  const semester = termCodeToSemester(termCode) ?? 'fall'
  const visibleRows = useMemo(
    () => requirementRows({ planCourses: selectedCourses, semester, tagNames, settings }),
    [selectedCourses, semester, tagNames, settings],
  )

  const handleSaveSettings = (next) => {
    setSettings(next)
    persistRequirementSettings(next, tagNames)
    window.dispatchEvent(new Event(SETTINGS_CHANGED_EVENT))
  }

  const reqTone = sectionTone('requirements')

  return (
    <>
      <section
        // The header-only bar (Compare plans) has no bottom line of its own, so it looks like single view.
        className={`shrink-0 ${part === 'header' ? '' : 'border-b'} ${reqTone.section}`}
        aria-label="Requirements"
      >
        {part === 'rows' ? null : (
          <SectionHeader
            tone="requirements"
            title={termCode ? `Requirements · ${formatTermLabel(termCode)}` : 'Requirements'}
          >
            <AddRequirementsButton onClick={() => setModalOpen(true)} />
          </SectionHeader>
        )}
        {part === 'header' ? null : (
          <RequirementsGrid
            rows={visibleRows}
            fallYear={fallYear}
            springYear={springYear}
          />
        )}
      </section>

      {part === 'rows' ? null : (
        <RequirementSettingsModal
          open={modalOpen}
          settings={settings}
          tagNames={tagNames}
          onClose={() => setModalOpen(false)}
          onSave={handleSaveSettings}
        />
      )}
    </>
  )
}
