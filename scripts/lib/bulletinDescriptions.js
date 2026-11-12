/**
 * Course descriptions from Yale's Bulletin (catalog.yale.edu), for courses
 * whose description is missing in Yale's Courses Web Service (e.g. Jackson,
 * Architecture, Music). Uses the catalog's public per-course lookup (the one
 * its course pop-ups use); no login, no key.
 */
import { htmlToText } from './yaleImport.js'

/** Catalog lookup for one course number, e.g. "GLBL 5015". */
export function bulletinUrl(courseNumber) {
  return `https://catalog.yale.edu/ribbit/index.cgi?page=getcourse.rjs&code=${encodeURIComponent(courseNumber)}`
}

/**
 * The description text from a catalog lookup answer, or '' when the course
 * isn't in the Bulletin. Drops the credit note and meeting time the catalog
 * appends ("½ Course cr", "Th 3:30pm-6pm").
 *
 * @param {string} xml
 */
export function parseBulletinDescription(xml) {
  const match = /<p class="courseblockdesc">([\s\S]*?)<\/p>/.exec(xml ?? '')
  if (!match) return ''
  const body = match[1].split(/<span class="keeptogether"|<br\s*\/?>/)[0]
  return htmlToText(body).replace(/[ \s]+$/, '').trim()
}
