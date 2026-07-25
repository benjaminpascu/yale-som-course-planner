/**
 * Optional color overrides for known tag names.
 * Filters/tracker still discover tags from data — this is display-only.
 * New tags without an override get a stable hashed palette color.
 */
const TAG_COLOR_OVERRIDES = {
  STEM: { bg: '#001a33', fg: '#ffffff' }, // dark navy
  'GBS Req': { bg: '#b3d4f5', fg: '#00356b' }, // light blue
}

/**
 * Fallback palette for tags without an override.
 */
const TAG_COLOR_PALETTE = [
  { bg: '#2d6a4f', fg: '#ffffff' },
  { bg: '#6b4c9a', fg: '#ffffff' },
  { bg: '#001d3d', fg: '#ffffff' },
  { bg: '#8b4513', fg: '#ffffff' },
  { bg: '#1a1a1a', fg: '#ffffff' },
  { bg: '#0f766e', fg: '#ffffff' },
  { bg: '#5b8fb9', fg: '#ffffff' },
  { bg: '#00356b', fg: '#ffffff' },
]

/** @param {string} tagName */
function hashTagName(tagName) {
  let hash = 0
  for (let i = 0; i < tagName.length; i += 1) {
    hash = (hash * 31 + tagName.charCodeAt(i)) >>> 0
  }
  return hash
}

/**
 * @param {string} tagName
 * @returns {{ label: string, bg: string, fg: string }}
 */
export function getRequirementTagTheme(tagName) {
  const name = tagName?.trim() || ''
  if (!name) {
    return { label: '', bg: '#6b7280', fg: '#ffffff' }
  }
  const override = TAG_COLOR_OVERRIDES[name]
  if (override) {
    return { label: name, bg: override.bg, fg: override.fg }
  }
  const color = TAG_COLOR_PALETTE[hashTagName(name) % TAG_COLOR_PALETTE.length]
  return { label: name, bg: color.bg, fg: color.fg }
}
