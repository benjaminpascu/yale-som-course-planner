/**
 * Compare Courses score math. Criteria: `{ id, name, weight, kind }` where
 * kind `professor` takes its value from professor ratings instead of a
 * per-course score.
 */

/** Light red → green fills for scores 1..10; dark text stays readable on all. */
export const SCORE_COLORS = [
  '#fca5a5',
  '#fcb4a0',
  '#fdc49b',
  '#fdd597',
  '#fde68a',
  '#eaee8f',
  '#d4ec98',
  '#bce5a0',
  '#a3dca5',
  '#86d19c',
]

/** Highest rating among a course's rated professors, or null. */
export function professorValue(professors, ratings) {
  let best = null
  for (const name of professors) {
    const rating = ratings?.[name]?.rating
    if (typeof rating === 'number' && (best == null || rating > best)) best = rating
  }
  return best
}

/**
 * Weighted average over criteria that have a value (weight > 0 only).
 *
 * @returns {{ score: number | null, complete: boolean }}
 */
export function computeCourseScore(group, criteria, courseScores, ratings) {
  let weighted = 0
  let totalWeight = 0
  let complete = true

  for (const criterion of criteria) {
    if (!(criterion.weight > 0)) continue
    const value =
      criterion.kind === 'professor'
        ? professorValue(group.professors, ratings)
        : courseScores?.[criterion.id]
    if (typeof value !== 'number') {
      complete = false
      continue
    }
    weighted += value * criterion.weight
    totalWeight += criterion.weight
  }

  if (totalWeight === 0) return { score: null, complete }
  return { score: Math.round((weighted / totalWeight) * 10) / 10, complete }
}

/** Each criterion's share of the total weight, as a whole percent. */
export function weightShares(criteria) {
  const total = criteria.reduce((sum, c) => sum + Math.max(0, c.weight), 0)
  return Object.fromEntries(
    criteria.map((c) => [
      c.id,
      total > 0 ? Math.round((100 * Math.max(0, c.weight)) / total) : 0,
    ]),
  )
}

/**
 * Text typed into a score cell: number 1–10, null to clear, undefined if invalid.
 *
 * @param {string} text
 */
export function parseScoreInput(text) {
  const trimmed = text.trim()
  if (trimmed === '') return null
  if (!/^(10|[1-9])$/.test(trimmed)) return undefined
  return Number(trimmed)
}

/**
 * Value a score cell should hold while the student types: the parsed score,
 * or — while the text is invalid — the value from before editing began, so a
 * half-typed "11" or "7.5" never leaves its first digit saved.
 */
export function scoreToCommit(text, valueAtFocus) {
  const parsed = parseScoreInput(text)
  return parsed === undefined ? valueAtFocus : parsed
}

/** Fill color for a score (final scores are rounded to the nearest step). */
export function scoreColor(value) {
  if (typeof value !== 'number') return null
  const step = Math.min(10, Math.max(1, Math.round(value)))
  return SCORE_COLORS[step - 1]
}

function isEmpty(value) {
  return value == null || value === ''
}

/** Stable sort; empty values always last. */
export function sortRows(rows, sortKey, direction, getValue) {
  const sign = direction === 'asc' ? 1 : -1
  return rows
    .map((row, index) => ({ row, index, value: getValue(row, sortKey) }))
    .sort((a, b) => {
      const aEmpty = isEmpty(a.value)
      const bEmpty = isEmpty(b.value)
      if (aEmpty || bEmpty) {
        if (aEmpty && bEmpty) return a.index - b.index
        return aEmpty ? 1 : -1
      }
      const cmp =
        typeof a.value === 'string' || typeof b.value === 'string'
          ? String(a.value).localeCompare(String(b.value))
          : a.value - b.value
      return cmp === 0 ? a.index - b.index : sign * cmp
    })
    .map(({ row }) => row)
}

/**
 * Row order while the student is typing: keep the frozen order so rows don't
 * jump, drop rows that left, append new ones in sorted order.
 */
export function orderRowKeys(sortedKeys, frozenKeys) {
  if (!frozenKeys) return sortedKeys
  const present = new Set(sortedKeys)
  const kept = frozenKeys.filter((key) => present.has(key))
  const keptSet = new Set(kept)
  return [...kept, ...sortedKeys.filter((key) => !keptSet.has(key))]
}
