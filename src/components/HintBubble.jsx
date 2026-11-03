import { useEffect, useRef } from 'react'

// Rotated square; the two outer sides carry the note's border so the arrow looks cut from it.
const ARROWS = {
  left: 'top-1/2 -left-[7px] -translate-y-1/2 border-b-[1.5px] border-l-[1.5px]',
  up: '-top-[7px] left-6 border-t-[1.5px] border-l-[1.5px]',
  down: '-bottom-[7px] border-r-[1.5px] border-b-[1.5px]',
  right: 'top-1/2 -right-[7px] -translate-y-1/2 border-t-[1.5px] border-r-[1.5px]',
}

/** See-through dark layer behind a tip; clicking it closes the tip. Spotlit areas sit above it (z-[45]). */
export function HintBackdrop({ onClick, className = '' }) {
  return <div aria-hidden onClick={onClick} className={`fixed inset-0 z-40 bg-black/40 ${className}`} />
}

/**
 * Yellow first-visit tip note with "Got it" (yellow so it never blends into navy course
 * blocks or white panels). It floats over the page (the caller passes absolute/fixed
 * positioning), so nothing underneath moves. `arrowClassName` replaces the preset arrow
 * placement when it must change by screen size. Scrolls itself into view if off-screen,
 * keeping clear of the phone's bottom tab bar (scroll-my-24).
 */
export default function HintBubble({
  children,
  onDismiss,
  arrow,
  arrowStyle,
  arrowClassName,
  className = '',
}) {
  const ref = useRef(null)
  useEffect(() => {
    ref.current?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
  }, [])

  return (
    <div
      ref={ref}
      role="note"
      onClick={(event) => event.stopPropagation()}
      className={`z-50 flex w-max scroll-my-24 max-w-[calc(100vw-2rem)] items-center gap-3 rounded-lg border-[1.5px] border-[#c58a00] bg-[#fff4d6] px-3 py-2 text-sm text-[#4a3200] shadow-lg ${className}`}
    >
      {arrow || arrowClassName ? (
        <span
          aria-hidden
          className={`absolute h-3 w-3 rotate-45 border-[#c58a00] bg-[#fff4d6] ${arrowClassName ?? ARROWS[arrow]}`}
          style={arrowStyle}
        />
      ) : null}
      <span className="relative">{children}</span>
      <button
        type="button"
        onClick={onDismiss}
        className="relative shrink-0 font-semibold underline underline-offset-2 hover:text-[#1a1f2b]"
      >
        Got it
      </button>
    </div>
  )
}
