/**
 * The chamber's control predicates (T-021).
 *
 * Every case here corresponds to a refusal the server would issue in
 * `lib/session/turns.ts`, so the two stay in step.
 */
import { describe, expect, it } from 'vitest'

import { controlState, resultSeq } from './controls'
import type { ChamberTurn, ChamberView } from './types'

const SNAPSHOT = {
  name: 'Decision Panel',
  rounds: 2,
  members: [
    { name: 'Pragmatist', role: 'Ships things', charter: 'Focus on what is buildable.', color: '#2563eb' },
    { name: 'Skeptic', role: 'Doubts things', charter: 'Challenge every assumption.', color: '#dc2626' },
  ],
}

function turn(overrides: Partial<ChamberTurn> & { seq: number }): ChamberTurn {
  return {
    id: `turn-${overrides.seq}`,
    kind: 'persona',
    speakerName: 'Pragmatist',
    round: 1,
    content: 'Ship it.',
    status: 'complete',
    error: null,
    ...overrides,
  }
}

function view(overrides: { status?: ChamberView['session']['status']; turnCursor?: number; turns?: ChamberTurn[] } = {}): ChamberView {
  return {
    session: {
      id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
      topic: 'Should we ship on Friday?',
      status: overrides.status ?? 'active',
      turnCursor: overrides.turnCursor ?? 3,
      model: null,
      createdAt: '2026-07-28T09:15:00.000Z',
      councilSnapshot: SNAPSHOT,
    },
    turns: overrides.turns ?? [turn({ seq: 0 })],
    mockMode: true,
    localMode: false,
    defaultModel: 'mock',
  }
}

describe('controlState.canRegenerate', () => {
  it('is true when the latest turn is a complete persona turn on an active session', () => {
    expect(controlState(view(), false).canRegenerate).toBe(true)
  })

  it('is true when the latest turn is a complete synthesis', () => {
    const turns = [turn({ seq: 0 }), turn({ seq: 1, kind: 'synthesis', speakerName: 'The Chair' })]
    expect(controlState(view({ turns }), false).canRegenerate).toBe(true)
  })

  it('is false with no turns at all', () => {
    expect(controlState(view({ turns: [] }), false).canRegenerate).toBe(false)
  })

  it('is false when the latest turn is an interjection, which was never generated', () => {
    const turns = [turn({ seq: 0 }), turn({ seq: 1, kind: 'interjection', speakerName: null })]
    expect(controlState(view({ turns }), false).canRegenerate).toBe(false)
  })

  it('is false when the latest turn failed — that is Retry, not Regenerate', () => {
    const turns = [turn({ seq: 0 }), turn({ seq: 1, status: 'failed', content: '', error: 'boom' })]
    expect(controlState(view({ turns }), false).canRegenerate).toBe(false)
  })

  it('is false on a completed session, which must be reopened first', () => {
    expect(controlState(view({ status: 'completed' }), false).canRegenerate).toBe(false)
  })

  it('is false on an abandoned session', () => {
    expect(controlState(view({ status: 'abandoned' }), false).canRegenerate).toBe(false)
  })

  it('is false at the turn cap, because regenerating is a generation attempt', () => {
    expect(controlState(view({ turnCursor: 60 }), false).canRegenerate).toBe(false)
  })

  it('is false while a request is in flight', () => {
    expect(controlState(view(), true).canRegenerate).toBe(false)
  })

  it('reads the latest turn by seq, not by array position', () => {
    // Highest seq is the interjection, even though the array ends with a
    // complete persona turn.
    const turns = [turn({ seq: 2, kind: 'interjection', speakerName: null }), turn({ seq: 1 })]
    expect(controlState(view({ turns }), false).canRegenerate).toBe(false)
  })
})

describe('controlState.canInterject', () => {
  it('stays live at the turn cap — a note generates nothing (PRD §5.3)', () => {
    const state = controlState(view({ turnCursor: 60 }), false)

    expect(state.canGenerate).toBe(false)
    expect(state.canInterject).toBe(true)
  })

  it('is true on an active session with no turns yet', () => {
    expect(controlState(view({ turns: [] }), false).canInterject).toBe(true)
  })

  it('is false on a completed session', () => {
    expect(controlState(view({ status: 'completed' }), false).canInterject).toBe(false)
  })

  it('is false on an abandoned session', () => {
    expect(controlState(view({ status: 'abandoned' }), false).canInterject).toBe(false)
  })

  it('is false while the latest turn is failed and awaiting retry', () => {
    const turns = [turn({ seq: 0, status: 'failed', content: '', error: 'boom' })]
    expect(controlState(view({ turns }), false).canInterject).toBe(false)
  })

  it('is false while a request is in flight', () => {
    expect(controlState(view(), true).canInterject).toBe(false)
  })
})

describe('controlState reopen', () => {
  it('shows Reopen only on a completed session', () => {
    expect(controlState(view({ status: 'completed' }), false).showReopen).toBe(true)
    expect(controlState(view({ status: 'active' }), false).showReopen).toBe(false)
    expect(controlState(view({ status: 'abandoned' }), false).showReopen).toBe(false)
  })

  it('shows it but does not enable it while a request is in flight', () => {
    const state = controlState(view({ status: 'completed' }), true)

    expect(state.showReopen).toBe(true)
    expect(state.canReopen).toBe(false)
  })
})

describe('resultSeq', () => {
  it('is null when the session has no synthesis', () => {
    expect(resultSeq([turn({ seq: 0 }), turn({ seq: 1, kind: 'interjection', speakerName: null })])).toBeNull()
  })

  it('picks the later of two complete syntheses', () => {
    const turns = [
      turn({ seq: 0 }),
      turn({ seq: 1, kind: 'synthesis', speakerName: 'The Chair' }),
      turn({ seq: 2 }),
      turn({ seq: 3, kind: 'synthesis', speakerName: 'The Chair' }),
    ]
    expect(resultSeq(turns)).toBe(3)
  })

  it('ignores a failed synthesis even when it is the latest turn', () => {
    const turns = [
      turn({ seq: 1, kind: 'synthesis', speakerName: 'The Chair' }),
      turn({ seq: 3, kind: 'synthesis', speakerName: 'The Chair', status: 'failed', content: '', error: 'boom' }),
    ]
    expect(resultSeq(turns)).toBe(1)
  })

  it('ignores persona and interjection turns with a higher seq', () => {
    const turns = [
      turn({ seq: 1, kind: 'synthesis', speakerName: 'The Chair' }),
      turn({ seq: 2 }),
      turn({ seq: 3, kind: 'interjection', speakerName: null }),
    ]
    expect(resultSeq(turns)).toBe(1)
  })
})
