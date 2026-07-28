import { describe, expect, it } from 'vitest'

import {
  MAX_GENERATED_TURNS,
  canGenerate,
  currentRound,
  nextSpeaker,
  nextTurnSeq,
} from './scheduler'
import type { CouncilSnapshot, SessionState, TranscriptTurn } from './types'

function makeSnapshot(names: string[], rounds = 2): CouncilSnapshot {
  return {
    name: 'Decision Panel',
    rounds,
    members: names.map((name) => ({
      name,
      role: `${name} role`,
      charter: `${name} charter`,
      color: '#000000',
    })),
  }
}

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

function makeState(over: Partial<SessionState> = {}): SessionState {
  return {
    status: 'active',
    snapshot: makeSnapshot(['A', 'B', 'C']),
    turns: [],
    generatedTurns: 0,
    ...over,
  }
}

function expectOk(decision: ReturnType<typeof nextSpeaker>) {
  if (!decision.ok) throw new Error(`expected a speaker, got refusal: ${decision.reason}`)
  return decision
}

describe('nextSpeaker', () => {
  it('cycles the speaking order across three rounds', () => {
    const state = makeState({ snapshot: makeSnapshot(['A', 'B', 'C'], 3) })
    const walked: Array<{ speakerName: string; round: number; seq: number; atRoundStart: boolean }> =
      []

    for (let i = 0; i < 7; i += 1) {
      const decision = expectOk(nextSpeaker(state))
      walked.push({
        speakerName: decision.speakerName,
        round: decision.round,
        seq: decision.seq,
        atRoundStart: decision.atRoundStart,
      })
      state.turns.push(
        makeTurn({ seq: decision.seq, speakerName: decision.speakerName, round: decision.round }),
      )
      state.generatedTurns += 1
    }

    expect(walked.map((w) => `${w.speakerName}/${w.round}`)).toEqual([
      'A/1',
      'B/1',
      'C/1',
      'A/2',
      'B/2',
      'C/2',
      'A/3',
    ])
    expect(walked.map((w) => w.seq)).toEqual([0, 1, 2, 3, 4, 5, 6])
    expect(walked.filter((w) => w.atRoundStart).map((w) => w.seq)).toEqual([0, 3, 6])
  })

  it('labels round 1 an opening and later rounds a rebuttal', () => {
    const empty = makeState()
    expect(expectOk(nextSpeaker(empty)).roundType).toBe('opening')

    const laterRound = makeState({
      turns: [0, 1, 2].map((seq) => makeTurn({ seq })),
    })
    const decision = expectOk(nextSpeaker(laterRound))
    expect(decision.round).toBe(2)
    expect(decision.roundType).toBe('rebuttal')
  })

  it('does not let an interjection consume a persona slot', () => {
    const before = makeState({ turns: [makeTurn({ seq: 0 })] })
    const baseline = expectOk(nextSpeaker(before))
    expect(baseline.speakerName).toBe('B')

    const after = makeState({
      turns: [
        makeTurn({ seq: 0 }),
        makeTurn({ seq: 1, kind: 'interjection', speakerName: null, content: 'steer left' }),
      ],
    })
    const decision = expectOk(nextSpeaker(after))
    expect(decision.speakerName).toBe(baseline.speakerName)
    expect(decision.memberIndex).toBe(baseline.memberIndex)
    expect(decision.round).toBe(baseline.round)
    expect(decision.seq).toBe(baseline.seq + 1)
  })

  it('decides identically before and after an interjection, whatever the round', () => {
    // T-020 acceptance: the scheduler is unaffected by interjections. Compared
    // field by field rather than by "the same name", so a change to the round,
    // the member index, the round type, or the round-start flag would fail here.
    for (const spoken of [0, 1, 2, 3, 4, 5]) {
      const turns = Array.from({ length: spoken }, (_, seq) => makeTurn({ seq }))
      const before = expectOk(nextSpeaker(makeState({ turns, generatedTurns: spoken })))

      const withNote = makeState({
        turns: [
          ...turns,
          makeTurn({
            seq: spoken,
            kind: 'interjection',
            speakerName: null,
            content: 'focus on the migration cost',
          }),
        ],
        generatedTurns: spoken,
      })
      const after = expectOk(nextSpeaker(withNote))

      expect({ ...after, seq: after.seq - 1 }).toEqual(before)
      // Spelled out, because this is the criterion the task names.
      expect(after.speakerName).toBe(before.speakerName)
      expect(after.memberIndex).toBe(before.memberIndex)
      expect(after.round).toBe(before.round)
      expect(after.roundType).toBe(before.roundType)
      expect(after.atRoundStart).toBe(before.atRoundStart)
      expect(after.plannedRoundsComplete).toBe(before.plannedRoundsComplete)
      // Only the transcript slot moves.
      expect(after.seq).toBe(before.seq + 1)
      expect(currentRound(withNote)).toBe(currentRound(makeState({ turns })))
    }
  })

  it('does not let a synthesis consume a persona slot', () => {
    const turns = [0, 1, 2].map((seq) => makeTurn({ seq }))
    const baseline = expectOk(nextSpeaker(makeState({ turns })))

    const withSynthesis = makeState({
      turns: [...turns, makeTurn({ seq: 3, kind: 'synthesis', speakerName: 'The Chair', round: 1 })],
    })
    const decision = expectOk(nextSpeaker(withSynthesis))
    expect(decision.speakerName).toBe(baseline.speakerName)
    expect(decision.memberIndex).toBe(baseline.memberIndex)
    expect(decision.round).toBe(baseline.round)
    expect(decision.seq).toBe(baseline.seq + 1)
  })

  it('flags the planned-rounds boundary without refusing to continue', () => {
    const state = makeState({
      snapshot: makeSnapshot(['A', 'B', 'C'], 2),
      turns: Array.from({ length: 6 }, (_, seq) => makeTurn({ seq })),
      generatedTurns: 6,
    })
    const decision = expectOk(nextSpeaker(state))
    expect(decision.round).toBe(3)
    expect(decision.plannedRoundsComplete).toBe(true)

    const midRun = expectOk(nextSpeaker(makeState()))
    expect(midRun.plannedRoundsComplete).toBe(false)
  })
})

