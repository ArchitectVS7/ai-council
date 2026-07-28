import { describe, expect, it } from 'vitest'

import { exportSessionMarkdown, markdownFilename } from './export-md'
import type { CouncilSnapshot, TranscriptTurn } from './types'

const CREATED_AT = '2026-07-28T09:15:00.000Z'
const TOPIC = 'Should we ship on Friday?'
const FAILED_CONTENT = 'this text was never generated'

const SNAPSHOT: CouncilSnapshot = {
  name: 'Decision Panel',
  rounds: 2,
  members: [
    { name: 'Pragmatist', role: 'Ships things', charter: 'Focus on what is buildable.', color: '#2563eb' },
    { name: 'Skeptic', role: 'Doubts things', charter: 'Challenge every assumption.', color: '#dc2626' },
  ],
}

function makeTurn(turn: Partial<TranscriptTurn> & { seq: number }): TranscriptTurn {
  return {
    kind: 'persona',
    speakerName: 'Pragmatist',
    round: 1,
    content: 'content',
    status: 'complete',
    ...turn,
  }
}

/** One session exercising every branch: rounds, an interjection, a failure, two syntheses. */
function fixtureTurns(): TranscriptTurn[] {
  return [
    makeTurn({ seq: 0, speakerName: 'Pragmatist', round: 1, content: 'The build is green; ship it.' }),
    makeTurn({
      seq: 1,
      kind: 'interjection',
      speakerName: null,
      round: 1,
      content: 'Please account for the on-call rota.\n\nAnd the freeze window.',
    }),
    makeTurn({ seq: 2, speakerName: 'Skeptic', round: 1, content: FAILED_CONTENT, status: 'failed' }),
    makeTurn({
      seq: 3,
      kind: 'synthesis',
      speakerName: 'The Chair',
      round: 1,
      content: 'An earlier synthesis, before the session was reopened.',
    }),
    makeTurn({ seq: 4, speakerName: 'Skeptic', round: 2, content: 'Friday deploys are how weekends die.' }),
    makeTurn({
      seq: 5,
      kind: 'synthesis',
      speakerName: 'The Chair',
      round: 2,
      content: 'The council leans toward shipping with a rollback plan.',
    }),
  ]
}

function serialize(turns: TranscriptTurn[] = fixtureTurns()): string {
  return exportSessionMarkdown({ topic: TOPIC, snapshot: SNAPSHOT, createdAt: CREATED_AT, turns })
}

describe('exportSessionMarkdown header', () => {
  it('opens with the document title and the topic, council and date fields', () => {
    const md = serialize()

    expect(md.startsWith('# AI Council Session\n')).toBe(true)
    expect(md).toContain(`- **Topic:** ${TOPIC}`)
    expect(md).toContain('- **Council:** Decision Panel')
    expect(md).toContain('- **Date:** 2026-07-28')
  })

  it('names the council from the snapshot and never an id (PRD §7)', () => {
    const md = exportSessionMarkdown({
      topic: TOPIC,
      snapshot: { ...SNAPSHOT, name: 'Renamed Panel' },
      createdAt: CREATED_AT,
      turns: fixtureTurns(),
    })

    expect(md).toContain('- **Council:** Renamed Panel')
    expect(md).not.toContain('Decision Panel')
  })

  it('formats the date in UTC whether given a string or a Date', () => {
    const fromDate = exportSessionMarkdown({
      topic: TOPIC,
      snapshot: SNAPSHOT,
      createdAt: new Date(CREATED_AT),
      turns: [],
    })

    expect(fromDate).toContain('- **Date:** 2026-07-28')
    expect(fromDate).toBe(
      exportSessionMarkdown({ topic: TOPIC, snapshot: SNAPSHOT, createdAt: CREATED_AT, turns: [] }),
    )
  })
})

describe('exportSessionMarkdown rounds', () => {
  it('groups turns under ascending round headings with a speaker heading each', () => {
    const md = serialize()

    const round1 = md.indexOf('## Round 1')
    const round2 = md.indexOf('## Round 2')
    expect(round1).toBeGreaterThan(-1)
    expect(round2).toBeGreaterThan(round1)

    const pragmatist = md.indexOf('### Pragmatist')
    expect(pragmatist).toBeGreaterThan(round1)
    expect(pragmatist).toBeLessThan(round2)
    expect(md).toContain('### Pragmatist\n\nThe build is green; ship it.')

    const skeptic = md.indexOf('### Skeptic')
    expect(skeptic).toBeGreaterThan(round2)
    expect(md).toContain('### Skeptic\n\nFriday deploys are how weekends die.')
  })

  it('serializes in seq order regardless of input order, without mutating the input', () => {
    const turns = fixtureTurns()
    const shuffled = [turns[5], turns[0], turns[4], turns[3], turns[1], turns[2]]
    const before = shuffled.map((turn) => turn.seq)

    expect(exportSessionMarkdown({ topic: TOPIC, snapshot: SNAPSHOT, createdAt: CREATED_AT, turns: shuffled })).toBe(
      serialize(turns),
    )
    expect(shuffled.map((turn) => turn.seq)).toEqual(before)
  })

  it('emits header only when there are no turns', () => {
    const md = serialize([])

    expect(md).not.toContain('## Round')
    expect(md).not.toContain('## Synthesis')
    expect(md).toBe(
      [
        '# AI Council Session',
        '',
        `- **Topic:** ${TOPIC}`,
        '- **Council:** Decision Panel',
        '- **Date:** 2026-07-28',
        '',
      ].join('\n'),
    )
  })
})

