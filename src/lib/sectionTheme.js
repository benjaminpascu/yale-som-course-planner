/**
 * Section backgrounds: white → light grey → greyish navy (top → bottom).
 */
export const SECTION_TONE = {
  calendar: {
    section: 'bg-white',
    header: 'border-gray-200 bg-gray-50',
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
  filters: {
    section: 'bg-yale-100',
    header: 'border-yale-200 bg-yale-150',
    inset: 'bg-white border-yale-200',
  },
  catalog: {
    section: 'bg-gray-100',
    header: 'border-yale-700 bg-yale-800 text-white',
    inset: 'bg-white border-gray-200',
  },
}

/** @param {keyof SECTION_TONE} tone */
export function sectionTone(tone) {
  return SECTION_TONE[tone] ?? SECTION_TONE.catalog
}

/** Course added to plan — light blue tint (catalog rows + plan cards). */
export const IN_PLAN_SURFACE =
  'border-yale-200 bg-yale-selected ring-2 ring-inset ring-yale-200/90'
