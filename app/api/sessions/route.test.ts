/**
 * `POST /api/sessions` and the per-session model override (PRD Amendment A1).
 *
 * The repo is replaced by a double that records what was persisted, so this
 * drives the real handler — real zod, real snapshot builder — with no database,
 * no provider, and no network.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { insertSession } from '@/lib/db/repo'

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
}))

const inserted = vi.mocked(insertSession)

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
