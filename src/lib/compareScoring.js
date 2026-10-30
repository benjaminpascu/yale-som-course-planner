/**
 * Compare Courses score math. Criteria: `{ id, name, weight }`, weights are
 * decimals meant to add up to 1. Ratings: `{ [criterionId]: 1..10 }` per course.
 */

const EMPTY_TONE = { bg: '#ffffff', fg: '#1a1f2b', bd: '#c5ced9' }
const TONE_BANDS = [
  { max: 2, bg: '#f6d4cf', fg: '#7a1810', bd: '#e3a197' },
  { max: 4, bg: '#fbe0c8', fg: '#7a3d0a', bd: '#ecbd92' },
  { max: 6, bg: '#fcefc0', fg: '#634800', bd: '#e6d283' },
  { max: 8, bg: '#d8eecd', fg: '#1f5a1c', bd: '#a6d295' },
  { max: 10, bg: '#a9d99c', fg: '#0f420f', bd: '#7cbf6b' },
]

/** Light background, dark text and border for a rating or (rounded) weighted score. */
export function ratingTone(value) {
  if (typeof value !== 'number') return EMPTY_TONE
  const rounded = Math.round(value)
  const { bg, fg, bd } = TONE_BANDS.find((band) => rounded <= band.max) ?? TONE_BANDS.at(-1)
  return { bg, fg, bd }
}

/** sum(weight × rating) ÷ sum(weight), over the criteria this course has a rating for. */
export function weightedScore(courseRatings, criteria) {
  let sum = 0
  let totalWeight = 0
  for (const c of criteria) {
    const rating = courseRatings?.[c.id]
    if (typeof rating !== 'number' || !(c.weight > 0)) continue
    sum += rating * c.weight
    totalWeight += c.weight
  }
  return totalWeight > 0 ? sum / totalWeight : null
}

export function weightsNeedFix(criteria) {
  const total = criteria.reduce((sum, c) => sum + c.weight, 0)
  return Math.abs(total - 1) >= 0.005
}

/** Rescale weights to add up to 1 (all zero → equal). */
export function normalizeWeights(criteria) {
  const total = criteria.reduce((sum, c) => sum + c.weight, 0)
  return criteria.map((c) => ({
    ...c,
    weight: total > 0 ? c.weight / total : 1 / criteria.length,
  }))
}

/** A typed weight: decimal 0–1, or undefined while the text isn't one. */
export function parseWeightInput(text) {
  const trimmed = text.trim()
  if (!/^(\d+(\.\d*)?|\.\d+)$/.test(trimmed)) return undefined
  const value = Number(trimmed)
  return value >= 0 && value <= 1 ? value : undefined
}

/**
 * Text typed into a rating box: number 1–10, null to clear, undefined if invalid.
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
 * Value a rating box should hold while the student types: the parsed rating,
 * or — while the text is invalid — the value from before editing began, so a
 * half-typed "11" or "7.5" never leaves its first digit saved.
 */
export function scoreToCommit(text, valueAtFocus) {
  const parsed = parseScoreInput(text)
  return parsed === undefined ? valueAtFocus : parsed
}

/** Scored courses, highest weighted score first (ties keep shortlist order). */
export function rankCourses(groups, ratings, criteria) {
  const scored = []
  let unscored = 0
  for (const group of groups) {
    const score = weightedScore(ratings[group.key], criteria)
    if (score == null) unscored += 1
    else scored.push({ group, score })
  }
  scored.sort((a, b) => b.score - a.score)
  return { ranked: scored, unscored }
}
