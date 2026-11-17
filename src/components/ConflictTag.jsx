import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { formatCourseHeading } from '../lib/courseDisplay'
import { formatSchedule } from '../lib/parseCourses'
import {
  TOOLTIP_HIDE_DELAY_MS,
  basePortaledTooltipStyle,
  clampPortaledTooltipLeft,
} from '../lib/portaledTooltip'
import { formatSessionLabel } from '../lib/sessionDisplay'

/**
 * Red Conflict tag on a catalog row. Hover (tap on phones) lists the plan
 * courses it clashes with, like the bidding history squares (issue #19).
 */
export default function ConflictTag({ conflictsWith = [] }) {
  const tooltipId = useId()
  const anchorRef = useRef(null)
  const tooltipRef = useRef(null)
  const hideTimerRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [style, setStyle] = useState(null)
  const hasDetails = conflictsWith.length > 0

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
    if (!hasDetails) return
    cancelHide()
    refreshStyle()
    setOpen(true)
  }, [cancelHide, hasDetails, refreshStyle])

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
      if (!hasDetails || !window.matchMedia('(max-width: 1023px)').matches) return
      event.stopPropagation()
      if (open) {
        cancelHide()
        setOpen(false)
      } else {
        show()
      }
    },
    [cancelHide, hasDetails, open, show],
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
        aria-describedby={open ? tooltipId : undefined}
        className="rounded bg-danger px-1 py-px text-[10px] font-semibold leading-tight text-white shadow-sm"
        onClick={handleClick}
        onMouseEnter={show}
        onMouseLeave={scheduleHide}
      >
        Conflict
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
              <p className="mb-1 text-xs font-medium text-gray-700">Conflicts with</p>
              <ul className="space-y-1.5">
                {conflictsWith.map((c) => (
                  <li key={c.courseId} className="border-t border-gray-100 pt-1.5 first:border-t-0 first:pt-0">
                    <p className="text-xs font-medium leading-snug text-gray-900">
                      {formatCourseHeading(c)}
                    </p>
                    <p className="text-[11px] leading-snug text-gray-500">
                      {formatSessionLabel(c.session)} · {formatSchedule(c)}
                    </p>
                  </li>
                ))}
              </ul>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
