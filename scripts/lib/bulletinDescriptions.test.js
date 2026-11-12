import { describe, expect, it, vi } from 'vitest'
import { bulletinUrl, fillMissingDescriptions, parseBulletinDescription } from './bulletinDescriptions.js'

const answer = `<?xml version="1.0"?>
<courseinfo>
<course code="GLBL 5015">
<![CDATA[
<div class="courseblock">
<p class="hangindent courseblocktitle"><strong>GLBL&#160;5015a, Negotiation</strong> &#8194;<span class="instructor">Barry Nalebuff and Daylian Cain</span></p>
<p class="courseblockdesc">
This half-semester course presents a principled approach to negotiation, based on game theory. &#8194;<span class="keeptogether">&#189; Course cr</span><br/>Th 3:30pm-6pm</p>
</div>
]]>
</course>
</courseinfo>`

describe('Bulletin descriptions', () => {
  it('keeps only the description text', () => {
    expect(parseBulletinDescription(answer)).toBe(
      'This half-semester course presents a principled approach to negotiation, based on game theory.',
    )
  })

  it('gives an empty string for a course not in the Bulletin', () => {
    expect(parseBulletinDescription('<?xml version="1.0"?>\n<courseinfo>\n</courseinfo>')).toBe('')
  })

  it('looks a course up by its number', () => {
    expect(bulletinUrl('EP&E 4301')).toContain('code=EP%26E%204301')
  })
})

it('keeps existing descriptions and looks up Bulletin text only for remaining blanks', async () => {
  const current = { 'Course Number': 'GLBL 7077', 'Course Description': 'Course Search text' }
  const published = { 'Course Number': 'GLBL 6574', 'Course Description': '' }
  const blank = { 'Course Number': 'GLBL 5805', 'Cross Listings': 'FILM 5805', 'Course Description': '' }
  const lookup = vi.fn().mockResolvedValueOnce('').mockResolvedValueOnce('Cross-listed Bulletin text')

  await fillMissingDescriptions([current, published, blank], lookup, row => row === published ? 'Published text' : '')

  expect(current['Course Description']).toBe('Course Search text')
  expect(published['Course Description']).toBe('Published text')
  expect(blank['Course Description']).toBe('Cross-listed Bulletin text')
  expect(lookup.mock.calls).toEqual([['GLBL 5805'], ['FILM 5805']])
})
