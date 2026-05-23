import coursesCsv from '../../docs/data-samples/courses_master_new.csv?raw'
import tagsCsv from '../../docs/data-samples/course_tags.csv?raw'
import { dbRowToCourse, parseCoursesCsv } from './parseCourses'
import { dbRowToTag, parseTagsCsv } from './parseTags'
import { getSupabaseClient } from './supabaseClient'

/**
 * Load course and tag data.
 * Uses Supabase when VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY are set;
 * otherwise loads bundled sample CSVs from docs/data-samples/.
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
  const tags = parseTagsCsv(tagsCsv)
  return { courses, tags, source: 'local' }
}

async function loadFromSupabase(supabase) {
  const [coursesResult, tagsResult] = await Promise.all([
    supabase
      .from('courses')
      .select('*')
      .eq('visible', true)
      .order('course_number'),
    supabase.from('tags').select('course_number, tag_code, tag_label'),
  ])

  if (coursesResult.error) {
    throw new Error(`Failed to load courses: ${coursesResult.error.message}`)
  }
  if (tagsResult.error) {
    throw new Error(`Failed to load tags: ${tagsResult.error.message}`)
  }

  return {
    courses: (coursesResult.data ?? []).map(dbRowToCourse),
    tags: (tagsResult.data ?? []).map(dbRowToTag),
    source: 'supabase',
  }
}
