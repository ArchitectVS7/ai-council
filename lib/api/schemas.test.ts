import { describe, expect, it } from 'vitest'

import { createSessionSchema, personaIdSchema, personaInputSchema, sessionIdSchema } from './schemas'

const UUID = '3f8b6c1e-8f2a-4b7d-9c31-2a1f4e9b7c05'

/** A valid persona body, spread into each case so only the field under test varies. */
const PERSONA = {
  name: 'The Pragmatist',
  role: 'Delivery-focused practitioner',
  charter: 'You judge every proposal by what it would take to actually ship it.',
  color: '#2563eb',
}

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

describe('personaInputSchema', () => {
  it('accepts a full persona', () => {
    const result = personaInputSchema.safeParse(PERSONA)
    expect(result.success).toBe(true)
    expect(result.success && result.data).toEqual(PERSONA)
  })

  it('trims the three text fields', () => {
    const result = personaInputSchema.safeParse({
      ...PERSONA,
      name: '  The Skeptic  ',
      role: '  Risk and evidence analyst  ',
      charter: '  You want to know how anyone could tell if the claim were false.  ',
    })
    expect(result.success && result.data).toEqual({
      name: 'The Skeptic',
      role: 'Risk and evidence analyst',
      charter: 'You want to know how anyone could tell if the claim were false.',
      color: '#2563eb',
    })
  })

  it.each(['#2563eb', '#DC2626', '#000000', '#ffffff'])('accepts the color %s', (color) => {
    expect(personaInputSchema.safeParse({ ...PERSONA, color }).success).toBe(true)
  })

  it.each([
    ['missing name', { role: PERSONA.role, charter: PERSONA.charter, color: PERSONA.color }, 'name'],
    ['empty name', { ...PERSONA, name: '' }, 'name'],
    ['whitespace-only name', { ...PERSONA, name: '   ' }, 'name'],
    ['non-string name', { ...PERSONA, name: 42 }, 'name'],
    ['over-long name', { ...PERSONA, name: 'x'.repeat(81) }, 'name'],
    ['missing charter', { name: PERSONA.name, role: PERSONA.role, color: PERSONA.color }, 'charter'],
    ['empty charter', { ...PERSONA, charter: '' }, 'charter'],
    ['whitespace-only charter', { ...PERSONA, charter: ' \n ' }, 'charter'],
    ['non-string charter', { ...PERSONA, charter: null }, 'charter'],
    ['over-long charter', { ...PERSONA, charter: 'x'.repeat(5_001) }, 'charter'],
    ['missing role', { name: PERSONA.name, charter: PERSONA.charter, color: PERSONA.color }, 'role'],
    ['empty role', { ...PERSONA, role: '' }, 'role'],
    ['whitespace-only role', { ...PERSONA, role: '  ' }, 'role'],
    ['multi-line role', { ...PERSONA, role: 'Risk analyst\nand more' }, 'role'],
    ['missing color', { name: PERSONA.name, role: PERSONA.role, charter: PERSONA.charter }, 'color'],
    ['named color', { ...PERSONA, color: 'red' }, 'color'],
    ['shorthand hex', { ...PERSONA, color: '#fff' }, 'color'],
    ['hex without a hash', { ...PERSONA, color: '2563eb' }, 'color'],
  ])('rejects %s', (_label, body, field) => {
    const result = personaInputSchema.safeParse(body)
    expect(result.success).toBe(false)
    expect(result.success === false && result.error.issues.map((i) => i.path.join('.'))).toContain(
      field,
    )
  })

  it('rejects an unknown key rather than ignoring it', () => {
    // `archived` in particular: archiving is a server decision made by DELETE.
    expect(personaInputSchema.safeParse({ ...PERSONA, archived: true }).success).toBe(false)
  })

  it('rejects a non-object body', () => {
    expect(personaInputSchema.safeParse('nope').success).toBe(false)
    expect(personaInputSchema.safeParse(null).success).toBe(false)
  })
})

describe('personaIdSchema', () => {
  it('accepts a UUID', () => {
    expect(personaIdSchema.safeParse(UUID).success).toBe(true)
  })

  it.each(['not-a-uuid', '', '123', UUID.slice(0, -1)])('rejects %o', (value) => {
    expect(personaIdSchema.safeParse(value).success).toBe(false)
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
