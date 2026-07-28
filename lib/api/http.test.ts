import { afterEach, describe, expect, it, vi } from 'vitest'

import type { TurnFailureReason } from '@/lib/session/turns'

import { badRequest, conflict, notFound, serverError, turnFailureResponse, unprocessable } from './http'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('http responses', () => {
  it('badRequest is a 400 carrying the message', async () => {
    const response = badRequest('Invalid request body.')
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'Invalid request body.' })
  })

  it('badRequest passes zod issues through untouched', async () => {
    const issues = [{ path: ['topic'], message: 'Topic is required.' }]
    expect(await badRequest('Invalid request body.', issues).json()).toEqual({
      error: 'Invalid request body.',
      issues,
    })
  })

  it('notFound is a 404', async () => {
    const response = notFound('Session x not found.')
    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: 'Session x not found.' })
  })

  it('unprocessable is a 422', async () => {
    const response = unprocessable('Council "X" has 1 members.')
    expect(response.status).toBe(422)
    expect(await response.json()).toEqual({ error: 'Council "X" has 1 members.' })
  })

  it('conflict is a 409', async () => {
    const response = conflict('Session is completed; only active sessions can generate turns.')
    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({
      error: 'Session is completed; only active sessions can generate turns.',
    })
  })

  it('serverError logs the error and surfaces its message — never a placeholder', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
    const error = new Error('DATABASE_URL is not set.')

    const response = serverError(error)

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'DATABASE_URL is not set.' })
    expect(logged).toHaveBeenCalledWith(error)
  })

  it('serverError stringifies a non-Error throw', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(await serverError('boom').json()).toEqual({ error: 'boom' })
  })
})

describe('turnFailureResponse', () => {
  // Every member of the union, so a new reason cannot be added without a case here.
  const CASES: [TurnFailureReason, number][] = [
    ['invalid-session', 404],
    ['locked', 409],
    ['not-active', 409],
    ['awaiting-retry', 409],
    ['nothing-to-retry', 409],
    ['nothing-to-synthesize', 409],
    ['cap-reached', 422],
  ]

  it.each(CASES)('maps %s to %i', async (reason, status) => {
    const message = `the service said: ${reason}`
    const response = turnFailureResponse({ reason, message })

    expect(response.status).toBe(status)
    // Verbatim: the scheduler's wording (which names the 60-turn cap) is never
    // rewritten on its way out.
    expect(await response.json()).toEqual({ error: message })
  })

  it('throws rather than guessing at an unknown reason', () => {
    expect(() =>
      turnFailureResponse({ reason: 'invented-reason' as TurnFailureReason, message: 'x' }),
    ).toThrow(/Unhandled turn failure reason/)
  })
})
