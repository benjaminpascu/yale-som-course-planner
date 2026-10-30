import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  TOOLTIP_Z_INDEX,
  computePortaledTooltipLeft,
  getViewportBottomInsetPx,
} from '../../lib/portaledTooltip'

const GAP = 4

/**
 * Click-opened panel anchored to an element, portaled to <body> so the
 * scrolling table can't clip it (PRD §7.6). Closes on outside click / Escape.
 * `data-compare-popover` lets the table treat focus here as still "inside".
 */
export default function Popover({ anchorRef, onClose, width = 288, label, children }) {
  const panelRef = useRef(null)
  const [style, setStyle] = useState({ visibility: 'hidden' })

  useLayoutEffect(() => {
    function place() {
      const anchor = anchorRef.current
      const panel = panelRef.current
      if (!anchor || !panel) return
      const rect = anchor.getBoundingClientRect()
      const height = panel.offsetHeight
      const bottomLimit = window.innerHeight - getViewportBottomInsetPx()
      const below = rect.bottom + GAP + height <= bottomLimit
      setStyle({
        position: 'fixed',
        zIndex: TOOLTIP_Z_INDEX,
        width,
        maxWidth: window.innerWidth - 32,
        left: computePortaledTooltipLeft(rect, Math.min(width, window.innerWidth - 32)),
        top: below ? rect.bottom + GAP : Math.max(GAP, rect.top - GAP - height),
      })
    }
    place()
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [anchorRef, width])

  useEffect(() => {
    function handlePointer(event) {
      if (panelRef.current?.contains(event.target)) return
      if (anchorRef.current?.contains(event.target)) return
      onClose()
    }
    function handleKey(event) {
      if (event.key === 'Escape') {
        onClose()
        anchorRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [anchorRef, onClose])

  return createPortal(
    <div
      ref={panelRef}
      data-compare-popover
      role="dialog"
      aria-label={label}
      style={style}
      className="rounded-md border border-gray-200 bg-white p-3 text-xs shadow-xl"
    >
      {children}
    </div>,
    document.body,
  )
}
