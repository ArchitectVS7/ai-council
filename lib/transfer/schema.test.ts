/**
 * The session-document validator (T-031).
 *
 * Each rejection asserts the issue *message*, because those are the exact
 * strings `describeFailure` appends to the sentence the convener reads on `/`.
 */
import { describe, expect, it } from 'vitest'

import { SESSION_DOCUMENT_VERSION, toSessionDocument } from './document'
import { sessionDocumentSchema } from './schema'

const SNAPSHOT = {
  name: 'Decision Panel',
  rounds: 2,
  members: [
    { name: 'Pragmatist', role: 'Ships things', charter: 'Focus on what is buildable.', color: '#2563eb' },
    { name: 'Skeptic', role: 'Doubts things', charter: 'Challenge every assumption.', color: '#dc2626' },
  ],
}

/** A valid document, as plain JSON, ready for a test to spoil one field of it. */
function document(): Record<string, unknown> {
  return JSON.parse(
    JSON.stringify(
      toSessionDocument({
        topic: 'Should we ship on Friday?',
        model: null,
        status: 'active',
        turnCursor: 3,
        createdAt: '2026-07-28T09:15:00.000Z',
        completedAt: null,
        councilSnapshot: SNAPSHOT,
        turns: [
          {
            seq: 0,
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
          },
          {
            seq: 1,
            kind: 'interjection',
            speakerName: null,
            round: 1,
            content: 'Stay on the rollback question.',
            status: 'complete',
            error: null,
            model: null,
            promptTokens: null,
            completionTokens: null,
            createdAt: '2026-07-28T09:17:00.000Z',
          },
          {
            seq: 2,
            kind: 'synthesis',
            speakerName: 'The Chair',
            round: 1,
            content: 'Ship behind a flag.',
            status: 'complete',
            error: null,
            model: 'claude-sonnet-5',
            promptTokens: 400,
            completionTokens: 80,
            createdAt: '2026-07-28T09:18:00.000Z',
          },
        ],
      }),
    ),
  ) as Record<string, unknown>
}

/** The issue messages a rejected parse produced; fails loudly if it was accepted. */
function messages(input: unknown): string[] {
  const parsed = sessionDocumentSchema.safeParse(input)
  expect(parsed.success, 'expected the document to be rejected').toBe(false)
  return parsed.error!.issues.map((issue) => issue.message)
}

/** Replace one key of `session` on an otherwise valid document. */
function withSession(patch: Record<string, unknown>): Record<string, unknown> {
  const doc = document()
  return { ...doc, session: { ...(doc.session as object), ...patch } }
}

/** Replace one key of the *first* turn on an otherwise valid document. */
function withFirstTurn(patch: Record<string, unknown>): Record<string, unknown> {
  const doc = document()
  const turns = doc.turns as Record<string, unknown>[]
  return { ...doc, turns: [{ ...turns[0], ...patch }, ...turns.slice(1)] }
}

describe('sessionDocumentSchema — acceptance', () => {
  it('accepts a document carrying a persona turn, an interjection, and a synthesis', () => {
    const parsed = sessionDocumentSchema.safeParse(document())

    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true)
    expect(parsed.data!.turns).toHaveLength(3)
  })

  it('accepts a synthesis speaker who sits in no speaking order (the Chair)', () => {
    // Already exercised above, stated on its own so the exemption is explicit.
    const doc = document()
    const turns = doc.turns as Record<string, unknown>[]
    expect(turns[2].speakerName).toBe('The Chair')
    expect(SNAPSHOT.members.map((m) => m.name)).not.toContain('The Chair')
    expect(sessionDocumentSchema.safeParse(doc).success).toBe(true)
  })

  it('accepts a round beyond the snapshot’s rounds — a reopened session keeps going', () => {
    expect(sessionDocumentSchema.safeParse(withFirstTurn({ round: 9 })).success).toBe(true)
  })
})

describe('sessionDocumentSchema — versioning', () => {
  it('refuses a document written by a version this build cannot read', () => {
    expect(messages({ ...document(), schemaVersion: SESSION_DOCUMENT_VERSION + 1 })).toContain(
      `Unsupported schemaVersion; this build reads version ${SESSION_DOCUMENT_VERSION}.`,
    )
  })
})

