import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  BIDDING_DISCLAIMER,
  biddingColor,
  formatPoints,
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

/** Loaded once, the first time any course with bidding history is opened. */
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
 * Four small squares, one per past bidding round (spec: docs/specs/bidding-history.md).
 * Darker orange = more points needed. Hover (tap on phones) shows the numbers.
 */
export default function BiddingHistory({ course }) {
  const history = useBiddingHistory()
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

  // Phones have no hover: a tap opens and closes the box.
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

  if (!history) return null
  const rounds = getBiddingRounds(course, history)
  if (!showsBiddingHistory(course, rounds)) return null

  return (
    <>
      <span
        ref={anchorRef}
        tabIndex={0}
        aria-label="Bidding history"
        aria-describedby={open ? tooltipId : undefined}
        className="inline-flex cursor-default items-center gap-[3px] rounded-sm align-middle outline-offset-2"
        onClick={handleClick}
        onMouseEnter={show}
        onMouseLeave={scheduleHide}
        onFocus={show}
        onBlur={scheduleHide}
      >
        {rounds.map((round) => (
          <span
            key={round.label}
            className="size-3 rounded-[2px] ring-1 ring-black/10 ring-inset"
            style={{ backgroundColor: biddingColor(round.points) }}
          />
        ))}
      </span>

      {open && style
        ? createPortal(
            <div
              ref={tooltipRef}
              id={tooltipId}
              role="tooltip"
              className="overflow-y-auto rounded-lg border border-gray-200 bg-white p-3 text-left shadow-xl"
              style={{ ...style, maxWidth: Math.min(style.maxWidth, 288) }}
              onMouseEnter={show}
              onMouseLeave={scheduleHide}
            >
              <p className="mb-2 text-xs font-medium text-gray-700">Bidding history</p>
              <ul className="space-y-1 border-l-2 border-gray-200 pl-3 text-xs">
                {rounds.map((round) => (
                  <li key={round.label} className="flex justify-between gap-6">
                    <span className="text-gray-900">{round.label}</span>
                    <span
                      className={`tabular-nums ${round.points == null ? 'text-gray-400' : 'font-medium text-gray-900'}`}
                    >
                      {formatPoints(round.points)}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] leading-snug text-gray-500">{BIDDING_DISCLAIMER}</p>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
