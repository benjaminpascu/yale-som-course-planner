import fallCsv from '../../docs/data-samples/courses_master_fall2026.csv?raw'
import springCsv from '../../docs/data-samples/courses_master_spring2027.csv?raw'
import { harmonizeSectionTags, parseCoursesCsv } from './parseCourses'

/**
 * Load course data for every term from the CSVs bundled with the app
 * (docs/data-samples/). Tags are inline on each course; sections of the same
 * course share their requirement tags.
 */
export async function loadAppData() {
  const courses = [fallCsv, springCsv].flatMap((csv) => parseCoursesCsv(csv))
  return { courses: harmonizeSectionTags(courses) }
}
