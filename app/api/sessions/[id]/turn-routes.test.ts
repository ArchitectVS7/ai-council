/**
 * The session route handlers are deliberately thin: validate the id (and, for
 * interject, the body), call the service, map the typed result onto a status
 * code. This suite pins that mapping with the service mocked out, so the status
 * contract of PRD §8 is tested without a database or a provider.
 *
 * Since T-030, advance and synthesize answer a *successful* generation with a
 * `text/event-stream` rather than JSON, so they have a suite of their own at the
 * foot of the file. Their refusal status codes are unchanged and still asserted.
 */
import type { Mock } from 'vitest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { TurnFailureReason, TurnStreamEvent } from '@/lib/session/turns'
import {
  addInterjection,
  advanceSessionStream,
  regenerateLastTurn,
  reopenSession,
  retryLastTurn,
  synthesizeSessionStream,
} from '@/lib/session/turns'
import { readServerEvents } from '@/lib/sse'

import { POST as advance } from './advance/route'
import { POST as interject } from './interject/route'
import { POST as regenerateLast } from './regenerate-last/route'
import { POST as reopen } from './reopen/route'
import { POST as retryLast } from './retry-last/route'
import { POST as synthesize } from './synthesize/route'

vi.mock('@/lib/session/turns', () => ({
  advanceSessionStream: vi.fn(),
  synthesizeSessionStream: vi.fn(),
  retryLastTurn: vi.fn(),
  regenerateLastTurn: vi.fn(),
  addInterjection: vi.fn(),
  reopenSession: vi.fn(),
}))

const SESSION_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301'

type Handler = (request: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>

// The mocked services are untyped here on purpose: the fixtures below are the
// smallest rows that make the assertion readable, not full database rows.
//
// Advance and synthesize are absent: their success response is an event stream,
// not JSON, so they get their own suite below rather than a weakened shared one.
const ROUTES: { name: string; handler: Handler; service: Mock }[] = [
  { name: 'retry-last', handler: retryLast, service: retryLastTurn as unknown as Mock },
  {
    name: 'regenerate-last',
    handler: regenerateLast,
    service: regenerateLastTurn as unknown as Mock,
  },
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
    ['nothing-to-regenerate', 409],
    ['not-completed', 409],
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

/**
 * Reopen is bodiless like the generating routes but returns no turn — it writes
 * nothing to the transcript — so it gets its own suite rather than weakening the
 * shared success assertion above.
 */
describe('POST /api/sessions/[id]/reopen', () => {
  const service = reopenSession as unknown as Mock

  it('rejects a non-UUID id with 400 and never calls the service', async () => {
    const response = await call(reopen, 'not-a-uuid')

    expect(response.status).toBe(400)
    expect((await response.json()).error).toBe('Invalid session id.')
    expect(service).not.toHaveBeenCalled()
  })

  it('returns 200 with the reopened session and no turn', async () => {
    service.mockResolvedValue({ ok: true, session: { ...SESSION, status: 'active', completedAt: null } })

    const response = await call(reopen, SESSION_ID)

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual({ ok: true, session: { ...SESSION, status: 'active', completedAt: null } })
    expect(body.turn).toBeUndefined()
    expect(service).toHaveBeenCalledWith(SESSION_ID)
  })

  it('maps not-completed to 409 with the message verbatim', async () => {
    const message = 'Session is active; only a completed session can be reopened.'
    service.mockResolvedValue({ ok: false, reason: 'not-completed', message })

    const response = await call(reopen, SESSION_ID)

    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({ error: message })
  })

  it('reads no request body', async () => {
    service.mockResolvedValue({ ok: true, session: SESSION })
    const request = new Request('http://localhost/api/sessions/x/reopen', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'active' }),
    })

    await reopen(request, { params: Promise.resolve({ id: SESSION_ID }) })

    expect(request.bodyUsed).toBe(false)
  })
})

