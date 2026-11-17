/**
 * Small amber heads-up with a warning triangle, e.g. "Unsaved" next to the Plan button
 * in Plans and Compare Plans.
 *
 * @param {{ children: import('react').ReactNode, title?: string, className?: string }} props
 */
export default function CautionFlag({ children, title, className = '' }) {
  return (
    <span
      title={title}
      className={`inline-flex shrink-0 items-center gap-1 text-xs font-medium text-caution ${title ? 'cursor-help' : ''} ${className}`}
    >
      <svg aria-hidden viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 shrink-0">
        <path
          fillRule="evenodd"
          d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
          clipRule="evenodd"
        />
      </svg>
      {children}
    </span>
  )
}
