/**
 * Chevron for <details>: points right (›) when closed, up (^) when open.
 * Parent must have class "group".
 */
export default function CollapseChevron() {
  return (
    <span
      aria-hidden
      className="inline-flex w-5 shrink-0 items-center justify-center text-lg font-semibold leading-none text-yale-800 transition-transform duration-200 group-open:-rotate-90"
    >
      ›
    </span>
  )
}
