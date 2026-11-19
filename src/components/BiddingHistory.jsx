import {
  Fragment,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import CautionFlag from './CautionFlag'
import { isSomCourse } from '../lib/schools'
import {
  BIDDING_DISCLAIMER,
  biddingColor,
  formatPoints,
  getBiddingGrid,
  getBiddingRounds,
  parseBiddingCsv,
  sectionsFor,
  showsBiddingHistory,
} from '../lib/biddingHistory'
import { loadBiddingHistoryCsv } from '../lib/loadData'
import {
  TOOLTIP_HIDE_DELAY_MS,
  basePortaledTooltipStyle,
  clampPortaledTooltipLeft,
} from '../lib/portaledTooltip'

/** Loaded once in the background, shared by every course row. */
let historyPromise = null
function useBiddingHistory() {
  const [history, setHistory] = useState(null)
  useEffect(() => {
    let active = true
    historyPromise ??= loadBiddingHistoryCsv().then(parseBiddingCsv)
    historyPromise.then((map) => active && setHistory(map)).catch(() => {})
    return () => {
      active = false
    }
  }, [])
  return history
}

/**
 * Sections offered per semester (`buildSectionIndex`), provided once by App.jsx so
 * the course popup can give every current section a column.
 */
export const CourseSectionsContext = createContext(null)

/**
 * The four rounds for a course; null when it has no past results; undefined
 * while the bidding file is still loading.
 */
export function useBiddingRounds(course) {
  const history = useBiddingHistory()
  if (!history) return undefined
  const rounds = getBiddingRounds(course, history)
  return showsBiddingHistory(course, rounds) ? rounds : null
}

const Swatch = ({ points, className = '' }) => (
  <span
    className={`inline-block shrink-0 rounded-[2px] ring-1 ring-black/20 ring-inset ${className}`}
    style={{ backgroundColor: biddingColor(points) }}
  />
)

/** Rounds come as [R1, R2] per semester; one table row per semester. */
function RoundsTable({ rounds }) {
  const terms = []
  for (let i = 0; i < rounds.length; i += 2) {
    terms.push({ term: rounds[i].label.replace(/^Round 1, /, ''), cells: rounds.slice(i, i + 2) })
  }
  return (
    <table className="w-full border-collapse text-xs">
      <thead>
        <tr className="border-b border-gray-200 text-[11px] text-gray-500">
          <th className="py-1 pr-4 text-left font-medium" />
          <th className="px-2 py-1 text-left font-medium">
            Round 1
          </th>
          <th className="py-1 pl-2 text-left font-medium">
            Round 2
          </th>
        </tr>
      </thead>
      <tbody>
        {terms.map(({ term, cells }) => (
          <tr key={term} className="border-b border-gray-100 last:border-b-0">
            <th
              scope="row"
              className="py-1.5 pr-4 text-left font-medium whitespace-nowrap text-gray-900"
            >
              {term}
            </th>
            {cells.map((cell, i) => (
              <td
                key={cell.label}
                className={`py-1.5 whitespace-nowrap ${i === 0 ? 'px-2' : 'pl-2'}`}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Swatch points={cell.points} className="size-2.5" />
                  {cell.points == null ? (
                    <span className="text-gray-400">No data</span>
                  ) : (
                    <span className="font-medium tabular-nums text-gray-900">
                      {formatPoints(cell.points, { short: true })}
                    </span>
                  )}
                </span>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/**
 * Width the course popup needs so the bidding table fits without its own scrollbar
 * (table + the popup's padding and border). Re-measured when the popup's content
 * changes size, e.g. once the bidding file has loaded. Only grows.
 */
export function useBiddingTableWidth(popupRef, open) {
  const [minWidth, setMinWidth] = useState(0)
  useLayoutEffect(() => {
    const popup = popupRef.current
    if (!open || !popup) return undefined
    const measure = () => {
      const table = popup.querySelector('[data-bidding-table]')
      if (!table) return
      const box = getComputedStyle(popup)
      const needed = Math.ceil(
        table.scrollWidth +
          parseFloat(box.paddingLeft) +
          parseFloat(box.paddingRight) +
          parseFloat(box.borderLeftWidth) +
          parseFloat(box.borderRightWidth),
      )
      setMinWidth((prev) => (needed > prev ? needed : prev))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(popup)
    return () => observer.disconnect()
  }, [open, popupRef])
  return minWidth
}

/**
 * "Bidding history by section" at the bottom of the course popup (Weekly Calendar,
 * Your Plan, phone sheet). Spec: docs/specs/bidding-by-section.md. Semesters down,
 * sections across (each section over R1 and R2), this section tinted green.
 */
export function BiddingHistoryGrid({ course }) {
  const history = useBiddingHistory()
  const sectionIndex = useContext(CourseSectionsContext)
  if (!history || !isSomCourse(course)) return null
  const { sections, thisSection, rows } = getBiddingGrid(
    course,
    history,
    sectionsFor(sectionIndex, course),
  )
  if (!rows.length) {
    return (
      <p className="text-xs text-gray-400">
        <span className="font-medium text-gray-500">Bidding history</span> · No bidding history
      </p>
    )
  }
  // This section: the same light green as "In Plan" elsewhere (sectionTheme.js).
  const highlight = (section) => (section === thisSection ? 'bg-save-50' : '')
  // Vertical lines only (none between rows), see-through so they look the same on
  // white and on the green column; a bit darker between sections than R1 | R2, and
  // one closing the last section on the right.
  const groupStart = 'border-l border-black/10'
  const roundLine = 'border-l border-black/5'
  const lastSection = sections.at(-1)
  const closing = (section) => (section === lastSection ? 'border-r border-black/10' : '')
  // Same width for "–" and swatch + number, so every column lines up.
  const cellBox = 'inline-flex min-w-[2.75rem] items-center justify-center gap-1'
  return (
    <div className="text-xs">
      <p className="mb-1 font-medium text-gray-500">Bidding history by section</p>
      {/* Phones: a table wider than the screen scrolls sideways, semester names stay put.
          Computers never need it: the popup widens to fit (useBiddingTableWidth). */}
      <div className="overflow-x-auto">
      <table data-bidding-table className="w-auto border-collapse text-xs">
        <thead className="text-[11px] leading-tight text-gray-500">
          <tr>
            <th rowSpan={2} className="sticky left-0 border-b border-gray-200 bg-white pr-4" />
            {sections.map((section) => (
              <th
                key={section}
                colSpan={2}
                className={`px-2 pt-0.5 text-center ${highlight(section)} ${groupStart} ${closing(section)} ${
                  section === thisSection ? 'font-semibold text-save-900' : 'font-medium'
                }`}
              >
                {section}
              </th>
            ))}
          </tr>
          <tr className="border-b border-gray-200">
            {sections.map((section) => (
              <Fragment key={section}>
                <th className={`px-2 pb-1 text-center font-medium ${highlight(section)} ${groupStart}`}>R1</th>
                <th className={`px-2 pb-1 text-center font-medium ${highlight(section)} ${roundLine} ${closing(section)}`}>R2</th>
              </Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ term, cells }) => (
            <tr key={term}>
              <th scope="row" className="sticky left-0 bg-white py-1 pr-4 text-left font-normal whitespace-nowrap text-gray-700">
                {term}
              </th>
              {sections.map((section) =>
                [cells[section]?.round1, cells[section]?.round2].map((points, j) => (
                  <td
                    key={`${section}-${j}`}
                    className={`px-2 py-1 text-center whitespace-nowrap ${highlight(section)} ${j === 0 ? groupStart : `${roundLine} ${closing(section)}`}`}
                  >
                    {points == null ? (
                      <span className={`${cellBox} text-gray-400`}>–</span>
                    ) : (
                      <span className={`${cellBox} font-medium tabular-nums text-gray-700`}>
                        <Swatch points={points} className="size-2.5" />
                        {points}
                      </span>
                    )}
                  </td>
                )),
              )}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <CautionFlag className="mt-2 shrink items-start">{BIDDING_DISCLAIMER}</CautionFlag>
    </div>
  )
}

/**
 * Four small squares, one per past bidding round (spec: docs/specs/bidding-history.md).
 * Darker orange = more points needed. Hover (tap on phones) shows the numbers.
 */
export default function BiddingHistory({ rounds, className = '' }) {
  const tooltipId = useId()
  const anchorRef = useRef(null)
  const tooltipRef = useRef(null)
  const hideTimerRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [style, setStyle] = useState(null)

  const refreshStyle = useCallback(() => {
    if (anchorRef.current) setStyle(basePortaledTooltipStyle(anchorRef.current, { above: true }))
  }, [])

  const cancelHide = useCallback(() => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
  }, [])

  const show = useCallback(() => {
    cancelHide()
    refreshStyle()
    setOpen(true)
  }, [cancelHide, refreshStyle])

  const scheduleHide = useCallback(() => {
    cancelHide()
    hideTimerRef.current = window.setTimeout(() => {
      setOpen(false)
      hideTimerRef.current = null
    }, TOOLTIP_HIDE_DELAY_MS)
  }, [cancelHide])

  // Phones have no hover: a tap opens and closes the box (and doesn't open the course).
  const handleClick = useCallback(
    (event) => {
      if (!window.matchMedia('(max-width: 1023px)').matches) return
      event.stopPropagation()
      if (open) {
        cancelHide()
        setOpen(false)
      } else {
        show()
      }
    },
    [cancelHide, open, show],
  )

  useEffect(() => {
    if (!open) return
    window.addEventListener('scroll', refreshStyle, true)
    window.addEventListener('resize', refreshStyle)
    return () => {
      window.removeEventListener('scroll', refreshStyle, true)
      window.removeEventListener('resize', refreshStyle)
    }
  }, [open, refreshStyle])

  useLayoutEffect(() => {
    if (!open || !anchorRef.current || !tooltipRef.current) return
    const left = clampPortaledTooltipLeft(anchorRef.current, tooltipRef.current)
    setStyle((prev) => (prev && prev.left !== left ? { ...prev, left } : prev))
  }, [open])

  useEffect(() => () => cancelHide(), [cancelHide])

  return (
    <>
      <span
        ref={anchorRef}
        role="img"
        aria-label="Bidding history"
        aria-describedby={open ? tooltipId : undefined}
        className={`inline-flex items-center gap-[3px] ${className}`}
        onClick={handleClick}
        onMouseEnter={show}
        onMouseLeave={scheduleHide}
      >
        {rounds.map((round) => (
          <Swatch key={round.label} points={round.points} className="size-2.5" />
        ))}
      </span>

      {open && style
        ? createPortal(
            <div
              ref={tooltipRef}
              id={tooltipId}
              role="tooltip"
              className="overflow-y-auto rounded-lg border border-gray-200 bg-white p-3 text-left shadow-xl"
              style={{ ...style, maxWidth: Math.min(style.maxWidth, 320) }}
              onMouseEnter={show}
              onMouseLeave={scheduleHide}
            >
              <p className="mb-1 text-xs font-medium text-gray-700">Bidding history</p>
              <RoundsTable rounds={rounds} />
              <p className="mt-2 border-t border-gray-200 pt-2 text-[11px] leading-snug text-gray-500">
                {BIDDING_DISCLAIMER}
              </p>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
