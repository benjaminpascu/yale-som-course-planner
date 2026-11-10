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
 * Load course data for every term. Tags are inline on each course; sections
 * of the same course share their requirement tags. Finished terms stay loaded
 * (so saved plans keep their courses); getCatalogTerms hides them.
 */
export async function loadAppData() {
  const courses = Object.values(termCsvs).flatMap((csv) => parseCoursesCsv(csv))
  return { courses: harmonizeSectionTags(courses) }
}
