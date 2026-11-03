// Rotated square; the two outer sides carry the note's border so the arrow looks cut from it.
const ARROWS = {
  left: 'top-1/2 -left-[7px] -translate-y-1/2 border-b-[1.5px] border-l-[1.5px]',
  up: '-top-[7px] left-6 border-t-[1.5px] border-l-[1.5px]',
  down: '-bottom-[7px] border-r-[1.5px] border-b-[1.5px]',
}

/** See-through dark layer behind a tip; clicking it closes the tip. Spotlit areas sit above it (z-[45]). */
export function HintBackdrop({ onClick, className = '' }) {
  return <div aria-hidden onClick={onClick} className={`fixed inset-0 z-40 bg-black/40 ${className}`} />
}

/**
 * Yellow first-visit tip note with "Got it" (yellow so it never blends into navy course blocks or white panels). It floats over the page (the caller passes
 * absolute/fixed positioning), so nothing underneath moves.
 */
export default function HintBubble({ children, onDismiss, arrow, arrowStyle, className = '' }) {
  return (
    <div
      role="note"
      className={`z-50 flex w-max max-w-[calc(100vw-2rem)] items-center gap-3 rounded-lg border-[1.5px] border-[#c58a00] bg-[#fff4d6] px-3 py-2 text-sm text-[#4a3200] shadow-lg ${className}`}
    >
      {arrow ? (
        <span
          aria-hidden
          className={`absolute h-3 w-3 rotate-45 border-[#c58a00] bg-[#fff4d6] ${ARROWS[arrow]}`}
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
