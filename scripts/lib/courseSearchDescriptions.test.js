import { describe, expect, it, vi } from 'vitest'
import { refreshCourseSearchDescriptions } from './courseSearchDescriptions.js'
import { buildYaleRows } from './yaleImport.js'

const termCode = '202701'
const checkedOn = '2026-11-12'
const section = (crn, overrides = {}) => ({
  schoolCode: 'GB', termCode, crn, subjectNumber: 'GLBL7077', sectionNumber: '01', ...overrides,
})
const listing = (crn, overrides = {}) => ({ crn, srcdb: termCode, code: 'GLBL 7077', key: '123', ...overrides })
const detail = (crn, overrides = {}) => ({ ...listing(crn), description: '<p>FOSE &amp; policy.</p>', ...overrides })
const refresh = (sections, saved, request, previousDescriptions = new Map()) => {
  const catalog = buildYaleRows(sections, termCode)
  return refreshCourseSearchDescriptions(catalog, saved, { checkedOn, request, previousDescriptions })
    .then(report => ({ ...report, rows: catalog.rows }))
}

describe('Yale Course Search descriptions', () => {
  it('fills gaps across schools by term and CRN and leaves sections with v3 text alone', async () => {
    const sections = [
      section('20466'),
      section('25114', { schoolCode: 'MU', subjectNumber: 'MUS502' }),
      section('20467', { schoolCode: 'YC', subjectNumber: 'HIST1234', description: 'Regular feed text.' }),
      section('20468', { cSectionStatus: 'C', sectionNumber: '03' }),
    ]
    const request = vi.fn()
      .mockResolvedValueOnce({ results: [listing('20466'), listing('20468')] })
      .mockResolvedValueOnce(detail('20466'))
      .mockResolvedValueOnce({ results: [listing('25114', { code: 'MUS 502' })] })
      .mockResolvedValueOnce(detail('25114', { description: 'Music description.' }))
    const { attempted, received, updated, rows, problems } = await refresh(sections, new Map(), request)

    expect({ attempted, received, updated, problems }).toEqual({ attempted: 2, received: 2, updated: 2, problems: [] })
    expect(request.mock.calls).toEqual([
      ['search', { other: { srcdb: termCode }, criteria: [{ field: 'col', value: 'GB' }], _pers: {} }],
      ['details', { group: 'code:GLBL 7077', key: 'crn:20466', srcdb: termCode, matched: 'crn:20466', _pers: {} }],
      ['search', { other: { srcdb: termCode }, criteria: [{ field: 'col', value: 'MU' }], _pers: {} }],
      ['details', { group: 'code:MUS 502', key: 'crn:25114', srcdb: termCode, matched: 'crn:25114', _pers: {} }],
    ])
    expect(rows.find(row => row.School === 'MU')['Course Description']).toBe('Music description.')
    expect(rows.find(row => row.School === 'YC')['Course Description']).toBe('Regular feed text.')
  })

  it.each([
    ['fatal response', { fatal: 'unavailable' }],
    ['wrong term', detail('20466', { srcdb: '202603' })],
    ['wrong CRN', detail('99999')],
    ['missing description field', listing('20466')],
    ['HTTP failure', new Error('HTTP 202')],
  ])('keeps cached text and reports a %s', async (_name, answer) => {
    const saved = new Map([['202701:20466', { text: 'Last good text.', checkedOn: '2026-11-01' }]])
    const request = vi.fn().mockResolvedValueOnce({ results: [listing('20466')] })
    if (answer instanceof Error) request.mockRejectedValueOnce(answer)
    else request.mockResolvedValueOnce(answer)

    const { attempted, received, updated, rows, problems } = await refresh([section('20466')], saved, request)
    expect([attempted, received, updated]).toEqual([1, 0, 0])
    expect(problems).toHaveLength(1)
    expect(rows[0]['Course Description']).toBe('Last good text.')
  })

  it('accepts valid blank descriptions without treating the endpoint as down', async () => {
    const request = vi.fn()
      .mockResolvedValueOnce({ results: [listing('20466')] })
      .mockResolvedValueOnce(detail('20466', { description: '<p>&nbsp;</p>' }))

    expect(await refresh([section('20466')], new Map(), request)).toMatchObject({
      attempted: 1, received: 1, updated: 0, problems: [],
    })
  })

  it('reports a short search while still filling the listings it found', async () => {
    const request = vi.fn()
      .mockResolvedValueOnce({ results: [listing('20466')] })
      .mockResolvedValueOnce(detail('20466'))
    const check = await refresh([section('20466'), section('20467', { sectionNumber: '02' })], new Map(), request)
    expect(check).toMatchObject({ attempted: 2, received: 1, updated: 1 })
    expect(check.problems).toEqual([expect.stringContaining('20467')])
  })

  it('bounds each run and gives a section with no published text priority', async () => {
    const sections = Array.from({ length: 81 }, (_, index) => section(String(21000 + index), {
      sectionNumber: String(index + 1).padStart(2, '0'),
    }))
    const published = new Map(buildYaleRows(sections.slice(0, 80), termCode).rows.map(row => [
      row['Course ID'], 'Published text.',
    ]))
    const request = vi.fn(async (route, payload) => route === 'search'
      ? { results: sections.map(({ crn }) => listing(crn)) }
      : detail(payload.key.slice('crn:'.length)))
    const report = await refresh(sections, new Map(), request, published)

    expect(report).toMatchObject({ attempted: 80, received: 80, updated: 80 })
    expect(request.mock.calls[1][1].key).toBe('crn:21080')
  })

  it('checks a known-good section even when the cache is fresh and flags a lost description', async () => {
    const saved = new Map([
      ['202701:20466', { text: 'Last good text.', checkedOn }],
      ['202701:20467', { text: '', checkedOn }],
    ])
    const request = vi.fn()
      .mockResolvedValueOnce({ results: [listing('20466'), listing('20467')] })
      .mockResolvedValueOnce(detail('20466', { description: '' }))
    const check = await refresh([section('20466'), section('20467', { sectionNumber: '02' })], saved, request)

    expect(check).toMatchObject({ attempted: 1, received: 1, updated: 0 })
    expect(check.problems).toEqual([expect.stringContaining('20466')])
    expect(check.rows[0]['Course Description']).toBe('Last good text.')
  })
})
