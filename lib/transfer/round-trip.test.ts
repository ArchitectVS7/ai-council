/**
 * T-031's acceptance property: export → parse → import → export is lossless.
 *
 * Deterministic by construction — a seeded PRNG, no `Math.random`, no
 * `Date.now`, no new dependency and no network. `persistFake` stands in for the
 * database: it does exactly what `insertImportedSession` does (synthetic ids, a
 * fresh `updatedAt`, `councilId: null`, ISO strings back to `Date`), and
 * `app/api/sessions/route.test.ts` is what pins the real repo to that contract.
 *
 * It also scrambles the stored key order, because that is what a jsonb read
 * genuinely does — the exporter's canonical rebuild is the thing under test.
 */
import { describe, expect, it } from 'vitest'

import type { CouncilSnapshot } from '@/lib/council/types'

import { toSessionDocument } from './document'
import type { SessionDocument } from './document'
import { sessionDocumentSchema } from './schema'

/** A 32-bit seeded PRNG. Fifteen lines beats a devDependency for this. */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const CHAIR = 'The Chair'

const TOPICS = [
  'Should we ship on Friday?',
  'Pricing: "value-based" or cost-plus?',
  'Line one\nline two — where does the roadmap break?',
  'Café rollout in São Paulo · 日本語 · emoji 🎯',
  "Don't rewrite: what does the migration actually cost?",
  '   ',
]

const COLORS = ['#2563eb', '#dc2626', '#16a34a', '#ca8a04', '#7c3aed', '#0891b2', '#db2777', '#4b5563']

/** What a row-shaped session looks like coming out of the fake database. */
type StoredSession = Parameters<typeof toSessionDocument>[0]

/**
 * Write a document into the fake store and read it back exactly as
 * `GET /api/sessions/[id]` would, minus the ids the exporter never reads.
 *
 * `councilId` is set and immediately unused on purpose — it mirrors the real
 * write (PRD §7: provenance only, and an imported session has none), and its
 * absence from the returned shape is the point.
 */
function persistFake(document: SessionDocument, scramble: boolean): StoredSession {
  const snapshot = document.session.councilSnapshot
  // A jsonb read hands back whatever order the value was stored in; the export
  // must not depend on it.
  const stored: CouncilSnapshot = scramble
    ? ({
        members: snapshot.members.map((member) => ({
          color: member.color,
          charter: member.charter,
          name: member.name,
          role: member.role,
        })),
        // A3: carried through the scramble only when the document had one, so a
        // directive-less snapshot stays exactly the shape jsonb held pre-A3.
        ...(snapshot.directive === undefined ? {} : { directive: snapshot.directive }),
        rounds: snapshot.rounds,
        name: snapshot.name,
      } as CouncilSnapshot)
    : snapshot

  return {
    topic: document.session.topic,
    model: document.session.model,
    status: document.session.status,
    turnCursor: document.session.turnCursor,
    createdAt: new Date(document.session.createdAt),
    completedAt:
      document.session.completedAt === null ? null : new Date(document.session.completedAt),
    councilSnapshot: stored,
    // Reversed on the way out to prove the exporter re-sorts by `seq` rather
    // than trusting the order it was handed.
    turns: document.turns
      .map((turn, index) => ({
        id: `turn-${index}`,
        sessionId: 'session-imported',
        seq: turn.seq,
        kind: turn.kind,
        speakerName: turn.speakerName,
        round: turn.round,
        content: turn.content,
        status: turn.status,
        error: turn.error,
        model: turn.model,
        promptTokens: turn.promptTokens,
        completionTokens: turn.completionTokens,
        createdAt: new Date(turn.createdAt),
      }))
      .reverse(),
  }
}

const BASE_MS = Date.parse('2026-07-28T09:00:00.000Z')

function iso(minutes: number): string {
  return new Date(BASE_MS + minutes * 60_000).toISOString()
}

function snapshotOf(memberCount: number, rounds: number, directive?: string): CouncilSnapshot {
  return {
    name: 'Decision Panel',
    rounds,
    // A3: omitted, never null, when there is none — the key order the exporter
    // and the schema both use is `{name, rounds, directive?, members}`.
    ...(directive === undefined ? {} : { directive }),
    members: Array.from({ length: memberCount }, (_, index) => ({
      name: `Member ${index}`,
      role: `Role ${index}`,
      charter: `Charter ${index}: judge every proposal on its own terms.`,
      color: COLORS[index % COLORS.length],
    })),
  }
}