describe('exportSessionMarkdown interjections', () => {
  it('renders an interjection as a Convener blockquote with no speaker heading', () => {
    const md = serialize()

    expect(md).toContain('> **Convener:** Please account for the on-call rota.\n>\n> And the freeze window.')
    // Every line of the interjection stays inside the quote.
    for (const line of md.split('\n')) {
      if (line.includes('freeze window')) expect(line.startsWith('> ')).toBe(true)
    }
    expect(md).not.toContain('### Convener')
  })
})

describe('exportSessionMarkdown synthesis', () => {
  it('collects syntheses into one trailing section and labels the latest Result', () => {
    const md = serialize()

    const section = md.indexOf('## Synthesis')
    expect(section).toBeGreaterThan(md.lastIndexOf('## Round'))
    expect(md.match(/^## Synthesis$/gm)).toHaveLength(1)

    const earlier = md.indexOf('### Synthesis — Round 1')
    const result = md.indexOf('### Result')
    expect(earlier).toBeGreaterThan(section)
    expect(result).toBeGreaterThan(earlier)
    expect(md.match(/^### Result$/gm)).toHaveLength(1)

    // Synthesis content lives only in that section, never inside a round.
    expect(md.indexOf('An earlier synthesis, before the session was reopened.')).toBeGreaterThan(section)
    expect(md.indexOf('The council leans toward shipping with a rollback plan.')).toBeGreaterThan(result)
  })

  it('omits the section entirely when no synthesis survived', () => {
    const md = serialize(fixtureTurns().filter((turn) => turn.kind !== 'synthesis'))

    expect(md).not.toContain('## Synthesis')
    expect(md).not.toContain('### Result')
  })
})

describe('exportSessionMarkdown failed turns', () => {
  it('omits a failed turn entirely', () => {
    const md = serialize()

    expect(md).not.toContain(FAILED_CONTENT)
    // The surviving round-1 turns are still there.
    expect(md).toContain('The build is green; ship it.')
  })

  it('emits no round heading when every turn of that round failed', () => {
    const md = serialize([
      makeTurn({ seq: 0, round: 1, content: 'The build is green; ship it.' }),
      makeTurn({ seq: 1, speakerName: 'Skeptic', round: 2, content: FAILED_CONTENT, status: 'failed' }),
    ])

    expect(md).toContain('## Round 1')
    expect(md).not.toContain('## Round 2')
    expect(md).not.toContain(FAILED_CONTENT)
  })
})

describe('exportSessionMarkdown loud failures', () => {
  it('throws on a persona turn with no speaker name', () => {
    expect(() => serialize([makeTurn({ seq: 0, speakerName: null })])).toThrow(/no speaker name/i)
  })

  it('throws on an unreadable createdAt rather than inventing a date', () => {
    expect(() =>
      exportSessionMarkdown({ topic: TOPIC, snapshot: SNAPSHOT, createdAt: 'not-a-date', turns: [] }),
    ).toThrow(/createdAt/)
  })
})

describe('exportSessionMarkdown document shape', () => {
  it('matches the full expected document', () => {
    expect(serialize()).toBe(
      [
        '# AI Council Session',
        '',
        `- **Topic:** ${TOPIC}`,
        '- **Council:** Decision Panel',
        '- **Date:** 2026-07-28',
        '',
        '## Round 1',
        '',
        '### Pragmatist',
        '',
        'The build is green; ship it.',
        '',
        '> **Convener:** Please account for the on-call rota.',
        '>',
        '> And the freeze window.',
        '',
        '## Round 2',
        '',
        '### Skeptic',
        '',
        'Friday deploys are how weekends die.',
        '',
        '## Synthesis',
        '',
        '### Synthesis — Round 1',
        '',
        'An earlier synthesis, before the session was reopened.',
        '',
        '### Result',
        '',
        'The council leans toward shipping with a rollback plan.',
        '',
      ].join('\n'),
    )
  })
})

describe('markdownFilename', () => {
  it('slugs the topic and carries the date', () => {
    expect(markdownFilename({ topic: TOPIC, createdAt: CREATED_AT })).toBe(
      'council-session-should-we-ship-on-friday-2026-07-28.md',
    )
  })

  it('falls back to a generic slug when the topic has no usable characters', () => {
    expect(markdownFilename({ topic: '!!! ???', createdAt: CREATED_AT })).toBe(
      'council-session-session-2026-07-28.md',
    )
  })

  it('truncates a very long topic without a trailing separator', () => {
    const name = markdownFilename({ topic: 'x '.repeat(200), createdAt: CREATED_AT })

    expect(name.endsWith('-2026-07-28.md')).toBe(true)
    expect(name).not.toContain('--')
    expect(name.length).toBeLessThan(100)
  })
})
