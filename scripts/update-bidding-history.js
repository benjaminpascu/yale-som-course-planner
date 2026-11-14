/**
 * Updates docs/data-samples/bidding_history.csv from SOM's public
 * Auction-Bidding-History.xlsx.
 *
 *   npm run update-bidding-history              # download and update
 *   npm run update-bidding-history -- --check   # only show what would change
 *
 * Runs on its own once a month on GitHub (.github/workflows/update-bidding-history.yml).
 * The file's link is saved in docs/data-samples/bidding_history_source.json. SOM
 * puts uploads in month folders, so the script first tries this month's and last
 * month's folder for a newer file and saves that link when it finds one.
 *
 * Options:
 *   --check               write nothing
 *   --status-file PATH    write a JSON status for the workflow:
 *                         { changed, brokenLink, missingTerm, url }
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ExcelJS from 'exceljs'
import {
  guessUrls,
  missingTerm,
  parseBiddingSheets,
  toBiddingCsv,
} from './lib/biddingImport.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DATA_DIR = path.join(ROOT, 'docs/data-samples')
const SOURCE_FILE = path.join(DATA_DIR, 'bidding_history_source.json')
const OUTPUT_FILE = path.join(DATA_DIR, 'bidding_history.csv')

const args = process.argv.slice(2)
const checkOnly = args.includes('--check')
const statusIndex = args.indexOf('--status-file')
const statusFile = statusIndex >= 0 ? args[statusIndex + 1] : null

/** The file's bytes, or null when the link doesn't give an Excel file. */
async function download(url) {
  try {
    const response = await fetch(url, { redirect: 'follow' })
    if (!response.ok) return null
    const bytes = Buffer.from(await response.arrayBuffer())
    // .xlsx files are zip archives, which start with "PK".
    return bytes.subarray(0, 2).toString() === 'PK' ? bytes : null
  } catch {
    return null
  }
}

/** Excel cell → plain value (numbers stay numbers). */
function cellValue(value) {
  if (value == null) return null
  if (typeof value !== 'object') return value
  if ('result' in value) return value.result
  if ('richText' in value) return value.richText.map((part) => part.text).join('')
  if ('text' in value) return value.text
  return null
}

async function readSheets(bytes) {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(bytes)
  const sheets = []
  workbook.eachSheet((sheet) => {
    const rows = []
    sheet.eachRow({ includeEmpty: false }, (row) => {
      rows.push(row.values.slice(1).map(cellValue))
    })
    sheets.push({ name: sheet.name, rows })
  })
  return sheets
}

const source = JSON.parse(fs.readFileSync(SOURCE_FILE, 'utf8'))
const status = { changed: false, brokenLink: false, missingTerm: null, url: source.url }

let bytes = null
for (const url of guessUrls()) {
  if (url === source.url) continue
  bytes = await download(url)
  if (bytes) {
    console.log(`Found a newer upload: ${url}`)
    status.url = url
    break
  }
}
if (!bytes) bytes = await download(source.url)

if (!bytes) {
  status.brokenLink = true
  console.log(`The saved link no longer gives the bidding file: ${source.url}`)
} else {
  const sheets = await readSheets(bytes)
  const rows = parseBiddingSheets(sheets)
  const csv = toBiddingCsv(rows)
  const before = fs.existsSync(OUTPUT_FILE) ? fs.readFileSync(OUTPUT_FILE, 'utf8') : ''
  status.changed = csv !== before || status.url !== source.url
  status.missingTerm = missingTerm(sheets.map((s) => s.name))

  console.log(`${sheets.length} semesters, ${rows.length} sections.`)
  console.log(status.changed ? 'Bidding history changed.' : 'No changes.')
  if (status.missingTerm) console.log(`The file has no ${status.missingTerm} tab yet.`)

  if (status.changed && !checkOnly) {
    fs.writeFileSync(OUTPUT_FILE, csv)
    if (status.url !== source.url) {
      fs.writeFileSync(SOURCE_FILE, `${JSON.stringify({ ...source, url: status.url }, null, 2)}\n`)
    }
  }
}

if (statusFile) fs.writeFileSync(statusFile, `${JSON.stringify(status)}\n`)
