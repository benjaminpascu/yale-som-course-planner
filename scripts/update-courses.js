/**
 * Updates the course files from Yale SOM's course feed.
 *
 *   npm run update-courses              # update every open term, add new ones
 *   npm run update-courses -- --check   # only show what would change
 *
 * Runs on its own every 6 hours on GitHub (.github/workflows/update-courses.yml).
 * Terms whose last class is over are left alone. Full notes:
 * docs/updating-course-data.md.
 *
 * Options:
 *   --check               write nothing
 *   --force               write even when a term shrinks by more than half
 *   --summary-file PATH   write a one-line summary (used for the commit message)
 *
 * Exits with an error when any term could not be updated (the others are
 * still written), so GitHub emails the repo owner.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  applyOverrides,
  buildCourseRows,
  diffCourses,
  feedUrl,
  parseCsv,
  termCodeFromFileName,
  termFileSlug,
  termsToUpdate,
  toCsv,
} from './lib/courseImport.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DATA_DIR = path.join(ROOT, 'docs/data-samples')
const OVERRIDES_FILE = path.join(DATA_DIR, 'course_overrides.csv')

const args = process.argv.slice(2)
const checkOnly = args.includes('--check')
const force = args.includes('--force')
const summaryIndex = args.indexOf('--summary-file')
const summaryFile = summaryIndex >= 0 ? args[summaryIndex + 1] : null

const termLabel = (termCode) => {
  const slug = termFileSlug(termCode)
  return slug ? `${slug[0].toUpperCase()}${slug.slice(1, -4)} ${slug.slice(-4)}` : termCode
}

function printList(title, items, limit = Infinity) {
  if (items.length === 0) return
  console.log(`  ${title} (${items.length})`)
  for (const item of items.slice(0, limit)) console.log(`    • ${item}`)
  if (items.length > limit) console.log(`    … and ${items.length - limit} more`)
}

/**
 * Yale's items for a term, or null when Yale has nothing for it yet.
 * Throws when the feed can't be reached or answers with something unexpected.
 */
async function fetchTerm(termCode) {
  let lastError
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(feedUrl(termCode), {
        headers: { 'User-Agent': 'SOMtimes course planner (somtimes.vercel.app)', Accept: 'application/json' },
        signal: AbortSignal.timeout(30_000),
      })
      if (!response.ok) throw new Error(`Yale's site answered ${response.status}`)
      const body = await response.json()
      if (body?.error?.code === 404) return null
      if (body?.error && body.error.code !== 200) throw new Error(`Yale's site answered: ${body.error.message ?? JSON.stringify(body.error)}`)
      const items = body?.data?.items
      if (!Array.isArray(items)) throw new Error("Yale's answer has no course list in it")
      return items
    } catch (error) {
      lastError = error
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 5_000))
    }
  }
  throw lastError
}

const savedTerms = fs
  .readdirSync(DATA_DIR)
  .map((name) => ({ name, termCode: termCodeFromFileName(name) }))
  .filter(({ termCode }) => termCode)
  .map(({ name, termCode }) => ({ termCode, rows: parseCsv(fs.readFileSync(path.join(DATA_DIR, name), 'utf8')).rows }))

const overrides = fs.existsSync(OVERRIDES_FILE) ? parseCsv(fs.readFileSync(OVERRIDES_FILE, 'utf8')).rows : []
const failures = []
const summary = []

const plan = termsToUpdate(savedTerms, new Date())
const skipped = savedTerms.filter(({ termCode }) => !plan.some((t) => t.termCode === termCode))
if (skipped.length > 0) console.log(`Finished, left as is: ${skipped.map(({ termCode }) => termLabel(termCode)).join(', ')}`)

for (const { termCode, isNew } of plan) {
  const name = termLabel(termCode)
  const outputName = `courses_master_${termFileSlug(termCode)}.csv`

  let items
  try {
    items = await fetchTerm(termCode)
  } catch (error) {
    failures.push(`${name}: couldn't get Yale's list (${error.message}). Kept the current file.`)
    continue
  }
  if (!items || items.length === 0) {
    if (isNew) console.log(`\n${name}: not posted by Yale yet.`)
    else failures.push(`${name}: Yale's list is empty. Kept the current file.`)
    continue
  }

  const { rows, problems } = buildCourseRows(items)
  const wrongTerm = rows.find((row) => row.TermCode.trim() !== termCode)
  if (wrongTerm) {
    failures.push(`${name}: Yale's list contains a course from term ${wrongTerm.TermCode}. Kept the current file.`)
    continue
  }
  const { applied, notes } = applyOverrides(rows, overrides, termCode)
  const oldRows = savedTerms.find((t) => t.termCode === termCode)?.rows ?? []
  const { added, removed, changed } = diffCourses(oldRows, rows)

  console.log(`\n${name} → docs/data-samples/${outputName}${isNew ? ' (new semester)' : ''}`)
  console.log(`  ${rows.length} course sections (was ${oldRows.length}); ${rows.filter((row) => !row.days_clean).length} with no meeting time`)
  printList('➕ New', added)
  printList('➖ Removed', removed)
  printList('✏️  Changed', changed, 60)
  printList('🔧 Manual fixes applied (course_overrides.csv)', applied)
  printList('ℹ️  Override notes', notes)
  printList('⚠️  Problems to look at', problems)

  if (oldRows.length > 0 && rows.length < oldRows.length * 0.5 && !force) {
    failures.push(`${name}: Yale's list suddenly has far fewer courses (${rows.length} vs ${oldRows.length}). Kept the current file; run with --force if this is really right.`)
    continue
  }

  const csv = toCsv(rows)
  const outputFile = path.join(DATA_DIR, outputName)
  if (fs.existsSync(outputFile) && fs.readFileSync(outputFile, 'utf8') === csv) {
    console.log('  No changes.')
    continue
  }
  summary.push(
    isNew
      ? `add ${name} (${rows.length} sections)`
      : `${name}: ${[added.length && `${added.length} added`, removed.length && `${removed.length} removed`, changed.length && `${changed.length} changed`].filter(Boolean).join(', ') || 'details updated'}`,
  )
  if (!checkOnly) {
    fs.writeFileSync(outputFile, csv)
    console.log(`  ✔ Wrote docs/data-samples/${outputName}`)
  }
}

if (checkOnly) console.log('\n--check: nothing was written.')
if (summaryFile && summary.length > 0) fs.writeFileSync(summaryFile, `${summary.join('; ')}\n`)

if (failures.length > 0) {
  console.error('\n✖ Some terms were not updated:')
  for (const failure of failures) console.error(`  • ${failure}`)
  process.exit(1)
}
console.log(summary.length > 0 ? `\nDone: ${summary.join('; ')}` : '\nDone: everything already up to date.')
