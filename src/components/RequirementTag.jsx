import { getRequirementTagTheme } from '../lib/requirementTagTheme'

/**
 * Colored pill for a Yale requirement tag code (e.g. MGAM → MAM Req).
 *
 * @param {{ tagCode: string, className?: string, muted?: boolean }} props
 */
export default function RequirementTag({ tagCode, className = '', muted = false }) {
  const { label, bg, fg } = getRequirementTagTheme(tagCode)

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-xs font-semibold leading-tight ${muted ? 'opacity-55' : ''} ${className}`}
      style={{ backgroundColor: bg, color: fg }}
    >
      {label}
    </span>
  )
}
