/**
 * Updates (patch notes), shown on the /updates page (Updates button in the top bar).
 * Newest first. The first entry's version is the site's version — keep
 * `package.json` "version" the same (a test checks it).
 *
 * Version rules: small fixes pushed straight to main bump the last number
 * (1.0.1 → 1.0.2); new features that went through a spec bump the middle
 * number (1.0.x → 1.1). Each change is one or two explicit sentences for
 * students: what changed, where it is, and how to use it.
 */
export const UPDATES = [
  {
    version: '1.2.0',
    date: '2026-11-13',
    changes: [
      'Bidding history: courses in the Course Catalog now show four small squares in the bottom right, one for each of the last two years\' Round 1 and Round 2. The darker the orange, the more points that section needed; gray means no data. Hover over the squares to see the exact points.',
    ],
  },
  {
    version: '1.1.1',
    date: '2026-11-13',
    changes: [
      'SOMtimes now opens on the semester you are planning (right now Spring 2027) instead of the one already underway. Switch semesters any time with the Fall / Spring buttons in the top right.',
    ],
  },
  {
    version: '1.1.0',
    date: '2026-11-12',
    changes: [
      'You can now plan courses from other Yale schools: pick a school (for example Jackson, School of the Environment or Yale College) in the new dropdown above the Course Catalog, then add courses to your plan as usual. They show on your Weekly Calendar and are checked for conflicts with your SOM courses. Use Filters → Department (e.g. Economics) to narrow a big school like Yale College.',
      'Courses from other schools count as 0 units in Requirements. A note appears there whenever your plan has one, so check with the registrar how they count toward your SOM units.',
    ],
  },
  {
    version: '1.0.1',
    date: '2026-11-11',
    changes: [
      'You can now remove a course right from the Weekly Calendar: hover over its block and click the × in the top-right corner. Works in both Single plan and Compare plans.',
      'Every warning and every remove or delete button now uses the same dark red as the Conflict badge, so problems are easy to spot. Softer heads-ups, like "No time defined" or "unsaved", use one amber color.',
    ],
  },
  { version: '1.0.0', label: 'Launch', changes: [] },
]

export const APP_VERSION = UPDATES[0].version

/** Address of the Updates page (somtimes.vercel.app/updates). */
export const UPDATES_PATH = '/updates'

export function isUpdatesPath(pathname) {
  return pathname.replace(/\/+$/, '') === UPDATES_PATH
}

export const UPDATES_SEEN_KEY = 'yale-som-course-planner-updates-seen'

/** "2026-11-11" → "Nov 11, 2026" (read as a calendar date, not shifted by time zone). */
export function formatUpdateDate(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/** True when this browser hasn't opened Updates since the newest one came out. */
export function hasUnseenUpdate(storage = globalThis.localStorage) {
  try {
    return storage.getItem(UPDATES_SEEN_KEY) !== APP_VERSION
  } catch {
    // Storage blocked: no dot, rather than one that never goes away.
    return false
  }
}

export function markUpdatesSeen(storage = globalThis.localStorage) {
  try {
    storage.setItem(UPDATES_SEEN_KEY, APP_VERSION)
  } catch {
    // Storage blocked: nothing to remember.
  }
}