describe('POST /api/sessions/[id]/interject', () => {
  const service = addInterjection as unknown as Mock
  const CONTENT = 'Cost the migration in engineer-months.'

  function post(id: string, body: string | undefined): Promise<Response> {
    return interject(
      new Request('http://localhost/api/sessions/x/interject', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
      }),
      { params: Promise.resolve({ id }) },
    )
  }

  it('passes the id and the content through to the service', async () => {
    const turn = { ...TURN, kind: 'interjection', speakerName: null, content: CONTENT }
    service.mockResolvedValue({ ok: true, turn, session: SESSION })

    const response = await post(SESSION_ID, JSON.stringify({ content: CONTENT }))

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ ok: true, turn })
    expect(service).toHaveBeenCalledWith(SESSION_ID, CONTENT)
  })

  it('rejects a non-UUID id before reading the body', async () => {
    const response = await post('not-a-uuid', JSON.stringify({ content: CONTENT }))

    expect(response.status).toBe(400)
    expect((await response.json()).error).toBe('Invalid session id.')
    expect(service).not.toHaveBeenCalled()
  })

  it('rejects a body that is not JSON', async () => {
    const response = await post(SESSION_ID, 'not json at all')

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'Request body must be valid JSON.' })
    expect(service).not.toHaveBeenCalled()
  })

  it.each<[string, unknown]>([
    ['an empty object', {}],
    ['an empty string', { content: '' }],
    ['whitespace only', { content: '   ' }],
    ['a non-string', { content: 42 }],
    ['an unknown key', { content: CONTENT, speakerName: 'The Skeptic' }],
    ['a client-chosen slot', { content: CONTENT, seq: 99 }],
  ])('rejects %s with 400 and zod issues', async (_label, body) => {
    const response = await post(SESSION_ID, JSON.stringify(body))

    expect(response.status).toBe(400)
    const parsed = await response.json()
    expect(parsed.error).toBe('Invalid request body.')
    expect(Array.isArray(parsed.issues)).toBe(true)
    expect(service).not.toHaveBeenCalled()
  })

  it.each<[TurnFailureReason, number]>([
    ['invalid-session', 404],
    ['locked', 409],
    ['not-active', 409],
    ['awaiting-retry', 409],
  ])('maps %s to %i', async (reason, status) => {
    const message = `refusal message for ${reason}`
    service.mockResolvedValue({ ok: false, reason, message })

    const response = await post(SESSION_ID, JSON.stringify({ content: CONTENT }))

    expect(response.status).toBe(status)
    expect(await response.json()).toEqual({ error: message })
  })

  it('surfaces an unexpected throw as a 500 carrying the real message', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    service.mockRejectedValue(new Error('DATABASE_URL is not set.'))

    const response = await post(SESSION_ID, JSON.stringify({ content: CONTENT }))

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'DATABASE_URL is not set.' })
  })
})

/**
 * Advance and synthesize (T-030).
 *
 * The status contract of PRD §8 is unchanged — a refusal is still 409/422/404
 * with a JSON body — but a *successful* generation is now a 200
 * `text/event-stream`. Both halves are pinned here with the service mocked out,
 * and the response is decoded with the real SSE parser so the bytes on the wire
 * are what is actually asserted.
 */
