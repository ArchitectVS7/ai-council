/**
 * The three generating route handlers are deliberately thin: validate the id,
 * call the service, map the typed result onto a status code. This suite pins
 * that mapping with the service mocked out, so the status contract of PRD §8
 * is tested without a database or a provider.
 */
import type { Mock } from 'vitest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { TurnFailureReason } from '@/lib/session/turns'
import { advanceSession, retryLastTurn, synthesizeSession } from '@/lib/session/turns'

import { POST as advance } from './advance/route'
import { POST as retryLast } from './retry-last/route'
import { POST as synthesize } from './synthesize/route'

vi.mock('@/lib/session/turns', () => ({
  advanceSession: vi.fn(),
  synthesizeSession: vi.fn(),
  retryLastTurn: vi.fn(),
}))

const SESSION_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301'

type Handler = (request: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>

// The mocked services are untyped here on purpose: the fixtures below are the
// smallest rows that make the assertion readable, not full database rows.
const ROUTES: { name: string; handler: Handler; service: Mock }[] = [
  { name: 'advance', handler: advance, service: advanceSession as unknown as Mock },
  { name: 'synthesize', handler: synthesize, service: synthesizeSession as unknown as Mock },
  { name: 'retry-last', handler: retryLast, service: retryLastTurn as unknown as Mock },
]

function call(handler: Handler, id: string): Promise<Response> {
  return handler(new Request('http://localhost/api/sessions/x/advance', { method: 'POST' }), {
    params: Promise.resolve({ id }),
  })
}

const TURN = { id: 'turn-1', seq: 0, kind: 'persona', speakerName: 'The Skeptic', status: 'complete' }
const SESSION = { id: SESSION_ID, status: 'active', turnCursor: 1 }

beforeEach(() => {
  vi.clearAllMocks()
})

describe.each(ROUTES)('POST /api/sessions/[id]/$name', ({ handler, service }) => {
  it('rejects a non-UUID id with 400 and zod issues', async () => {
    const response = await call(handler, 'not-a-uuid')

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBe('Invalid session id.')
    expect(Array.isArray(body.issues)).toBe(true)
    // A malformed id never reaches the service.
    expect(service).not.toHaveBeenCalled()
  })

  it('returns 200 with the stored turn and session on success', async () => {
    service.mockResolvedValue({ ok: true, turn: TURN, session: SESSION })

    const response = await call(handler, SESSION_ID)

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ ok: true, turn: TURN, session: SESSION })
    expect(service).toHaveBeenCalledWith(SESSION_ID)
  })

  it('returns 200 with a failed turn — a provider error is data, not an HTTP error', async () => {
    const failedTurn = { ...TURN, status: 'failed', content: '', error: 'Anthropic request failed (529)' }
    service.mockResolvedValue({ ok: true, turn: failedTurn, session: SESSION })

    const response = await call(handler, SESSION_ID)

    expect(response.status).toBe(200)
    expect((await response.json()).turn).toMatchObject(failedTurn)
  })

  it.each<[TurnFailureReason, number]>([
    ['invalid-session', 404],
    ['locked', 409],
    ['not-active', 409],
    ['awaiting-retry', 409],
    ['nothing-to-retry', 409],
    ['nothing-to-synthesize', 409],
    ['cap-reached', 422],
  ])('maps %s to %i and passes the message through verbatim', async (reason, status) => {
    const message = `refusal message for ${reason}`
    service.mockResolvedValue({ ok: false, reason, message })

    const response = await call(handler, SESSION_ID)

    expect(response.status).toBe(status)
    expect(await response.json()).toEqual({ error: message })
  })

  it('surfaces an unexpected throw as a 500 carrying the real message', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    service.mockRejectedValue(new Error('DATABASE_URL is not set.'))

    const response = await call(handler, SESSION_ID)

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'DATABASE_URL is not set.' })
  })

  it('reads no request body — the client never says whose turn it is', async () => {
    service.mockResolvedValue({ ok: true, turn: TURN, session: SESSION })
    const request = new Request('http://localhost/api/sessions/x/advance', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ speakerName: 'The Contrarian', round: 9, seq: 99 }),
    })

    const response = await handler(request, { params: Promise.resolve({ id: SESSION_ID }) })

    expect(response.status).toBe(200)
    expect(request.bodyUsed).toBe(false)
    expect(service).toHaveBeenCalledWith(SESSION_ID)
  })
})
