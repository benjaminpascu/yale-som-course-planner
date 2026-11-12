import { harmonizeSectionTags, parseCoursesCsv } from './parseCourses'

/**
 * Every term CSV in docs/data-samples/, bundled at build time. A new
 * semester file (added by the automatic course update) is picked up without
 * a code change.
 */
const termCsvs = import.meta.glob('../../docs/data-samples/courses_master_*.csv', {
  query: '?raw',
  import: 'default',
  eager: true,
})

/**
 * Courses from the rest of Yale (docs/data-samples/yale_courses_<term>.csv),
 * kept out of the first download so SOM-only use stays as fast as before.
 */
const otherSchoolCsvs = import.meta.glob('../../docs/data-samples/yale_courses_*.csv', {
  query: '?raw',
  import: 'default',
})

/** Every other-school course (all terms); loaded in the background after SOM's. */
export async function loadOtherSchoolCourses() {
  const csvs = await Promise.all(Object.values(otherSchoolCsvs).map((load) => load()))
  return csvs.flatMap((csv) => parseCoursesCsv(csv))
}

/**
 * Load course data for every term. Tags are inline on each course; sections
 * of the same course share their requirement tags. Finished terms stay loaded
 * (so saved plans keep their courses); getCatalogTerms hides them.
 */
export async function loadAppData() {
  const courses = Object.values(termCsvs).flatMap((csv) => parseCoursesCsv(csv))
  return { courses: harmonizeSectionTags(courses) }
}
