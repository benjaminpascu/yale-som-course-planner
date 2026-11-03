/**
 * Rebuilds one term's course CSV from the Yale SOM website exports.
 *
 *   npm run update-courses              # write the new file
 *   npm run update-courses -- --check   # only show what would change
 *
 * Put exactly three .csv files in course-import/: the full course list, the
 * STEM list (file name contains "stem") and the GBS list (name contains
 * "gbs"). Full steps: docs/updating-course-data.md.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  SOURCE_COLUMNS,
  applyOverrides,
  buildCourseRows,
  classifyExportFile,
  diffCourses,
  parseCsv,
  termFileSlug,
  toCsv,
} from './lib/courseImport.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const IMPORT_DIR = path.join(ROOT, 'course-import')
const DATA_DIR = path.join(ROOT, 'docs/data-samples')
const OVERRIDES_FILE = path.join(DATA_DIR, 'course_overrides.csv')
const LOADER_FILE = path.join(ROOT, 'src/lib/loadData.js')

const checkOnly = process.argv.includes('--check')
const force = process.argv.includes('--force')

function stop(message) {
  console.error(`\n✖ ${message}\n`)
  process.exit(1)
}

function printList(title, items, limit = Infinity) {
  console.log(`\n${title} (${items.length})`)
  if (items.length === 0) {
    console.log('  none')
    return
  }
  for (const item of items.slice(0, limit)) console.log(`  • ${item}`)
  if (items.length > limit) console.log(`  … and ${items.length - limit} more`)
}

// 1. Find the three exports.
if (!fs.existsSync(IMPORT_DIR)) stop(`Folder not found: course-import/. Create it and put the three Yale CSV files in it.`)
const csvFiles = fs.readdirSync(IMPORT_DIR).filter((name) => name.toLowerCase().endsWith('.csv'))
const filesByKind = { full: [], stem: [], gbs: [] }
for (const name of csvFiles) filesByKind[classifyExportFile(name)].push(name)

const kindNames = { full: 'full course list', stem: 'STEM list (name must contain "stem")', gbs: 'GBS list (name must contain "gbs")' }
for (const [kind, names] of Object.entries(filesByKind)) {
  if (names.length === 0) stop(`Missing the ${kindNames[kind]} in course-import/.`)
  if (names.length > 1) stop(`More than one ${kindNames[kind]} in course-import/: ${names.join(', ')}. Keep only the newest one.`)
}

// 2. Read and check them.
const exportsByKind = {}
let termCode = null
for (const [kind, [name]] of Object.entries(filesByKind)) {
  const { rows, headers } = parseCsv(fs.readFileSync(path.join(IMPORT_DIR, name), 'utf8'))
  const missing = SOURCE_COLUMNS.filter((column) => !headers.includes(column))
  if (missing.length > 0) stop(`${name} is missing columns: ${missing.join(', ')}. Is it the "Download CSV" export from the SOM courses page?`)

  const terms = [...new Set(rows.map((row) => row.TermCode?.trim()).filter(Boolean))]
  if (kind === 'full') {
    if (terms.length !== 1) stop(`${name} mixes terms (${terms.join(', ')}). Export one semester at a time.`)
    termCode = terms[0]
  }
  exportsByKind[kind] = rows
  console.log(`Read ${name}: ${rows.length} rows (${kindNames[kind].split(' (')[0]})`)
}
for (const kind of ['stem', 'gbs']) {
  const other = exportsByKind[kind].find((row) => row.TermCode?.trim() !== termCode)
  if (other) stop(`${filesByKind[kind][0]} contains term ${other.TermCode}, but the full list is term ${termCode}. Download all three for the same semester.`)
}

const slug = termFileSlug(termCode)
if (!slug) stop(`Unknown TermCode ${termCode} (expected YYYY01 for spring or YYYY03 for fall).`)
const outputName = `courses_master_${slug}.csv`
const outputFile = path.join(DATA_DIR, outputName)
console.log(`Term: ${slug} (TermCode ${termCode}) → docs/data-samples/${outputName}`)

// 3. Build, apply manual fixes, compare with the current file.
const { rows, problems } = buildCourseRows(exportsByKind)
const overrides = fs.existsSync(OVERRIDES_FILE) ? parseCsv(fs.readFileSync(OVERRIDES_FILE, 'utf8')).rows : []
const { applied, notes } = applyOverrides(rows, overrides, termCode)

const oldRows = fs.existsSync(outputFile) ? parseCsv(fs.readFileSync(outputFile, 'utf8')).rows : []
const { added, removed, changed } = diffCourses(oldRows, rows)

const tagCounts = {}
for (const row of rows) for (const tag of row.tags.split(';').filter(Boolean)) tagCounts[tag] = (tagCounts[tag] ?? 0) + 1

console.log(`\nNew file: ${rows.length} course sections (was ${oldRows.length}).`)
console.log(`Tags: ${Object.entries(tagCounts).map(([tag, n]) => `${tag} ${n}`).join(', ') || 'none'}`)
console.log(`No meeting time: ${rows.filter((row) => !row.days_clean).length} sections`)
const hiddenByYale = exportsByKind.full.filter((row) => row.Visible?.trim() !== '1')
if (hiddenByYale.length > 0) {
  console.log(`Hidden in Yale's export but shown anyway: ${hiddenByYale.map((row) => row['Course Number']).join(', ')}`)
}
printList('➕ New courses', added)
printList('➖ Removed courses', removed)
printList('✏️  Changed courses', changed, 60)
printList('🔧 Manual fixes applied (course_overrides.csv)', applied)
if (notes.length > 0) printList('ℹ️  Override notes', notes)
if (problems.length > 0) printList('⚠️  Problems to look at', problems)

// 4. Write, unless the result looks wrong.
if (oldRows.length > 0 && rows.length < oldRows.length * 0.5 && !force) {
  stop(`The new list has far fewer courses than before (${rows.length} vs ${oldRows.length}). The full list may have been downloaded with filters on. Nothing was written. Re-run with --force if this is really right.`)
}

if (checkOnly) {
  console.log('\n--check: nothing was written.\n')
  process.exit(0)
}

fs.writeFileSync(outputFile, toCsv(rows))
console.log(`\n✔ Wrote docs/data-samples/${outputName}`)

if (!fs.readFileSync(LOADER_FILE, 'utf8').includes(outputName)) {
  console.log(`\n⚠️  The app does not load ${outputName} yet (src/lib/loadData.js). A new term needs a small code change before it shows up.`)
}
console.log('Next: npm test, npm run dev to look at it, then commit and push to main.\n')
