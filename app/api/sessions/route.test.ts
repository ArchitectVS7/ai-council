/**
 * `POST /api/sessions` and the per-session model override (PRD Amendment A1).
 *
 * The repo is replaced by a double that records what was persisted, so this
 * drives the real handler — real zod, real snapshot builder — with no database,
 * no provider, and no network.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { insertImportedSession, insertSession } from '@/lib/db/repo'
import { toSessionDocument } from '@/lib/transfer/document'

import { POST as createSession } from './route'

const COUNCIL_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301'
const SESSION_ID = '5c2f4a1b-6d7e-4f80-9a1b-2c3d4e5f6a7b'

const COUNCIL = {
  name: 'Decision Panel',
  defaultRounds: 2,
  members: [
    {
      name: 'The Pragmatist',
      role: 'Delivery-focused practitioner',
      charter: 'You judge every proposal by what it would take to actually ship it.',
      color: '#2563eb',
      position: 0,
    },
    {
      name: 'The Skeptic',
      role: 'Risk and evidence analyst',
      charter: 'You want to know how anyone could tell if the claim were false.',
      color: '#dc2626',
      position: 1,
    },
  ],
}

vi.mock('@/lib/db/repo', () => ({
  findCouncilWithMembers: vi.fn(async (councilId: string) =>
    councilId === COUNCIL_ID ? COUNCIL : null,
  ),
  // Echoes the row a real insert would return, including the null the column
  // default produces when the caller supplies no model.
  insertSession: vi.fn(async (input: { model?: string | null }) => ({
    id: SESSION_ID,
    ...input,
    model: input.model ?? null,
  })),
  listSessions: vi.fn(async () => []),
  // Echoes what a real import would return: the stored row, with the ids the
  // database assigns and `council_id` null (PRD §7 — an imported session has no
  // provenance here).
  insertImportedSession: vi.fn(async (input: { session: Record<string, unknown> }) => ({
    id: SESSION_ID,
    councilId: null,
    ...input.session,
  })),
}))

const inserted = vi.mocked(insertSession)
const imported = vi.mocked(insertImportedSession)

function post(body: unknown): Promise<Response> {
  return createSession(
    new Request('http://localhost/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/sessions — model override (Amendment A1)', () => {
  it('persists the model the convener chose', async () => {
    const response = await post({
      topic: 'Should we ship on Friday?',
      councilId: COUNCIL_ID,
      model: 'claude-opus-5',
    })

    expect(response.status).toBe(201)
    expect(inserted).toHaveBeenCalledTimes(1)
    expect(inserted.mock.calls[0][0]).toMatchObject({
      topic: 'Should we ship on Friday?',
      councilId: COUNCIL_ID,
      model: 'claude-opus-5',
    })

    const body = (await response.json()) as { session: { model: string | null } }
    expect(body.session.model).toBe('claude-opus-5')
  })

  it('persists null when no model is chosen, so the session follows the env default', async () => {
    const response = await post({ topic: 'Hiring plan', councilId: COUNCIL_ID })

    expect(response.status).toBe(201)
    expect(inserted.mock.calls[0][0].model).toBeUndefined()

    const body = (await response.json()) as { session: { model: string | null } }
    expect(body.session.model).toBeNull()
  })

  it('400s on a blank model rather than quietly falling back (R4)', async () => {
    const response = await post({ topic: 'Hiring plan', councilId: COUNCIL_ID, model: '   ' })

    expect(response.status).toBe(400)
    expect(inserted).not.toHaveBeenCalled()
  })

  it('400s on an oversized model', async () => {
    const response = await post({
      topic: 'Hiring plan',
      councilId: COUNCIL_ID,
      model: 'x'.repeat(101),
    })

    expect(response.status).toBe(400)
    expect(inserted).not.toHaveBeenCalled()
  })

  it('still rejects an unknown key rather than ignoring it', async () => {
    const response = await post({
      topic: 'Hiring plan',
      councilId: COUNCIL_ID,
      temperature: 0.9,
    })

    expect(response.status).toBe(400)
    expect(inserted).not.toHaveBeenCalled()
  })
})

/**
 * Importing a session document (T-031).
 *
 * A document is a *create* that arrives with its transcript attached, so it
 * enters through this same endpoint, discriminated on `schemaVersion`. These
 * cases pin the repo contract that `lib/transfer/round-trip.test.ts` mirrors in
 * its fake store.
 */
