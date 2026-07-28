import { describe, expect, it } from 'vitest'

import {
  CONVENER_LABEL,
  TRANSCRIPT_CHAR_BUDGET,
  budgetTranscript,
  formatTurn,
} from './transcript'
import type { TranscriptTurn } from './types'

const MEMBERS = ['A', 'B', 'C']
const SEPARATOR_CHARS = 2

function makeTurn(turn: Partial<TranscriptTurn> & { seq: number }): TranscriptTurn {
  return {
    kind: 'persona',
    speakerName: 'A',
    round: 1,
    content: 'content',
    status: 'complete',
    ...turn,
  }
}

/**
 * Round-1 openings, then rounds 2–5 of long persona turns (well past the 24,000
 * char budget), with an interjection and a synthesis interleaved mid-transcript.
 */
function makeOverBudgetTranscript(): TranscriptTurn[] {
  const turns: TranscriptTurn[] = []
  let seq = 0

  for (const name of MEMBERS) {
    turns.push(makeTurn({ seq: seq++, speakerName: name, round: 1, content: `opening by ${name}` }))
  }

  for (let round = 2; round <= 5; round += 1) {
    for (const name of MEMBERS) {
      turns.push(
        makeTurn({
          seq: seq++,
          speakerName: name,
          round,
          content: `${name} r${round} `.padEnd(2500, 'x'),
        }),
      )
    }
    if (round === 3) {
      turns.push(
        makeTurn({
          seq: seq++,
          kind: 'interjection',
          speakerName: null,
          round,
          content: 'focus on cost',
        }),
      )
      turns.push(
        makeTurn({
          seq: seq++,
          kind: 'synthesis',
          speakerName: 'The Chair',
          round,
          content: 'interim synthesis',
        }),
      )
    }
  }

  return turns
}

describe('formatTurn', () => {
  it('labels persona, interjection and synthesis turns distinctly', () => {
    expect(formatTurn(makeTurn({ seq: 0, speakerName: 'A', round: 2, content: 'hello' }))).toBe(
      '[Round 2] A: hello',
    )
    expect(
      formatTurn(
        makeTurn({ seq: 1, kind: 'interjection', speakerName: null, round: 2, content: 'note' }),
      ),
    ).toBe(`[Round 2] ${CONVENER_LABEL} (interjection): note`)
    expect(
      formatTurn(
        makeTurn({ seq: 2, kind: 'synthesis', speakerName: 'The Chair', round: 2, content: 'sum' }),
      ),
    ).toBe('[Round 2] The Chair (synthesis): sum')
  })

  it('throws loudly when a persona turn has no speaker name', () => {
    expect(() => formatTurn(makeTurn({ seq: 0, speakerName: null }))).toThrow(/speaker name/i)
  })
})

describe('budgetTranscript', () => {
  it('excludes failed turns entirely', () => {
    const turns = [
      makeTurn({ seq: 0, content: 'kept opening' }),
      makeTurn({ seq: 1, speakerName: 'B', status: 'failed', content: 'provider exploded' }),
      makeTurn({ seq: 2, speakerName: 'C', content: 'kept too' }),
    ]
    const result = budgetTranscript({ topic: 'topic', turns })

    expect(result.turns.map((t) => t.seq)).toEqual([0, 2])
    expect(result.droppedSeqs).toEqual([])
    expect(result.turns.map(formatTurn).join('\n')).not.toContain('provider exploded')
  })

  it('keeps everything and drops nothing when under budget', () => {
    const turns = [0, 1, 2].map((seq) => makeTurn({ seq, round: seq === 0 ? 1 : 3 }))
    const result = budgetTranscript({ topic: 'topic', turns })

    expect(result.turns.map((t) => t.seq)).toEqual([0, 1, 2])
    expect(result.droppedSeqs).toEqual([])
    expect(result.chars).toBeLessThanOrEqual(TRANSCRIPT_CHAR_BUDGET)
  })

  it('drops oldest middle-round persona turns first while protecting openings, interjections and syntheses', () => {
    const turns = makeOverBudgetTranscript()
    const unbudgeted = budgetTranscript({
      topic: 'topic',
      turns,
      charBudget: Number.MAX_SAFE_INTEGER,
    })
    expect(unbudgeted.chars).toBeGreaterThan(TRANSCRIPT_CHAR_BUDGET)

    const result = budgetTranscript({ topic: 'topic', turns })
    const keptSeqs = result.turns.map((t) => t.seq)
    const bySeq = new Map(turns.map((t) => [t.seq, t]))

    // Protected: all Round-1 openings, every interjection, every synthesis.
    for (const turn of turns) {
      if (turn.kind !== 'persona' || turn.round === 1) {
        expect(keptSeqs).toContain(turn.seq)
      }
    }

    // Dropped: only middle-round persona turns, oldest first, contiguous from the
    // lowest droppable seq.
    expect(result.droppedSeqs.length).toBeGreaterThan(0)
    for (const seq of result.droppedSeqs) {
      const turn = bySeq.get(seq)
      expect(turn?.kind).toBe('persona')
      expect(turn?.round).toBeGreaterThanOrEqual(2)
    }
    const droppableSeqs = turns
      .filter((t) => t.kind === 'persona' && t.round >= 2)
      .map((t) => t.seq)
    expect(result.droppedSeqs).toEqual(droppableSeqs.slice(0, result.droppedSeqs.length))

    // The most recent droppable turn survives.
    expect(keptSeqs).toContain(droppableSeqs[droppableSeqs.length - 1])

    // Fits the budget, and stops dropping as soon as it fits.
    expect(result.chars).toBeLessThanOrEqual(TRANSCRIPT_CHAR_BUDGET)
    const lastDropped = bySeq.get(result.droppedSeqs[result.droppedSeqs.length - 1])!
    expect(result.chars + formatTurn(lastDropped).length + SEPARATOR_CHARS).toBeGreaterThan(
      TRANSCRIPT_CHAR_BUDGET,
    )
  })

  it('never drops protected turns even when they alone exceed the budget', () => {
    const turns = MEMBERS.map((name, i) =>
      makeTurn({ seq: i, speakerName: name, round: 1, content: 'x'.repeat(10_000) }),
    )
    const result = budgetTranscript({ topic: 'topic', turns })

    expect(result.turns.map((t) => t.seq)).toEqual([0, 1, 2])
    expect(result.droppedSeqs).toEqual([])
    expect(result.chars).toBeGreaterThan(TRANSCRIPT_CHAR_BUDGET)
  })
})
