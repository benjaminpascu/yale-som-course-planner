/**
 * Law School courses, read from the public course list on
 * https://courses.law.yale.edu (no login). Read-only: only the list anyone sees
 * on the front page. Placeholder until the reader is finished.
 */
export const LAW_SCHOOL = 'LW'

/**
 * @param {string} termCode
 * @returns {Promise<{ rows: Record<string, string>[], problems: string[] }>}
 */
export async function fetchLawSections(termCode) {
  void termCode
  return { rows: [], problems: ['Law reader not set up yet'] }
}
