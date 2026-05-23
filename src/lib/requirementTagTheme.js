/**
 * Display label + colors per Yale requirement tag (PRD §6.2).
 * @type {Record<string, { label: string, bg: string, fg: string }>}
 */
export const REQUIREMENT_TAG_THEME = {
  MGAM: { label: 'MAM Req', bg: '#001d3d', fg: '#ffffff' },
  MGGB: { label: 'GBS Req', bg: '#5b8fb9', fg: '#ffffff' },
  MGLD: { label: 'Leadership Req', bg: '#f0c419', fg: '#1a1a1a' },
  MGSR: { label: 'Systemic Risk Req', bg: '#1a1a1a', fg: '#ffffff' },
  MGGS: { label: 'Global Studies Req', bg: '#2d6a4f', fg: '#ffffff' },
  MGBA: { label: 'Asset Mgt Req', bg: '#6b4c9a', fg: '#ffffff' },
  MGMS: { label: 'Mgt Science Req', bg: '#00356b', fg: '#ffffff' },
}

/** @param {string} tagCode */
export function getRequirementTagTheme(tagCode) {
  return (
    REQUIREMENT_TAG_THEME[tagCode] ?? {
      label: tagCode,
      bg: '#6b7280',
      fg: '#ffffff',
    }
  )
}

/** Short labels for filters and tooltips. */
export const REQUIREMENT_TAG_LABELS = Object.fromEntries(
  Object.entries(REQUIREMENT_TAG_THEME).map(([code, { label }]) => [
    code,
    label,
  ]),
)
