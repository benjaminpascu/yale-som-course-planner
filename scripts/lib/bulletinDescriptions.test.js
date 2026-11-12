import { describe, expect, it } from 'vitest'
import { bulletinUrl, parseBulletinDescription } from './bulletinDescriptions.js'

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
