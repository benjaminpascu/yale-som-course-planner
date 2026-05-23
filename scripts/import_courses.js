#!/usr/bin/env node
/**
 * Import courses and tags from docs/data-samples/ into Supabase.
 *
 * Requires .env with SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.
 *
 * Courses: deletes existing rows for each term_code in the CSV, then inserts fresh rows.
 * Tags: upserts on (course_number, tag_code) — does not delete tags missing from the CSV.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { courseToDbRow, parseCoursesCsv } from '../src/lib/parseCourses.js'
import { parseTagsCsv, tagToDbRow } from '../src/lib/parseTags.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

config({ path: join(root, '.env') })

const supabaseUrl =
  process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? ''
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    'Missing Supabase credentials. Copy .env.example to .env and set:\n' +
      '  VITE_SUPABASE_URL (or SUPABASE_URL)\n' +
      '  SUPABASE_SERVICE_ROLE_KEY',
  )
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

const coursesPath = join(root, 'docs/data-samples/courses_master_new.csv')
const tagsPath = join(root, 'docs/data-samples/course_tags.csv')

const coursesText = readFileSync(coursesPath, 'utf8')
const tagsText = readFileSync(tagsPath, 'utf8')

let courses = parseCoursesCsv(coursesText)
const tags = parseTagsCsv(tagsText)

// SOM CSV can repeat the same Course ID (e.g. two section rows); keep the last row.
const byCourseId = new Map()
for (const course of courses) {
  byCourseId.set(course.courseId, course)
}
if (byCourseId.size < courses.length) {
  console.warn(
    `Skipped ${courses.length - byCourseId.size} duplicate Course ID row(s) in CSV`,
  )
  courses = [...byCourseId.values()]
}

const termCodes = [...new Set(courses.map((c) => c.termCode).filter(Boolean))]

console.log(`Parsed ${courses.length} visible courses across term(s): ${termCodes.join(', ')}`)
console.log(`Parsed ${tags.length} tag mappings`)

for (const termCode of termCodes) {
  const { error: deleteError } = await supabase
    .from('courses')
    .delete()
    .eq('term_code', termCode)

  if (deleteError) {
    console.error(`Failed to delete courses for term ${termCode}:`, deleteError.message)
    process.exit(1)
  }
}

const courseRows = courses.map(courseToDbRow)
const BATCH = 100

for (let i = 0; i < courseRows.length; i += BATCH) {
  const batch = courseRows.slice(i, i + BATCH)
  const { error } = await supabase.from('courses').insert(batch)

  if (error) {
    console.error(`Failed to insert courses (batch ${i / BATCH + 1}):`, error.message)
    process.exit(1)
  }
}

console.log(`Inserted ${courseRows.length} courses`)

const tagRows = tags.map(tagToDbRow)

for (let i = 0; i < tagRows.length; i += BATCH) {
  const batch = tagRows.slice(i, i + BATCH)
  const { error } = await supabase
    .from('tags')
    .upsert(batch, { onConflict: 'course_number,tag_code' })

  if (error) {
    console.error(`Failed to upsert tags (batch ${i / BATCH + 1}):`, error.message)
    process.exit(1)
  }
}

console.log(`Upserted ${tagRows.length} tags`)
console.log('Import complete.')
