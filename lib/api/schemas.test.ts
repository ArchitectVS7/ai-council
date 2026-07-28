import { describe, expect, it } from 'vitest'

import { createSessionSchema, sessionIdSchema } from './schemas'

const UUID = '3f8b6c1e-8f2a-4b7d-9c31-2a1f4e9b7c05'

describe('createSessionSchema', () => {
  it('accepts a minimal body', () => {
    const result = createSessionSchema.safeParse({ topic: 'Should we ship on Friday?', councilId: UUID })
    expect(result.success).toBe(true)
    expect(result.success && result.data).toEqual({
      topic: 'Should we ship on Friday?',
      councilId: UUID,
    })
  })

  it('accepts a rounds override inside 1–5 and trims the topic', () => {
    const result = createSessionSchema.safeParse({ topic: '  Hiring plan  ', councilId: UUID, rounds: 3 })
    expect(result.success && result.data).toEqual({ topic: 'Hiring plan', councilId: UUID, rounds: 3 })
  })

  it.each([1, 2, 3, 4, 5])('accepts rounds = %i', (rounds) => {
    expect(createSessionSchema.safeParse({ topic: 't', councilId: UUID, rounds }).success).toBe(true)
  })

  it.each([
    ['missing topic', { councilId: UUID }, 'topic'],
    ['empty topic', { topic: '', councilId: UUID }, 'topic'],
    ['whitespace-only topic', { topic: '   ', councilId: UUID }, 'topic'],
    ['non-string topic', { topic: 42, councilId: UUID }, 'topic'],
    ['missing councilId', { topic: 't' }, 'councilId'],
    ['non-uuid councilId', { topic: 't', councilId: 'council-1' }, 'councilId'],
    ['null councilId', { topic: 't', councilId: null }, 'councilId'],
    ['rounds 0', { topic: 't', councilId: UUID, rounds: 0 }, 'rounds'],
    ['rounds 6', { topic: 't', councilId: UUID, rounds: 6 }, 'rounds'],
    ['fractional rounds', { topic: 't', councilId: UUID, rounds: 2.5 }, 'rounds'],
    ['rounds as string', { topic: 't', councilId: UUID, rounds: '3' }, 'rounds'],
  ])('rejects %s', (_label, body, field) => {
    const result = createSessionSchema.safeParse(body)
    expect(result.success).toBe(false)
    expect(result.success === false && result.error.issues.map((i) => i.path.join('.'))).toContain(
      field,
    )
  })

  it('rejects an unknown key rather than ignoring it', () => {
    const result = createSessionSchema.safeParse({ topic: 't', councilId: UUID, status: 'completed' })
    expect(result.success).toBe(false)
  })

  it('rejects a non-object body', () => {
    expect(createSessionSchema.safeParse('nope').success).toBe(false)
    expect(createSessionSchema.safeParse(null).success).toBe(false)
  })

  it('surfaces issues with a path and a message — this is the 400 body', () => {
    const result = createSessionSchema.safeParse({ councilId: 'nope' })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(Array.isArray(result.error.issues)).toBe(true)
    expect(result.error.issues.length).toBeGreaterThan(0)
    for (const issue of result.error.issues) {
      expect(Array.isArray(issue.path)).toBe(true)
      expect(typeof issue.message).toBe('string')
      expect(issue.message.length).toBeGreaterThan(0)
    }
  })
})

describe('sessionIdSchema', () => {
  it('accepts a UUID', () => {
    expect(sessionIdSchema.safeParse(UUID).success).toBe(true)
  })

  it.each(['not-a-uuid', '', '123', UUID.slice(0, -1)])('rejects %o', (value) => {
    expect(sessionIdSchema.safeParse(value).success).toBe(false)
  })
})
