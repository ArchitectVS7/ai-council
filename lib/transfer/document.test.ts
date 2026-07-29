/**
 * The session-document builder (T-031).
 *
 * Pure data in, pure data out — no database, no provider, no clock.
 */
import { describe, expect, it } from 'vitest'

import { SESSION_DOCUMENT_VERSION, sessionJsonFilename, toSessionDocument } from './document'

const SNAPSHOT = {
  name: 'Decision Panel',
  rounds: 2,
  members: [
    { name: 'Pragmatist', role: 'Ships things', charter: 'Focus on what is buildable.', color: '#2563eb' },
    { name: 'Skeptic', role: 'Doubts things', charter: 'Challenge every assumption.', color: '#dc2626' },
  ],
}

type Source = Parameters<typeof toSessionDocument>[0]
type SourceTurn = Source['turns'][number]

function turn(overrides: Partial<SourceTurn> & { seq: number }): SourceTurn {
  return {
    kind: 'persona',
    speakerName: 'Pragmatist',
    round: 1,
    content: 'Ship it.',
    status: 'complete',
    error: null,
    model: 'claude-sonnet-5',
    promptTokens: 100,
    completionTokens: 20,
    createdAt: '2026-07-28T09:16:00.000Z',
    ...overrides,
  }
}

function source(overrides: Partial<Source> = {}): Source {
  return {
    topic: 'Should we ship on Friday?',
    model: null,
    status: 'active',
    turnCursor: 3,
    createdAt: '2026-07-28T09:15:00.000Z',
    completedAt: null,
    councilSnapshot: SNAPSHOT,
    turns: [turn({ seq: 0 })],
    ...overrides,
  }
}

describe('toSessionDocument', () => {
  it('stamps the format version', () => {
    expect(toSessionDocument(source()).schemaVersion).toBe(SESSION_DOCUMENT_VERSION)
  })

  it('normalizes timestamps to ISO-8601 UTC, whether they arrive as Date or string', () => {
    const asString = toSessionDocument(source())
    const asDate = toSessionDocument(
      source({
        createdAt: new Date('2026-07-28T09:15:00.000Z'),
        turns: [turn({ seq: 0, createdAt: new Date('2026-07-28T09:16:00.000Z') })],
      }),
    )

    expect(asDate).toEqual(asString)
    expect(asString.session.createdAt).toBe('2026-07-28T09:15:00.000Z')
    expect(asString.turns[0].createdAt).toBe('2026-07-28T09:16:00.000Z')
  })

  it('carries completedAt when the session has one', () => {
    const document = toSessionDocument(
      source({ status: 'completed', completedAt: new Date('2026-07-28T10:00:00.000Z') }),
    )

    expect(document.session.completedAt).toBe('2026-07-28T10:00:00.000Z')
  })

  it('throws on an unreadable session timestamp rather than emitting a hole (R4)', () => {
    expect(() => toSessionDocument(source({ createdAt: 'the other day' }))).toThrow(
      /unreadable createdAt/,
    )
  })

  it('throws on an unreadable turn timestamp, naming the turn', () => {
    expect(() =>
      toSessionDocument(source({ turns: [turn({ seq: 4, createdAt: 'yesterday' })] })),
    ).toThrow(/turn 4 createdAt/)
  })

  it('sorts turns by seq without reordering the caller’s array', () => {
    const turns = [turn({ seq: 2 }), turn({ seq: 0 }), turn({ seq: 1 })]
    const document = toSessionDocument(source({ turns }))

    expect(document.turns.map((t) => t.seq)).toEqual([0, 1, 2])
    expect(turns.map((t) => t.seq)).toEqual([2, 0, 1])
  })

  it('keeps failed turns — this is an archive, not a reader’s document', () => {
    const turns = [
      turn({ seq: 0 }),
      turn({ seq: 1, status: 'failed', content: '', error: 'overloaded_error' }),
    ]
    const document = toSessionDocument(source({ turns }))

    expect(document.turns).toHaveLength(2)
    expect(document.turns[1]).toMatchObject({ status: 'failed', error: 'overloaded_error' })
  })

  it('carries no row identity: no session id, no council id, no updatedAt, no turn ids', () => {
    // The extra keys stand in for the columns a real row carries; none may leak.
    // Bound to a variable first so it is passed the way a drizzle row is —
    // structurally assignable, with columns the document has no place for.
    const row = {
      ...source(),
      id: 'session-1',
      councilId: 'council-1',
      updatedAt: '2026-07-28T09:20:00.000Z',
      turns: [{ ...turn({ seq: 0 }), id: 'turn-1', sessionId: 'session-1' }],
    }
    const document = toSessionDocument(row)

    expect(Object.keys(document.session)).not.toContain('id')
    expect(Object.keys(document.session)).not.toContain('councilId')
    expect(Object.keys(document.session)).not.toContain('updatedAt')
    expect(Object.keys(document.turns[0])).not.toContain('id')
    expect(Object.keys(document.turns[0])).not.toContain('sessionId')
  })

  it('emits a fixed key order, so two exports of the same session are byte-identical', () => {
    const document = toSessionDocument(source())

    expect(Object.keys(document)).toEqual(['schemaVersion', 'session', 'turns'])
    expect(Object.keys(document.session)).toEqual([
      'topic',
      'model',
      'status',
      'turnCursor',
      'createdAt',
      'completedAt',
      'councilSnapshot',
    ])
    expect(Object.keys(document.session.councilSnapshot)).toEqual(['name', 'rounds', 'members'])
    expect(Object.keys(document.session.councilSnapshot.members[0])).toEqual([
      'name',
      'role',
      'charter',
      'color',
    ])
    expect(Object.keys(document.turns[0])).toEqual([
      'seq',
      'kind',
      'speakerName',
      'round',
      'content',
      'status',
      'error',
      'model',
      'promptTokens',
      'completionTokens',
      'createdAt',
    ])
  })

  it('rebuilds the snapshot rather than aliasing the caller’s object', () => {
    const input = source()
    const document = toSessionDocument(input)

    expect(document.session.councilSnapshot).not.toBe(input.councilSnapshot)
    expect(document.session.councilSnapshot.members[0]).not.toBe(input.councilSnapshot.members[0])
    expect(document.session.councilSnapshot).toEqual(input.councilSnapshot)
  })
})

describe('sessionJsonFilename', () => {
  it('is the shared session basename with a .json extension', () => {
    expect(
      sessionJsonFilename({ topic: 'Should we ship on Friday?', createdAt: '2026-07-28T09:15:00.000Z' }),
    ).toBe('council-session-should-we-ship-on-friday-2026-07-28.json')
  })

  it('falls back to a stable slug when the topic has no usable characters', () => {
    expect(sessionJsonFilename({ topic: '???', createdAt: '2026-07-28T09:15:00.000Z' })).toBe(
      'council-session-session-2026-07-28.json',
    )
  })
})
