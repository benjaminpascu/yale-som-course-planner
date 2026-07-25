import coursesCsv from '../../docs/data-samples/courses_master_fall2026.csv?raw'
import { dbRowToCourse, parseCoursesCsv } from './parseCourses'
import { getSupabaseClient } from './supabaseClient'

/**
 * Load course data (tags are inline on each course).
 * Uses Supabase when VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY are set;
 * otherwise loads the bundled sample CSV from docs/data-samples/.
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
  const courses = parseCoursesCsv(coursesCsv)
  return { courses, source: 'local' }
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
    courses: rows.map(dbRowToCourse),
    source: 'supabase',
  }
}
