import { describe, expect, it } from 'vitest'

import {
  DEFAULT_TEMPERATURE,
  MAX_WORDS_PER_TURN,
  PERSONA_MAX_TOKENS,
  ROUND_INSTRUCTIONS,
  SYNTHESIS_MAX_TOKENS,
  buildSystemPrompt,
  buildTurnPrompt,
} from './prompt'
import { TRANSCRIPT_CHAR_BUDGET } from './transcript'
import type { CouncilSnapshot, CouncilSnapshotMember, TranscriptTurn } from './types'

const SNAPSHOT: CouncilSnapshot = {
  name: 'Decision Panel',
  rounds: 2,
  members: [
    { name: 'The Pragmatist', role: 'Delivery practitioner', charter: 'Ship it.', color: '#111111' },
    { name: 'The Skeptic', role: 'Evidence checker', charter: 'Prove it.', color: '#222222' },
    { name: 'The Visionary', role: 'Long-range thinker', charter: 'Imagine it.', color: '#333333' },
  ],
}

const CHAIR: CouncilSnapshotMember = {
  name: 'The Chair',
  role: 'Synthesizer',
  charter: 'You close the session.',
  color: '#444444',
}

function makeTurn(turn: Partial<TranscriptTurn> & { seq: number }): TranscriptTurn {
  return {
    kind: 'persona',
    speakerName: 'The Pragmatist',
    round: 1,
    content: 'content',
    status: 'complete',
    ...turn,
  }
}

describe('buildTurnPrompt round instructions', () => {
  const cases = [
    { kind: 'opening' as const, round: 1 },
    { kind: 'rebuttal' as const, round: 2 },
    { kind: 'synthesis' as const, round: 2 },
  ]

  it('uses each round-specific instruction and only that one', () => {
    for (const { kind, round } of cases) {
      const built = buildTurnPrompt({
        topic: 'Should we rewrite the service?',
        snapshot: SNAPSHOT,
        turns: [makeTurn({ seq: 0 })],
        speaker: kind === 'synthesis' ? CHAIR : SNAPSHOT.members[0],
        round,
        kind,
      })

      expect(built.prompt).toContain(ROUND_INSTRUCTIONS[kind])
      for (const other of cases.filter((c) => c.kind !== kind)) {
        expect(built.prompt).not.toContain(ROUND_INSTRUCTIONS[other.kind])
      }
    }
  })

  it('matches PRD §5.2 wording by substring', () => {
    expect(ROUND_INSTRUCTIONS.opening).toContain('Give your opening position on the topic.')
    expect(ROUND_INSTRUCTIONS.rebuttal).toContain('rebut, concede, or build')
    expect(ROUND_INSTRUCTIONS.rebuttal).toContain('Do not restate your opening.')
    expect(ROUND_INSTRUCTIONS.synthesis).toContain('(1) points of agreement')
    expect(ROUND_INSTRUCTIONS.synthesis).toContain('unresolved disagreements')
    expect(ROUND_INSTRUCTIONS.synthesis).toContain('a concrete recommendation')
  })
})

describe('buildSystemPrompt', () => {
  it('opens with the charter and states the word cap', () => {
    const system = buildSystemPrompt({
      charter: 'You judge every proposal by what it takes to ship.',
      speakerName: 'The Pragmatist',
      role: 'Delivery practitioner',
      round: 1,
    })

    expect(system.startsWith('You judge every proposal by what it takes to ship.')).toBe(true)
    expect(system).toContain(`under ${MAX_WORDS_PER_TURN} words`)
    expect(system).toContain('300')
    expect(system).toContain('Stay in persona')
    expect(system).toContain('interjection')
  })

  it('adds the engage-by-name rule from round 2 onward only', () => {
    const base = {
      charter: 'c',
      speakerName: 'The Skeptic',
      role: 'Evidence checker',
    }
    expect(buildSystemPrompt({ ...base, round: 1 })).not.toContain('by persona name')
    expect(buildSystemPrompt({ ...base, round: 2 })).toContain('by persona name')
    expect(buildSystemPrompt({ ...base, round: 5 })).toContain('by persona name')
    expect(buildSystemPrompt({ ...base, round: 3, isSynthesis: true })).not.toContain(
      'by persona name',
    )
  })
})

