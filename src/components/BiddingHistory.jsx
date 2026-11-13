import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { isSomCourse } from '../lib/schools'
import {
  BIDDING_DISCLAIMER,
  biddingColor,
  getBiddingRounds,
  parseBiddingCsv,
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

/** The four rounds for a course, or null when its squares shouldn't show. */
export function useBiddingRounds(course) {
  const history = useBiddingHistory()
  if (!history) return null
  const rounds = getBiddingRounds(course, history)
  return showsBiddingHistory(course, rounds) ? rounds : null
}

const Swatch = ({ points, className = '' }) => (
  <span
    className={`inline-block shrink-0 rounded-[2px] ring-1 ring-black/10 ring-inset ${className}`}
    style={{ backgroundColor: biddingColor(points) }}
  />
)

/**
 * Rounds come as [R1, R2] per semester; one table row per semester.
 * `compact` (narrow course popups): "R1"/"R2" headers and bare numbers.
 */
function RoundsTable({ rounds, compact = false }) {
  const terms = []
  for (let i = 0; i < rounds.length; i += 2) {
    terms.push({ term: rounds[i].label.replace(/^Round 1, /, ''), cells: rounds.slice(i, i + 2) })
  }
  return (
    <table className="w-full border-collapse text-xs">
      <thead>
        <tr className="border-b border-gray-200 text-[11px] text-gray-500">
          <th className={`py-1 text-left font-medium ${compact ? 'pr-2' : 'pr-4'}`} />
          <th className={`py-1 text-left font-medium ${compact ? 'px-1' : 'px-2'}`}>
            {compact ? 'R1' : 'Round 1'}
          </th>
          <th className={`py-1 text-left font-medium ${compact ? 'pl-1' : 'pl-2'}`}>
            {compact ? 'R2' : 'Round 2'}
          </th>
        </tr>
      </thead>
      <tbody>
        {terms.map(({ term, cells }) => (
          <tr key={term} className="border-b border-gray-100 last:border-b-0">
            <th
              scope="row"
              className={`py-1.5 text-left font-medium whitespace-nowrap text-gray-900 ${compact ? 'pr-2' : 'pr-4'}`}
            >
              {term}
            </th>
            {cells.map((cell, i) => (
              <td
                key={cell.label}
                className={`py-1.5 whitespace-nowrap ${i === 0 ? (compact ? 'px-1' : 'px-2') : compact ? 'pl-1' : 'pl-2'}`}
              >
                <span className={`inline-flex items-center ${compact ? 'gap-1' : 'gap-1.5'}`}>
                  <Swatch points={cell.points} className="size-2.5" />
                  {cell.points == null ? (
                    <span className="text-gray-400">{compact ? '–' : 'No data'}</span>
                  ) : (
                    <span className="font-medium tabular-nums text-gray-900">
                      {compact ? cell.points : `${cell.points} pts`}
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
 * Bidding history inside a course popup (Weekly Calendar, Your Plan), in the
 * narrow facts column. SOM courses without past results say so; other schools'
 * courses (not in SOM bidding) show nothing.
 */
export function BiddingHistoryDetail({ course }) {
  const history = useBiddingHistory()
  if (!history || !isSomCourse(course)) return null
  const rounds = getBiddingRounds(course, history)
  if (!showsBiddingHistory(course, rounds)) {
    return (
      <div>
        <p className="font-medium text-gray-500">Bidding history</p>
        <p className="text-gray-400">No bidding history</p>
      </div>
    )
  }
  return (
    <div>
      <p className="font-medium text-gray-500">Bidding history (points)</p>
      <RoundsTable rounds={rounds} compact />
      <p className="mt-1 text-[10px] leading-snug text-gray-500">{BIDDING_DISCLAIMER}</p>
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
