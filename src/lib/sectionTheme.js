/** Yale navy section title bar (white text). */
const INVERSE_HEADER = 'border-yale-700 bg-yale-800 text-white'

/**
 * Section backgrounds: white → light grey → greyish navy (top → bottom).
 */
export const SECTION_TONE = {
  calendar: {
    section: 'bg-white',
    header: 'border-gray-200 bg-gray-100',
    inset: 'bg-white border-gray-200',
  },
  requirements: {
    section: 'bg-gray-50',
    header: 'border-gray-200 bg-gray-100',
    inset: 'bg-white border-gray-200',
  },
  plan: {
    section: 'bg-yale-50',
    header: 'border-yale-150 bg-yale-100',
    inset: 'bg-white border-yale-150',
  },
  /** Dark blue breaker — groups saved + current plan panels. */
  plansBreaker: {
    section: 'bg-yale-50',
    header: INVERSE_HEADER,
    inset: 'bg-white border-yale-150',
  },
  filters: {
    section: 'bg-yale-100',
    header: 'border-yale-200 bg-yale-150',
    inset: 'bg-white border-yale-200',
  },
  catalog: {
    section: 'bg-gray-100',
    header: INVERSE_HEADER,
    inset: 'bg-white border-gray-200',
  },
}

/** @param {keyof SECTION_TONE} tone */
export function sectionTone(tone) {
  return SECTION_TONE[tone] ?? SECTION_TONE.catalog
}

/** Yale navy headers (white title text). */
export function isInverseSectionTone(tone) {
  return tone === 'catalog' || tone === 'plansBreaker'
}

/** Course added to plan — light blue tint (catalog rows + plan cards). */
export const IN_PLAN_SURFACE =
  'border-yale-200 bg-yale-selected ring-2 ring-inset ring-yale-200/90'

/** Primary save action (plans). */
export const SAVE_BUTTON =
  'bg-save-800 text-white hover:bg-save-900 disabled:cursor-not-allowed disabled:opacity-50'
