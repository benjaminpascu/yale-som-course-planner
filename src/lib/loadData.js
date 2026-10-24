import fallCsv from '../../docs/data-samples/courses_master_fall2026.csv?raw'
import springCsv from '../../docs/data-samples/courses_master_spring2027.csv?raw'
import {
  dbRowToCourse,
  harmonizeSectionTags,
  parseCoursesCsv,
} from './parseCourses'
import { getSupabaseClient } from './supabaseClient'

/**
 * Load course data for every term (tags are inline on each course).
 * Uses Supabase when VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY are set;
 * otherwise loads the bundled term CSVs from docs/data-samples/.
 * Either way, sections of the same course share their requirement tags.
 *
 * If Supabase is missing the `courses.tags` column (migration 003 not applied),
 * falls back to the local CSV so requirement filters still work.
 */
export async function loadAppData() {
  const supabase = getSupabaseClient()

  if (supabase) {
    return loadFromSupabase(supabase)
  }

  return loadFromLocalCsv()
}

function loadFromLocalCsv() {
  const courses = [fallCsv, springCsv].flatMap((csv) => parseCoursesCsv(csv))
  return { courses: harmonizeSectionTags(courses), source: 'local' }
}

async function loadFromSupabase(supabase) {
  const coursesResult = await supabase
    .from('courses')
    .select('*')
    .eq('visible', true)
    .order('course_number')

  if (coursesResult.error) {
    throw new Error(`Failed to load courses: ${coursesResult.error.message}`)
  }

  const rows = coursesResult.data ?? []
  const schemaHasTags = rows.length === 0 || rows.some((row) => 'tags' in row)

  if (!schemaHasTags) {
    console.warn(
      'Supabase courses table has no tags column yet. Falling back to local CSV. ' +
        'Run supabase/migrations/003_inline_course_tags.sql, then npm run import:data.',
    )
    return loadFromLocalCsv()
  }

  return {
    courses: harmonizeSectionTags(rows.map(dbRowToCourse)),
    source: 'supabase',
  }
}
