import { afterEach, describe, expect, it, vi } from 'vitest'

import { badRequest, notFound, serverError, unprocessable } from './http'

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