describe.each([
  { name: 'advance', handler: advance as Handler, service: advanceSessionStream as unknown as Mock },
  { name: 'synthesize', handler: synthesize as Handler, service: synthesizeSessionStream as unknown as Mock },
])('POST /api/sessions/[id]/$name', ({ handler, service }) => {
  const ACCEPTED: TurnStreamEvent = {
    type: 'accepted',
    seq: 2,
    round: 1,
    kind: 'persona',
    speakerName: 'The Skeptic',
  }
  const STORED = {
    type: 'turn',
    result: { ok: true, turn: TURN, session: SESSION },
  } as unknown as TurnStreamEvent

  /** A service double that emits exactly these events. */
  function emits(events: TurnStreamEvent[]): void {
    service.mockImplementation(async function* () {
      for (const event of events) yield event
    })
  }

  /** Decodes an SSE response body into `[event name, parsed payload]` pairs. */
  async function readFrames(response: Response): Promise<[string, Record<string, unknown>][]> {
    const body = response.body
    if (!body) throw new Error('the response carried no stream')
    const frames: [string, Record<string, unknown>][] = []
    for await (const frame of readServerEvents(body)) {
      frames.push([frame.event, JSON.parse(frame.data) as Record<string, unknown>])
    }
    return frames
  }

  it('rejects a non-UUID id with 400 and never reaches the service', async () => {
    const response = await call(handler, 'not-a-uuid')

    expect(response.status).toBe(400)
    expect((await response.json()).error).toBe('Invalid session id.')
    expect(service).not.toHaveBeenCalled()
  })

  it('streams the acceptance, the deltas, and the stored turn', async () => {
    emits([
      ACCEPTED,
      { type: 'delta', text: 'The build ' },
      { type: 'delta', text: 'is green.' },
      STORED,
    ])

    const response = await call(handler, SESSION_ID)

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('text/event-stream; charset=utf-8')
    expect(response.headers.get('cache-control')).toBe('no-store, no-transform')

    const frames = await readFrames(response)
    expect(frames.map(([name]) => name)).toEqual(['accepted', 'delta', 'delta', 'turn'])
    expect(frames[0][1]).toMatchObject({ speakerName: 'The Skeptic', seq: 2, round: 1 })
    expect(frames.filter(([n]) => n === 'delta').map(([, p]) => p.text).join('')).toBe(
      'The build is green.',
    )
    expect(frames[3][1].result).toMatchObject({ ok: true, turn: TURN, session: SESSION })
    // The client never says whose turn it is; the id and an abort signal are all
    // the service is given.
    expect(service.mock.calls[0][0]).toBe(SESSION_ID)
    expect(service.mock.calls[0][1]).toBeInstanceOf(AbortSignal)
  })

  it('streams a failed turn as a 200 — a provider error is data, not an HTTP error', async () => {
    const failedTurn = { ...TURN, status: 'failed', content: '', error: 'Anthropic request failed (529)' }
    emits([
      ACCEPTED,
      { type: 'delta', text: 'half a sen' },
      { type: 'turn', result: { ok: true, turn: failedTurn, session: SESSION } } as unknown as TurnStreamEvent,
    ])

    const response = await call(handler, SESSION_ID)

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('text/event-stream; charset=utf-8')
    const frames = await readFrames(response)
    expect((frames[2][1].result as { turn: unknown }).turn).toMatchObject(failedTurn)
  })

  it.each<[TurnFailureReason, number]>([
    ['invalid-session', 404],
    ['locked', 409],
    ['not-active', 409],
    ['awaiting-retry', 409],
    ['nothing-to-synthesize', 409],
    ['cap-reached', 422],
  ])('answers a %s refusal with %i and JSON, never an event stream', async (reason, status) => {
    const message = `refusal message for ${reason}`
    emits([{ type: 'refused', reason, message }])

    const response = await call(handler, SESSION_ID)

    expect(response.status).toBe(status)
    expect(response.headers.get('content-type')).not.toMatch(/event-stream/)
    expect(await response.json()).toEqual({ error: message })
  })

  it('closes a refused stream so the session lock is released', async () => {
    let closed = false
    service.mockImplementation(async function* () {
      try {
        yield { type: 'refused', reason: 'locked', message: 'busy' } as TurnStreamEvent
      } finally {
        closed = true
      }
    })

    expect((await call(handler, SESSION_ID)).status).toBe(409)
    expect(closed).toBe(true)
  })

  it('surfaces an unexpected throw as a 500 carrying the real message', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    service.mockImplementation(async function* () {
      throw new Error('DATABASE_URL is not set.')
      // eslint-disable-next-line no-unreachable
      yield ACCEPTED
    })

    const response = await call(handler, SESSION_ID)

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'DATABASE_URL is not set.' })
  })

  it('reads no request body — the client never says whose turn it is', async () => {
    emits([ACCEPTED, STORED])
    const request = new Request('http://localhost/api/sessions/x/advance', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ speakerName: 'The Contrarian', round: 9, seq: 99 }),
    })

    const response = await handler(request, { params: Promise.resolve({ id: SESSION_ID }) })
    await readFrames(response)

    expect(response.status).toBe(200)
    expect(request.bodyUsed).toBe(false)
  })

  it('aborts the in-flight generation when the client disconnects', async () => {
    let release = (): void => {}
    const held = new Promise<void>((resolve) => {
      release = resolve
    })
    service.mockImplementation(async function* () {
      yield ACCEPTED
      await held
      yield STORED
    })

    const client = new AbortController()
    const request = new Request('http://localhost/api/sessions/x/advance', {
      method: 'POST',
      signal: client.signal,
    })
    const response = await handler(request, { params: Promise.resolve({ id: SESSION_ID }) })
    expect(response.status).toBe(200)

    const passed = service.mock.calls[0][1] as AbortSignal
    expect(passed.aborted).toBe(false)

    client.abort()

    // The service's signal is aborted, so the provider call stops and the
    // service records the turn as aborted rather than leaving it dangling.
    expect(passed.aborted).toBe(true)

    release()
    await readFrames(response)
  })
})