describe('sessionDocumentSchema — unknown keys are reported, never dropped', () => {
  it('refuses an unknown top-level key', () => {
    expect(messages({ ...document(), exportedAt: '2026-07-28T09:19:00.000Z' }).join(' ')).toMatch(
      /unrecognized key/i,
    )
  })

  it('refuses an unknown turn key', () => {
    expect(messages(withFirstTurn({ latencyMs: 900 })).join(' ')).toMatch(/unrecognized key/i)
  })

  it('refuses an unknown snapshot member key', () => {
    const doc = document()
    const session = doc.session as { councilSnapshot: { members: Record<string, unknown>[] } }
    session.councilSnapshot.members[0].personaId = '3f2504e0-4f89-41d3-9a0c-0305e82c3301'
    expect(messages(doc).join(' ')).toMatch(/unrecognized key/i)
  })
})

describe('sessionDocumentSchema — transcript ordering', () => {
  it('refuses a duplicate seq', () => {
    const doc = document()
    const turns = doc.turns as Record<string, unknown>[]
    expect(messages({ ...doc, turns: [turns[0], { ...turns[1], seq: 0 }] })).toContain(
      'Turn seq values must be unique and ascending.',
    )
  })

  it('refuses a descending seq', () => {
    const doc = document()
    const turns = doc.turns as Record<string, unknown>[]
    expect(messages({ ...doc, turns: [turns[2], turns[0]] })).toContain(
      'Turn seq values must be unique and ascending.',
    )
  })
})

describe('sessionDocumentSchema — speaker rules (PRD §7)', () => {
  it('refuses an interjection that names a speaker', () => {
    const doc = document()
    const turns = doc.turns as Record<string, unknown>[]
    const spoiled = { ...doc, turns: [turns[0], { ...turns[1], speakerName: 'Skeptic' }, turns[2]] }
    expect(messages(spoiled)).toContain(
      'Turn 1 is an interjection and must have no speaker name.',
    )
  })

  it('refuses a persona turn with no speaker', () => {
    expect(messages(withFirstTurn({ speakerName: null }))).toContain(
      'Turn 0 is a persona turn and needs a speaker name.',
    )
  })

  it('refuses a synthesis with no speaker', () => {
    const doc = document()
    const turns = doc.turns as Record<string, unknown>[]
    const spoiled = { ...doc, turns: [turns[0], turns[1], { ...turns[2], speakerName: null }] }
    expect(messages(spoiled)).toContain('Turn 2 is a synthesis turn and needs a speaker name.')
  })

  it('refuses a persona turn whose speaker is not in the council snapshot', () => {
    expect(messages(withFirstTurn({ speakerName: 'Economist' }))).toContain(
      'Turn 0 names a speaker that is not in the council snapshot.',
    )
  })
})

describe('sessionDocumentSchema — council snapshot bounds (PRD §5.3)', () => {
  it('refuses a one-member council', () => {
    const doc = withSession({ councilSnapshot: { ...SNAPSHOT, members: [SNAPSHOT.members[0]] } })
    expect(messages(doc)).toContain('A council needs at least 2 personas.')
  })

  it('refuses a nine-member council', () => {
    const members = Array.from({ length: 9 }, (_, index) => ({
      ...SNAPSHOT.members[0],
      name: `Member ${index}`,
    }))
    const doc = withSession({ councilSnapshot: { ...SNAPSHOT, members } })
    expect(messages(doc)).toContain('A council may seat at most 8 personas.')
  })

  it('refuses zero rounds', () => {
    expect(messages(withSession({ councilSnapshot: { ...SNAPSHOT, rounds: 0 } }))).toContain(
      'Rounds must be between 1 and 5.',
    )
  })

  it('refuses six rounds', () => {
    expect(messages(withSession({ councilSnapshot: { ...SNAPSHOT, rounds: 6 } }))).toContain(
      'Rounds must be between 1 and 5.',
    )
  })

  it('accepts a snapshot carrying a council directive, and one omitting the key (A3)', () => {
    const directive = 'Argue adversarially. Do not converge until the evidence forces it.'
    const withDirective = withSession({ councilSnapshot: { ...SNAPSHOT, directive } })
    const parsed = sessionDocumentSchema.safeParse(withDirective)

    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true)
    expect(parsed.data!.session.councilSnapshot.directive).toBe(directive)

    // The pre-A3 shape — no key at all — still parses.
    expect('directive' in (document().session as { councilSnapshot: object }).councilSnapshot).toBe(
      false,
    )
    expect(sessionDocumentSchema.safeParse(document()).success).toBe(true)
  })

  it('accepts an explicit null directive from a hand-written document', () => {
    const doc = withSession({ councilSnapshot: { ...SNAPSHOT, directive: null } })
    expect(sessionDocumentSchema.safeParse(doc).success).toBe(true)
  })

  it('refuses a blank directive rather than importing a meaningless one', () => {
    const doc = withSession({ councilSnapshot: { ...SNAPSHOT, directive: '   ' } })
    expect(messages(doc)).toContain('A council directive must not be blank.')
  })

  it('refuses a directive past the 2,000-character bound', () => {
    const doc = withSession({ councilSnapshot: { ...SNAPSHOT, directive: 'x'.repeat(2_001) } })
    expect(messages(doc).join(' ')).toMatch(/too big|at most|2000/i)
  })

  it('refuses a colour that is not a hex value', () => {
    const members = [{ ...SNAPSHOT.members[0], color: 'blue' }, SNAPSHOT.members[1]]
    expect(messages(withSession({ councilSnapshot: { ...SNAPSHOT, members } }))).toContain(
      'Color must be a hex value like #2563eb.',
    )
  })
})

