import { describe, expect, it } from 'vitest'

import {
  ADDRESS_INTERJECTION_INSTRUCTION,
  CONVENER_NOTE_HEADING,
  COUNCIL_DIRECTIVE_HEADING,
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

describe('addressing a pending interjection (PRD §5.2)', () => {
  const NOTE = 'Stop arguing about tooling and cost the migration in engineer-months.'
  const OLDER_NOTE = 'Please keep the customer in view.'

  function note(seq: number, content: string, over: Partial<TranscriptTurn> = {}): TranscriptTurn {
    return makeTurn({ seq, kind: 'interjection', speakerName: null, content, ...over })
  }

  function build(turns: TranscriptTurn[], speaker = SNAPSHOT.members[1], round = 2) {
    return buildTurnPrompt({
      topic: 'Rewrite in Rust?',
      snapshot: SNAPSHOT,
      turns,
      speaker,
      round,
      kind: round === 1 ? 'opening' : 'rebuttal',
    })
  }

  /** The note block only, so a match cannot come from the transcript rendering. */
  function noteBlock(prompt: string): string {
    const start = prompt.indexOf(CONVENER_NOTE_HEADING)
    expect(start).toBeGreaterThanOrEqual(0)
    return prompt.slice(start)
  }

  it('adds nothing when there is no interjection', () => {
    const built = build([makeTurn({ seq: 0 })])

    expect(built.prompt).not.toContain(CONVENER_NOTE_HEADING)
    expect(built.prompt).not.toContain(ADDRESS_INTERJECTION_INSTRUCTION)
  })

  it('quotes the interjection text and instructs the speaker to address it', () => {
    const built = build([makeTurn({ seq: 0 }), note(1, NOTE)])

    expect(built.prompt).toContain(NOTE)
    expect(built.prompt).toContain(ADDRESS_INTERJECTION_INSTRUCTION)
    // Between the transcript and the task, adjacent to the round instruction.
    expect(built.prompt.indexOf('TRANSCRIPT:')).toBeLessThan(
      built.prompt.indexOf(CONVENER_NOTE_HEADING),
    )
    expect(built.prompt.indexOf(CONVENER_NOTE_HEADING)).toBeLessThan(
      built.prompt.indexOf('YOUR TASK (Round 2)'),
    )
    expect(built.prompt.indexOf(ROUND_INSTRUCTIONS.rebuttal)).toBeLessThan(
      built.prompt.indexOf(ADDRESS_INTERJECTION_INSTRUCTION),
    )
  })

  it('quotes only the latest interjection', () => {
    const built = build([makeTurn({ seq: 0 }), note(1, OLDER_NOTE), note(2, NOTE)])

    const block = noteBlock(built.prompt)
    expect(block).toContain(NOTE)
    expect(block).not.toContain(OLDER_NOTE)
    // The older note is still visible in the transcript — nothing is hidden.
    expect(built.prompt).toContain(OLDER_NOTE)
  })

  it('is pending only for speakers who have not spoken since it landed', () => {
    const turns = [
      note(0, NOTE),
      makeTurn({ seq: 1, speakerName: 'The Pragmatist', content: 'answered it' }),
    ]

    // The Pragmatist already had its say after the note.
    expect(build(turns, SNAPSHOT.members[0]).prompt).not.toContain(CONVENER_NOTE_HEADING)
    // The Skeptic has not.
    expect(noteBlock(build(turns, SNAPSHOT.members[1]).prompt)).toContain(NOTE)
  })

  it('stays pending across the speaker’s own failed turn, so the retry addresses it', () => {
    const turns = [
      note(0, NOTE),
      makeTurn({ seq: 1, speakerName: 'The Skeptic', status: 'failed', content: '' }),
    ]

    expect(noteBlock(build(turns, SNAPSHOT.members[1]).prompt)).toContain(NOTE)
  })

  it('ignores an interjection that itself failed', () => {
    const built = build([makeTurn({ seq: 0 }), note(1, NOTE, { status: 'failed' })])
    expect(built.prompt).not.toContain(CONVENER_NOTE_HEADING)
  })

  it('applies to the Chair: a note after the previous synthesis is pending', () => {
    const answered = [
      makeTurn({ seq: 0 }),
      note(1, NOTE),
      makeTurn({ seq: 2, kind: 'synthesis', speakerName: CHAIR.name, content: 'first result' }),
    ]
    const chairBuild = (turns: TranscriptTurn[]) =>
      buildTurnPrompt({
        topic: 'Rewrite in Rust?',
        snapshot: SNAPSHOT,
        turns,
        speaker: CHAIR,
        round: 3,
        kind: 'synthesis',
      })

    expect(chairBuild(answered).prompt).not.toContain(CONVENER_NOTE_HEADING)

    const reopened = [...answered, note(3, 'Now weigh the rollback plan.', { round: 3 })]
    const block = noteBlock(chairBuild(reopened).prompt)
    expect(block).toContain('Now weigh the rollback plan.')
    expect(block).toContain('(Round 3)')
  })
})

describe('the council directive (PRD Amendment A3)', () => {
  const DIRECTIVE = 'Argue adversarially. Do not converge until the evidence forces it.'

  const WITH_DIRECTIVE: CouncilSnapshot = { ...SNAPSHOT, directive: DIRECTIVE }

  /**
   * A snapshot frozen before A3 shipped: the key is not merely null, it is
   * absent. The cast is the point — this is the shape already sitting in jsonb.
   */
  const PRE_A3: CouncilSnapshot = {
    name: SNAPSHOT.name,
    rounds: SNAPSHOT.rounds,
    members: SNAPSHOT.members,
  } as CouncilSnapshot

  function build(snapshot: CouncilSnapshot, kind: 'opening' | 'rebuttal' | 'synthesis') {
    return buildTurnPrompt({
      topic: 'Rewrite in Rust?',
      snapshot,
      turns: [makeTurn({ seq: 0 })],
      speaker: kind === 'synthesis' ? CHAIR : SNAPSHOT.members[0],
      round: 2,
      kind,
    })
  }

  it('places the block between the charter and COUNCIL RULES on a persona turn', () => {
    const system = build(WITH_DIRECTIVE, 'rebuttal').system

    expect(system).toContain(COUNCIL_DIRECTIVE_HEADING)
    expect(system).toContain(DIRECTIVE)
    expect(system.indexOf(SNAPSHOT.members[0].charter)).toBeLessThan(
      system.indexOf(COUNCIL_DIRECTIVE_HEADING),
    )
    expect(system.indexOf(COUNCIL_DIRECTIVE_HEADING)).toBeLessThan(
      system.indexOf('COUNCIL RULES:'),
    )
    // The heading is immediately followed by the directive text, on its own line.
    expect(system).toContain(`${COUNCIL_DIRECTIVE_HEADING}\n${DIRECTIVE}`)
  })

  it('reaches the Chair too: the synthesis turn carries the same block', () => {
    const system = build(WITH_DIRECTIVE, 'synthesis').system

    expect(system).toContain(COUNCIL_DIRECTIVE_HEADING)
    expect(system).toContain(DIRECTIVE)
    expect(system.indexOf(CHAIR.charter)).toBeLessThan(system.indexOf(COUNCIL_DIRECTIVE_HEADING))
    expect(system.indexOf(COUNCIL_DIRECTIVE_HEADING)).toBeLessThan(
      system.indexOf('COUNCIL RULES:'),
    )
  })

  it('omits the block entirely when the snapshot carries no directive', () => {
    for (const kind of ['rebuttal', 'synthesis'] as const) {
      const system = build({ ...SNAPSHOT, directive: null }, kind).system
      expect(system).not.toContain('COUNCIL DIRECTIVE')
    }
  })

  it('builds an old-shape snapshot without the key at all, byte-identically to a null one', () => {
    for (const kind of ['opening', 'rebuttal', 'synthesis'] as const) {
      const legacy = build(PRE_A3, kind)
      expect(legacy.system).not.toContain('COUNCIL DIRECTIVE')
      expect(legacy.system).toBe(build({ ...SNAPSHOT, directive: null }, kind).system)
    }
  })

  it('treats a whitespace-only directive as none', () => {
    expect(build({ ...SNAPSHOT, directive: '   \n ' }, 'rebuttal').system).not.toContain(
      'COUNCIL DIRECTIVE',
    )
  })

  it('never leaks the directive into the user prompt — it is a system-prompt rule', () => {
    expect(build(WITH_DIRECTIVE, 'rebuttal').prompt).not.toContain(DIRECTIVE)
  })
})