type Turn = SessionDocument['turns'][number]

function personaTurn(seq: number, speakerName: string, round: number, overrides: Partial<Turn> = {}): Turn {
  return {
    seq,
    kind: 'persona',
    speakerName,
    round,
    content: `Turn ${seq} from ${speakerName}.`,
    status: 'complete',
    error: null,
    model: 'claude-sonnet-5',
    promptTokens: 100 + seq,
    completionTokens: 20 + seq,
    createdAt: iso(seq),
    ...overrides,
  }
}

function interjectionTurn(seq: number, round: number): Turn {
  return {
    seq,
    kind: 'interjection',
    speakerName: null,
    round,
    content: `Convener note ${seq}: stay on the rollback question.`,
    status: 'complete',
    error: null,
    model: null,
    promptTokens: null,
    completionTokens: null,
    createdAt: iso(seq),
  }
}

function synthesisTurn(seq: number, round: number): Turn {
  return {
    seq,
    kind: 'synthesis',
    speakerName: CHAIR,
    round,
    content: `Synthesis at ${seq}: ship behind a flag.`,
    status: 'complete',
    error: null,
    model: 'claude-sonnet-5',
    promptTokens: 400,
    completionTokens: 80,
    createdAt: iso(seq),
  }
}

function documentOf(session: Partial<SessionDocument['session']>, turns: Turn[]): SessionDocument {
  return toSessionDocument({
    topic: 'Should we ship on Friday?',
    model: null,
    status: 'active',
    turnCursor: turns.filter((turn) => turn.kind !== 'interjection').length,
    createdAt: iso(0),
    completedAt: null,
    councilSnapshot: snapshotOf(2, 2),
    ...session,
    turns,
  })
}

/** The three shapes the acceptance criteria name, written out rather than generated. */
const NAMED_FIXTURES: { name: string; document: SessionDocument }[] = [
  {
    name: 'a transcript with interjections',
    document: documentOf({}, [
      personaTurn(0, 'Member 0', 1),
      interjectionTurn(1, 1),
      personaTurn(2, 'Member 1', 1),
      interjectionTurn(3, 2),
      personaTurn(4, 'Member 0', 2),
    ]),
  },
  {
    name: 'a transcript with failed turns carrying provider errors',
    document: documentOf({}, [
      personaTurn(0, 'Member 0', 1),
      personaTurn(1, 'Member 1', 1, {
        content: '',
        status: 'failed',
        error: 'Anthropic request failed (529): overloaded_error',
        model: 'claude-sonnet-5',
        promptTokens: null,
        completionTokens: null,
      }),
    ]),
  },
  {
    name: 'a reopened session with multiple syntheses',
    document: documentOf({ status: 'completed', completedAt: iso(120), turnCursor: 6 }, [
      personaTurn(0, 'Member 0', 1),
      personaTurn(1, 'Member 1', 1),
      synthesisTurn(2, 1),
      personaTurn(3, 'Member 0', 2),
      interjectionTurn(4, 2),
      personaTurn(5, 'Member 1', 2),
      synthesisTurn(6, 2),
    ]),
  },
  {
    name: 'an abandoned session with an empty transcript',
    document: documentOf({ status: 'abandoned', turnCursor: 0 }, []),
  },
  {
    name: 'a session whose snapshot carries a council directive (A3)',
    document: documentOf(
      {
        councilSnapshot: snapshotOf(
          3,
          2,
          'Argue adversarially. Do not converge until the evidence forces it.',
        ),
      },
      [personaTurn(0, 'Member 0', 1), personaTurn(1, 'Member 1', 1), synthesisTurn(2, 1)],
    ),
  },
]

