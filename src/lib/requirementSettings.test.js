import { describe, expect, it } from 'vitest'
import {
  REQUIREMENT_SETTINGS_KEY,
  defaultRequirementSettings,
  loadRequirementSettings,
  normalizeRequirementSettings,
  persistRequirementSettings,
  requirementRows,
} from './requirementSettings.js'
import { REQUIREMENT_TARGETS_KEY } from './requirementTargets.js'

function memoryStorage(initial = {}) {
  const data = { ...initial }
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = String(v)
    },
    data,
  }
}

const tags = ['GBS Req', 'STEM']

describe('defaults', () => {
  it('Semester Total on, Year Total off, no requirements', () => {
    expect(defaultRequirementSettings()).toEqual({
      semester: { on: true, target: null },
      year: { on: false, target: null },
      tags: {},
    })
  })
})

describe('normalizeRequirementSettings', () => {
  it('keeps known requirements and valid targets only', () => {
    const raw = {
      semester: { on: true, target: 18 },
      year: { on: 'yes', target: -3 },
      tags: { STEM: { on: true, target: '8' }, Gone: { on: true, target: 4 } },
    }
    expect(normalizeRequirementSettings(raw, tags)).toEqual({
      semester: { on: true, target: 18 },
      year: { on: false, target: null },
      tags: { STEM: { on: true, target: 8 } },
    })
  })

  it('falls back to the defaults for junk', () => {
    expect(normalizeRequirementSettings(null, tags)).toEqual(defaultRequirementSettings())
  })
})

describe('load / persist', () => {
  it('round-trips', () => {
    const storage = memoryStorage()
    const settings = {
      semester: { on: true, target: 18 },
      year: { on: true, target: 36 },
      tags: { 'GBS Req': { on: true, target: 8 } },
    }
    persistRequirementSettings(settings, tags, storage)
    expect(loadRequirementSettings(tags, storage)).toEqual(settings)
  })

  it('first time: requirements that already had a target start ticked', () => {
    const storage = memoryStorage({ [REQUIREMENT_TARGETS_KEY]: JSON.stringify({ 'GBS Req': 8 }) })
    expect(loadRequirementSettings(tags, storage)).toEqual({
      semester: { on: true, target: null },
      year: { on: false, target: null },
      tags: { 'GBS Req': { on: true, target: 8 } },
    })
  })

  it('nothing saved: the defaults', () => {
    expect(loadRequirementSettings(tags, memoryStorage())).toEqual(defaultRequirementSettings())
  })

  it('unreadable data: the defaults', () => {
    const storage = memoryStorage({ [REQUIREMENT_SETTINGS_KEY]: '{oops' })
    expect(loadRequirementSettings(tags, storage)).toEqual(defaultRequirementSettings())
  })
})

describe('requirementRows', () => {
  const course = (courseNumber, session, units, courseTags = []) => ({
    courseNumber,
    title: courseNumber,
    session,
    units,
    tags: courseTags,
  })
  const plan = [
    course('MGT 510', 'fall', 4, ['STEM']),
    course('MGT 402', 'fall-1', 2),
    course('MGT 523', 'spring', 4, ['GBS Req']),
  ]

  it('shows only ticked lines: Semester, Year, then requirements in catalog order', () => {
    const settings = {
      semester: { on: true, target: 18 },
      year: { on: true, target: 36 },
      tags: { STEM: { on: true, target: 8 }, 'GBS Req': { on: false, target: 4 } },
    }
    const rows = requirementRows({ planCourses: plan, semester: 'fall', tagNames: tags, settings })
    expect(rows.map((r) => [r.label, r.totalUnits, r.targetUnits, Boolean(r.isTotal)])).toEqual([
      ['Semester', 6, 18, true],
      ['Year', 10, 36, true],
      ['STEM', 4, 8, false],
    ])
  })

  it('requirements count only the semester being viewed', () => {
    const settings = { ...defaultRequirementSettings(), tags: { 'GBS Req': { on: true, target: null } } }
    const rows = requirementRows({ planCourses: plan, semester: 'spring', tagNames: tags, settings })
    expect(rows.map((r) => [r.label, r.totalUnits])).toEqual([
      ['Semester', 4],
      ['GBS Req', 4],
    ])
  })

  it('nothing ticked: no rows', () => {
    const settings = { semester: { on: false, target: null }, year: { on: false, target: null }, tags: {} }
    expect(requirementRows({ planCourses: plan, semester: 'fall', tagNames: tags, settings })).toEqual([])
  })
})