describe('sessionDocumentSchema — session fields', () => {
  it('refuses a turnCursor past the generation cap', () => {
    expect(messages(withSession({ turnCursor: 61 }))).toContain(
      'turnCursor must not exceed the 60-turn cap.',
    )
  })

  it('refuses a blank topic', () => {
    expect(messages(withSession({ topic: '   ' }))).toContain('Topic is required.')
  })

  it('refuses a status the enum does not name', () => {
    expect(messages(withSession({ status: 'paused' })).join(' ')).toMatch(/invalid option/i)
  })

  it('refuses a turn kind the enum does not name', () => {
    expect(messages(withFirstTurn({ kind: 'chair' })).join(' ')).toMatch(/invalid option/i)
  })

  it('refuses a non-ISO createdAt', () => {
    expect(messages(withSession({ createdAt: '28 July 2026' }))).toContain(
      'Session createdAt must be an ISO-8601 timestamp.',
    )
  })

  it('refuses a non-ISO turn createdAt', () => {
    expect(messages(withFirstTurn({ createdAt: 'yesterday' }))).toContain(
      'Turn createdAt must be an ISO-8601 timestamp.',
    )
  })

  it('refuses a completed session with no completedAt', () => {
    expect(messages(withSession({ status: 'completed' }))).toContain(
      'A completed session must carry a completedAt timestamp.',
    )
  })

  it('refuses an active session that still carries a completedAt', () => {
    expect(messages(withSession({ completedAt: '2026-07-28T10:00:00.000Z' }))).toContain(
      'An active session must not carry a completedAt timestamp.',
    )
  })

  it('accepts a completed session that carries one', () => {
    const doc = withSession({ status: 'completed', completedAt: '2026-07-28T10:00:00.000Z' })
    expect(sessionDocumentSchema.safeParse(doc).success).toBe(true)
  })
})

describe('schema and exporter stay in lockstep', () => {
  /**
   * The `z.ZodType<SessionDocument>` annotation catches a schema field that the
   * *type* has dropped. It cannot catch a schema field the *exporter* never
   * emits — that would parse happily and then vanish on the next export. Key
   * parity is what closes that gap.
   */
  it('parses to exactly the keys the exporter emits, in the same order', () => {
    const exported = document()
    const parsed = sessionDocumentSchema.safeParse(exported)
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true)

    const round = JSON.parse(JSON.stringify(parsed.data)) as Record<string, unknown>
    expect(Object.keys(round)).toEqual(Object.keys(exported))
    expect(Object.keys(round.session as object)).toEqual(
      Object.keys(exported.session as object),
    )
    expect(Object.keys((round.session as { councilSnapshot: object }).councilSnapshot)).toEqual(
      Object.keys((exported.session as { councilSnapshot: object }).councilSnapshot),
    )
    expect(Object.keys((round.turns as object[])[0])).toEqual(
      Object.keys((exported.turns as object[])[0]),
    )
  })

  it('keeps key parity for a snapshot carrying a directive (A3)', () => {
    const exported = JSON.parse(
      JSON.stringify(
        toSessionDocument({
          topic: 'Should we ship on Friday?',
          model: null,
          status: 'active',
          turnCursor: 0,
          createdAt: '2026-07-28T09:15:00.000Z',
          completedAt: null,
          councilSnapshot: { ...SNAPSHOT, directive: 'Argue adversarially.' },
          turns: [],
        }),
      ),
    ) as Record<string, unknown>

    const snapshotKeys = Object.keys(
      (exported.session as { councilSnapshot: object }).councilSnapshot,
    )
    expect(snapshotKeys).toEqual(['name', 'rounds', 'directive', 'members'])

    const parsed = sessionDocumentSchema.safeParse(exported)
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true)

    const round = JSON.parse(JSON.stringify(parsed.data)) as Record<string, unknown>
    expect(Object.keys((round.session as { councilSnapshot: object }).councilSnapshot)).toEqual(
      snapshotKeys,
    )
  })
})
