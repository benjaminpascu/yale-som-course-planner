/**
 * Optional typo/duplicate fixes for course categories (front end only).
 *
 * - CSV and Supabase keep the raw `Course Category` string.
 * - `normalizeCategory` only rewrites values listed in CATEGORY_ALIASES.
 * - Any other value passes through unchanged so new academic-year categories
 *   appear automatically in filters, course rows, and the calendar.
 *
 * Do not add a master category list or whitelist here — only known duplicates.
 */
const CATEGORY_ALIASES = {
  'Entreneurship & Private Equity': 'Entrepreneurship & Private Equity',
  'Entreprenurship & Private Equity': 'Entrepreneurship & Private Equity',
  PHD: 'PhD',
}

/**
 * Display/filter label for a course category. Unknown values are returned as-is.
 *
 * @param {string | null | undefined} raw
 * @returns {string} Empty when missing; otherwise canonical or original name
 */
export function normalizeCategory(raw) {
  const value = raw?.trim() ?? ''
  if (!value) return ''
  return CATEGORY_ALIASES[value] ?? value
}