describe('POST /api/sessions — import (T-031)', () => {
  const SNAPSHOT = {
    name: 'Decision Panel',
    rounds: 2,
    members: [
      { name: 'Pragmatist', role: 'Ships things', charter: 'Focus on what is buildable.', color: '#2563eb' },
      { name: 'Skeptic', role: 'Doubts things', charter: 'Challenge every assumption.', color: '#dc2626' },
    ],
  }

  function sessionDocument() {
    return toSessionDocument({
      topic: 'Should we ship on Friday?',
      model: 'claude-opus-5',
      status: 'completed',
      turnCursor: 4,
      createdAt: '2026-07-28T09:15:00.000Z',
      completedAt: '2026-07-28T10:00:00.000Z',
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
          model: 'claude-opus-5',
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
          kind: 'persona',
          speakerName: 'Skeptic',
          round: 1,
          content: '',
          status: 'failed',
          error: 'Anthropic request failed (529): overloaded_error',
          model: 'claude-opus-5',
          promptTokens: null,
          completionTokens: null,
          createdAt: '2026-07-28T09:18:00.000Z',
        },
        {
          seq: 3,
          kind: 'synthesis',
          speakerName: 'The Chair',
          round: 1,
          content: 'Ship behind a flag.',
          status: 'complete',
          error: null,
          model: 'claude-opus-5',
          promptTokens: 400,
          completionTokens: 80,
          createdAt: '2026-07-28T09:19:00.000Z',
        },
      ],
    })
  }

  it('persists the document exactly as it arrived, status and cursor included', async () => {
    const document = sessionDocument()
    const response = await post(document)

    expect(response.status).toBe(201)
    expect(inserted).not.toHaveBeenCalled()
    expect(imported).toHaveBeenCalledTimes(1)
    // Nothing is re-derived: the repo receives the parsed document unchanged.
    expect(imported.mock.calls[0][0]).toEqual({
      session: document.session,
      turns: document.turns,
    })

    const body = (await response.json()) as { session: { id: string; councilId: null } }
    expect(body.session.id).toBe(SESSION_ID)
    // Snapshot rule (PRD §7): an imported session has no provenance here.
    expect(body.session.councilId).toBeNull()
  })

  it('preserves interjections, failed turns, and the synthesis', async () => {
    await post(sessionDocument())

    const turns = imported.mock.calls[0][0].turns
    expect(turns.map((turn) => turn.kind)).toEqual([
      'persona',
      'interjection',
      'persona',
      'synthesis',
    ])
    expect(turns[1].speakerName).toBeNull()
    expect(turns[2]).toMatchObject({
      status: 'failed',
      error: 'Anthropic request failed (529): overloaded_error',
    })
  })

  it('400s on an unreadable schemaVersion, surfacing the zod issue', async () => {
    const response = await post({ ...sessionDocument(), schemaVersion: 99 })

    expect(response.status).toBe(400)
    expect(imported).not.toHaveBeenCalled()

    const body = (await response.json()) as { error: string; issues: { message: string }[] }
    expect(body.error).toBe('Invalid session document.')
    expect(body.issues.map((issue) => issue.message)).toContain(
      'Unsupported schemaVersion; this build reads version 1.',
    )
  })

  it('400s on a document whose transcript is out of order', async () => {
    const document = sessionDocument()
    const response = await post({
      ...document,
      turns: [document.turns[1], document.turns[0]],
    })

    expect(response.status).toBe(400)
    expect(imported).not.toHaveBeenCalled()
  })

  it('leaves the ordinary create path alone when no schemaVersion is present', async () => {
    const response = await post({ topic: 'Hiring plan', councilId: COUNCIL_ID })

    expect(response.status).toBe(201)
    expect(imported).not.toHaveBeenCalled()
    expect(inserted).toHaveBeenCalledTimes(1)
  })
})
