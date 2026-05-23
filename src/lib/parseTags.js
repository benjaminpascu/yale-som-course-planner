import Papa from 'papaparse'
import { REQUIRED_TAG_COLUMNS, validateCsvColumns } from './csvColumns.js'

/**
 * @param {string} csvText
 * @returns {{ ok: true } | { ok: false, missing: string[] }}
 */
export function validateTagsCsvColumns(csvText) {
  const firstLine = csvText.split(/\r?\n/)[0]
  if (!firstLine) {
    return { ok: false, missing: REQUIRED_TAG_COLUMNS }
  }
  const { data } = Papa.parse(firstLine, { header: false })
  const headers = data[0] ?? []
  return validateCsvColumns(headers, REQUIRED_TAG_COLUMNS)
}

/**
 * Parse course_tags.csv into tag mapping rows.
 * @param {string} csvText
 * @param {{ validate?: boolean }} [options]
 */
export function parseTagsCsv(csvText, { validate = true } = {}) {
  if (validate) {
    const columnCheck = validateTagsCsvColumns(csvText)
    if (!columnCheck.ok) {
      throw new Error(
        `Tags CSV is missing required columns: ${columnCheck.missing.join(', ')}`,
      )
    }
  }

  const { data, errors } = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
  })

  if (errors.length > 0) {
    console.warn('Tags CSV parse warnings:', errors)
  }

  return data.map((row) => ({
    courseNumber: row.course_number?.trim() ?? '',
    tagCode: row.tag_code?.trim() ?? '',
    tagLabel: row.tag_label?.trim() ?? '',
  }))
}

/** App tag → Supabase `tags` row (snake_case). */
export function tagToDbRow(tag) {
  return {
    course_number: tag.courseNumber,
    tag_code: tag.tagCode,
    tag_label: tag.tagLabel,
  }
}

/** Supabase row → app tag (camelCase). */
export function dbRowToTag(row) {
  return {
    courseNumber: row.course_number,
    tagCode: row.tag_code,
    tagLabel: row.tag_label,
  }
}