/** A corpus of varied but always-legal documents, generated from one seed. */
function generatedFixtures(count: number): SessionDocument[] {
  const random = mulberry32(0x5eed_1031)
  const pick = <T,>(values: readonly T[]): T => values[Math.floor(random() * values.length)]
  const between = (min: number, max: number) => min + Math.floor(random() * (max - min + 1))

  return Array.from({ length: count }, () => {
    const members = between(2, 8)
    const snapshot = snapshotOf(
      members,
      between(1, 5),
      random() < 0.5 ? undefined : `Directive: ${pick(TOPICS).trim() || 'stay adversarial'}`,
    )
    const turns: Turn[] = []

    for (let seq = 0; seq < between(0, 14); seq += 1) {
      const roll = random()
      const round = 1 + Math.floor(seq / Math.max(members, 1))
      if (roll < 0.15) {
        turns.push(interjectionTurn(seq, round))
      } else if (roll < 0.3) {
        turns.push(synthesisTurn(seq, round))
      } else if (roll < 0.45) {
        turns.push(
          personaTurn(seq, snapshot.members[seq % members].name, round, {
            content: '',
            status: 'failed',
            error: `Provider refused turn ${seq}.`,
            promptTokens: null,
            completionTokens: null,
          }),
        )
      } else {
        turns.push(
          personaTurn(seq, snapshot.members[seq % members].name, round, {
            content: pick(TOPICS),
            model: random() < 0.5 ? null : 'claude-opus-5',
            promptTokens: random() < 0.5 ? null : between(1, 5_000),
            completionTokens: random() < 0.5 ? null : between(1, 5_000),
          }),
        )
      }
    }

    const status = pick(['active', 'completed', 'abandoned'] as const)
    // A blank topic is not a legal document, so the blank entry in TOPICS is
    // only ever used as turn *content*; the topic falls back when it comes up.
    const chosenTopic = pick(TOPICS)
    return documentOf(
      {
        topic: chosenTopic.trim() === '' ? 'Fallback topic' : chosenTopic,
        model: random() < 0.5 ? null : 'claude-sonnet-5',
        status,
        turnCursor: between(0, 60),
        completedAt: status === 'completed' ? iso(between(1, 600)) : null,
        councilSnapshot: snapshot,
      },
      turns,
    )
  })
}

const GENERATED = generatedFixtures(50)
const ALL: { name: string; document: SessionDocument }[] = [
  ...NAMED_FIXTURES,
  ...GENERATED.map((document, index) => ({ name: `generated #${index}`, document })),
]

describe('the generated corpus is not degenerate', () => {
  const turnsOf = (documents: SessionDocument[]) => documents.flatMap((doc) => doc.turns)

  it('contains interjections', () => {
    expect(turnsOf(GENERATED).filter((turn) => turn.kind === 'interjection').length).toBeGreaterThan(0)
  })

  it('contains failed turns', () => {
    expect(turnsOf(GENERATED).filter((turn) => turn.status === 'failed').length).toBeGreaterThan(0)
  })

  it('contains at least one session with two or more syntheses', () => {
    const multi = GENERATED.filter(
      (doc) => doc.turns.filter((turn) => turn.kind === 'synthesis').length >= 2,
    )
    expect(multi.length).toBeGreaterThan(0)
  })

  it('covers every session status', () => {
    expect(new Set(GENERATED.map((doc) => doc.session.status)).size).toBe(3)
  })

  it('covers snapshots both with and without a council directive (A3)', () => {
    const withDirective = GENERATED.filter(
      (doc) => doc.session.councilSnapshot.directive !== undefined,
    )
    expect(withDirective.length).toBeGreaterThan(0)
    expect(GENERATED.length - withDirective.length).toBeGreaterThan(0)
    // Absent, never null — a null would change the exported bytes.
    for (const doc of GENERATED) {
      expect(doc.session.councilSnapshot.directive).not.toBeNull()
    }
  })
})

describe.each(ALL)('round trip: $name', ({ document }) => {
  it('export → parse → import → export is deeply equal and byte-identical', () => {
    const json = JSON.stringify(document)

    const parsed = sessionDocumentSchema.safeParse(JSON.parse(json))
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true)

    const again = toSessionDocument(persistFake(parsed.data!, true))

    expect(again).toEqual(document)
    // Key order too: a document that only *compares* equal would still produce a
    // different file on the next export.
    expect(JSON.stringify(again)).toBe(json)
  })

  it('is stable over a second cycle', () => {
    const once = toSessionDocument(persistFake(document, false))
    const twice = toSessionDocument(persistFake(once, true))

    expect(JSON.stringify(twice)).toBe(JSON.stringify(document))
  })
})
