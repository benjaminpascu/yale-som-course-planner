import { getRegistrationTag } from '../lib/courseDisplay'

/**
 * Bid / permission / enrollment indicator from CSV `Bid Or Permission`.
 * Shown in the top-right of catalog rows (color by type).
 *
 * @param {{ bidOrPermission: string, className?: string }} props
 */
export default function RegistrationTag({ bidOrPermission, className = '' }) {
  const tag = getRegistrationTag(bidOrPermission)
  if (!tag) return null

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-xs font-semibold leading-tight ${className}`}
      style={{ backgroundColor: tag.bg, color: tag.fg }}
      title={`Registration: ${tag.label}`}
    >
      {tag.label}
    </span>
  )
}
