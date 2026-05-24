/**
 * Chevron for collapsible sections: right (›) when closed, up when open.
 * Pass `open` for controlled sections; omit for <details class="group">.
 */
export default function CollapseChevron({ open }) {
  const rotation =
    open === undefined
      ? 'group-open:-rotate-90'
      : open
        ? '-rotate-90'
        : ''

  return (
    <span
      aria-hidden
      className={`inline-flex w-5 shrink-0 items-center justify-center text-lg font-semibold leading-none text-yale-800 transition-transform duration-200 ${rotation}`}
    >
      ›
    </span>
  )
}