describe('buildTurnPrompt composition', () => {
  const turns = [
    makeTurn({ seq: 0, speakerName: 'The Pragmatist', content: 'ship the small version' }),
    makeTurn({ seq: 1, speakerName: 'The Skeptic', status: 'failed', content: 'never happened' }),
    makeTurn({ seq: 2, speakerName: 'The Visionary', content: 'think bigger' }),
  ]

  it('includes the topic, the roster in speaking order and the transcript', () => {
    const built = buildTurnPrompt({
      topic: 'Rewrite in Rust?',
      snapshot: SNAPSHOT,
      turns,
      speaker: SNAPSHOT.members[1],
      round: 2,
      kind: 'rebuttal',
    })

    expect(built.prompt).toContain('Rewrite in Rust?')
    for (const member of SNAPSHOT.members) {
      expect(built.prompt).toContain(`- ${member.name} — ${member.role}`)
    }
    const rosterOrder = SNAPSHOT.members.map((m) => built.prompt.indexOf(`- ${m.name} —`))
    expect(rosterOrder).toEqual([...rosterOrder].sort((a, b) => a - b))
    expect(built.prompt).toContain('ship the small version')
    expect(built.prompt).toContain('think bigger')
    expect(built.prompt).toContain('YOUR TASK (Round 2)')
  })

  it('never shows a failed turn to the speaker', () => {
    const built = buildTurnPrompt({
      topic: 'Rewrite in Rust?',
      snapshot: SNAPSHOT,
      turns,
      speaker: SNAPSHOT.members[1],
      round: 2,
      kind: 'rebuttal',
    })
    expect(built.prompt).not.toContain('never happened')
  })

  it('renders a placeholder when nothing has been said yet', () => {
    const built = buildTurnPrompt({
      topic: 'Rewrite in Rust?',
      snapshot: SNAPSHOT,
      turns: [],
      speaker: SNAPSHOT.members[0],
      round: 1,
      kind: 'opening',
    })
    expect(built.prompt).toContain('No turns yet. You speak first.')
  })

  it('surfaces the budgeter’s dropped seqs', () => {
    const long = [
      makeTurn({ seq: 0, round: 1, content: 'opening' }),
      makeTurn({ seq: 1, round: 2, content: 'a'.repeat(20_000) }),
      makeTurn({ seq: 2, round: 2, content: 'b'.repeat(20_000) }),
    ]
    const built = buildTurnPrompt({
      topic: 'Rewrite in Rust?',
      snapshot: SNAPSHOT,
      turns: long,
      speaker: SNAPSHOT.members[0],
      round: 3,
      kind: 'rebuttal',
    })

    expect(built.droppedSeqs).toEqual([1])
    expect(built.prompt).not.toContain('a'.repeat(20_000))
    expect(built.prompt).toContain('b'.repeat(20_000))
    expect(built.prompt.length).toBeLessThan(TRANSCRIPT_CHAR_BUDGET + 2_000)
  })

  it('applies the PRD §5.2 generation defaults', () => {
    const persona = buildTurnPrompt({
      topic: 't',
      snapshot: SNAPSHOT,
      turns: [],
      speaker: SNAPSHOT.members[0],
      round: 1,
      kind: 'opening',
    })
    const synthesis = buildTurnPrompt({
      topic: 't',
      snapshot: SNAPSHOT,
      turns: [],
      speaker: CHAIR,
      round: 2,
      kind: 'synthesis',
    })

    expect(persona.maxTokens).toBe(PERSONA_MAX_TOKENS)
    expect(persona.maxTokens).toBe(700)
    expect(synthesis.maxTokens).toBe(SYNTHESIS_MAX_TOKENS)
    expect(synthesis.maxTokens).toBe(1200)
    expect(persona.temperature).toBe(DEFAULT_TEMPERATURE)
    expect(synthesis.temperature).toBe(0.7)
    expect(synthesis.system).toContain(CHAIR.charter)
  })

  it('produces an object shaped like the provider module’s generate options', () => {
    // Structural check only: `lib/llm`'s GenerateOptions is duplicated here rather
    // than imported, because this module must stay free of provider imports. The
    // real compatibility is enforced by typecheck at the T-012 call site.
    type GenerateOptionsShape = {
      system: string
      prompt: string
      maxTokens: number
      temperature?: number
    }
    const built = buildTurnPrompt({
      topic: 't',
      snapshot: SNAPSHOT,
      turns: [],
      speaker: SNAPSHOT.members[0],
      round: 1,
      kind: 'opening',
    })
    const options: GenerateOptionsShape = built
    expect(options.system.length).toBeGreaterThan(0)
    expect(options.prompt.length).toBeGreaterThan(0)
  })
})