describe('canGenerate', () => {
  it('caps a session at 60 generated turns and rejects turn 61', () => {
    expect(MAX_GENERATED_TURNS).toBe(60)

    const under = makeState({ generatedTurns: MAX_GENERATED_TURNS - 1 })
    expect(canGenerate(under)).toEqual({ ok: true })
    expect(nextSpeaker(under).ok).toBe(true)

    const at = makeState({ generatedTurns: MAX_GENERATED_TURNS })
    const refusal = canGenerate(at)
    expect(refusal.ok).toBe(false)
    if (refusal.ok) throw new Error('unreachable')
    expect(refusal.reason).toBe('cap-reached')
    expect(refusal.message).toContain('60')

    const speakerRefusal = nextSpeaker(at)
    expect(speakerRefusal.ok).toBe(false)
    if (speakerRefusal.ok) throw new Error('unreachable')
    expect(speakerRefusal.reason).toBe('cap-reached')
  })

  it('blocks generation while the latest turn is failed, and unblocks on retry', () => {
    const failed = makeState({
      turns: [makeTurn({ seq: 0 }), makeTurn({ seq: 1, speakerName: 'B', status: 'failed' })],
      generatedTurns: 2,
    })
    const refusal = canGenerate(failed)
    expect(refusal.ok).toBe(false)
    if (refusal.ok) throw new Error('unreachable')
    expect(refusal.reason).toBe('awaiting-retry')

    const retried = makeState({
      turns: [makeTurn({ seq: 0 }), makeTurn({ seq: 1, speakerName: 'B', status: 'complete' })],
      generatedTurns: 3,
    })
    expect(canGenerate(retried)).toEqual({ ok: true })
    expect(expectOk(nextSpeaker(retried)).speakerName).toBe('C')
  })

  it('refuses on non-active sessions', () => {
    for (const status of ['completed', 'abandoned'] as const) {
      const refusal = canGenerate(makeState({ status }))
      expect(refusal.ok).toBe(false)
      if (refusal.ok) throw new Error('unreachable')
      expect(refusal.reason).toBe('session-not-active')
      expect(refusal.message).toContain(status)
    }
  })
})

describe('currentRound and nextTurnSeq', () => {
  it('starts at round 1, seq 0 on an empty transcript', () => {
    expect(currentRound(makeState())).toBe(1)
    expect(nextTurnSeq([])).toBe(0)
  })

  it('counts only completed persona turns toward the round', () => {
    const state = makeState({
      turns: [
        makeTurn({ seq: 0 }),
        makeTurn({ seq: 1, kind: 'interjection', speakerName: null }),
        makeTurn({ seq: 2, speakerName: 'B' }),
        makeTurn({ seq: 3, speakerName: 'C', status: 'failed' }),
      ],
    })
    expect(currentRound(state)).toBe(1)
    expect(nextTurnSeq(state.turns)).toBe(4)
  })

  it('throws loudly when the snapshot has no members', () => {
    const state = makeState({ snapshot: makeSnapshot([]) })
    expect(() => currentRound(state)).toThrow(/no members/i)
    expect(() => nextSpeaker(state)).toThrow(/no members/i)
  })
})
