import { describe, expect, it } from 'vitest'

import {
  councilIdSchema,
  councilInputSchema,
  createSessionSchema,
  personaIdSchema,
  personaInputSchema,
  sessionIdSchema,
} from './schemas'

const UUID = '3f8b6c1e-8f2a-4b7d-9c31-2a1f4e9b7c05'
const UUID_B = '9c858901-8a57-4791-81fe-4c455b099bc9'
const UUID_C = '1b4e28ba-2fa1-11d2-883f-0016d3cca427'

/** A valid council body, spread into each case so only the field under test varies. */
const COUNCIL = {
  name: 'Decision Panel',
  description: 'General-purpose judgement.',
  defaultRounds: 2,
  members: [
    { personaId: UUID, position: 0 },
    { personaId: UUID_B, position: 1 },
  ],
}

/** `count` distinct members, so the bounds can be exercised without hand-writing UUIDs. */
function seats(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    personaId: `3f8b6c1e-8f2a-4b7d-9c31-2a1f4e9b7c${String(index).padStart(2, '0')}`,
    position: index,
  }))
}

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

describe('councilInputSchema', () => {
  it('accepts a full council', () => {
    const result = councilInputSchema.safeParse(COUNCIL)
    expect(result.success).toBe(true)
    expect(result.success && result.data).toEqual(COUNCIL)
  })

  it('accepts a null description — the form sends null for a blank box', () => {
    const result = councilInputSchema.safeParse({ ...COUNCIL, description: null })
    expect(result.success && result.data.description).toBeNull()
  })

  it('trims the name and the description', () => {
    const result = councilInputSchema.safeParse({
      ...COUNCIL,
      name: '  Red Team  ',
      description: '  Adversarial review.  ',
    })
    expect(result.success && result.data.name).toBe('Red Team')
    expect(result.success && result.data.description).toBe('Adversarial review.')
  })

  it.each([2, 3, 4, 5, 6, 7, 8])('accepts a council of %i personas', (count) => {
    expect(councilInputSchema.safeParse({ ...COUNCIL, members: seats(count) }).success).toBe(true)
  })

  it.each([1, 2, 3, 4, 5])('accepts defaultRounds = %i', (defaultRounds) => {
    expect(councilInputSchema.safeParse({ ...COUNCIL, defaultRounds }).success).toBe(true)
  })

  it('keeps the submitted positions verbatim — normalizing them is the server’s job', () => {
    const result = councilInputSchema.safeParse({
      ...COUNCIL,
      members: [
        { personaId: UUID, position: 9 },
        { personaId: UUID_B, position: 4 },
      ],
    })
    expect(result.success && result.data.members).toEqual([
      { personaId: UUID, position: 9 },
      { personaId: UUID_B, position: 4 },
    ])
  })

  it.each([
    ['a missing name', { ...COUNCIL, name: undefined }, 'name'],
    ['an empty name', { ...COUNCIL, name: '' }, 'name'],
    ['a whitespace-only name', { ...COUNCIL, name: '   ' }, 'name'],
    ['a non-string name', { ...COUNCIL, name: 42 }, 'name'],
    ['an over-long name', { ...COUNCIL, name: 'x'.repeat(81) }, 'name'],
    ['a missing description key', { ...COUNCIL, description: undefined }, 'description'],
    ['an over-long description', { ...COUNCIL, description: 'x'.repeat(1_001) }, 'description'],
    ['defaultRounds 0', { ...COUNCIL, defaultRounds: 0 }, 'defaultRounds'],
    ['defaultRounds 6', { ...COUNCIL, defaultRounds: 6 }, 'defaultRounds'],
    ['fractional defaultRounds', { ...COUNCIL, defaultRounds: 2.5 }, 'defaultRounds'],
    ['defaultRounds as a string', { ...COUNCIL, defaultRounds: '3' }, 'defaultRounds'],
    ['one member', { ...COUNCIL, members: seats(1) }, 'members'],
    ['no members', { ...COUNCIL, members: [] }, 'members'],
    ['nine members', { ...COUNCIL, members: seats(9) }, 'members'],
    [
      'a duplicate personaId',
      {
        ...COUNCIL,
        members: [
          { personaId: UUID, position: 0 },
          { personaId: UUID, position: 1 },
        ],
      },
      'members',
    ],
    [
      'a non-uuid personaId',
      { ...COUNCIL, members: [{ personaId: 'persona-1', position: 0 }, ...seats(1)] },
      'members',
    ],
    [
      'a negative position',
      {
        ...COUNCIL,
        members: [
          { personaId: UUID, position: -1 },
          { personaId: UUID_B, position: 0 },
        ],
      },
      'members',
    ],
    [
      'a fractional position',
      {
        ...COUNCIL,
        members: [
          { personaId: UUID, position: 0.5 },
          { personaId: UUID_B, position: 1 },
        ],
      },
      'members',
    ],
    [
      'an unknown key on a member',
      {
        ...COUNCIL,
        members: [
          { personaId: UUID, position: 0, name: 'The Chair' },
          { personaId: UUID_B, position: 1 },
        ],
      },
      'members',
    ],
  ])('rejects %s', (_label, body, field) => {
    const result = councilInputSchema.safeParse(body)
    expect(result.success).toBe(false)
    expect(result.success === false && result.error.issues.map((i) => i.path[0])).toContain(field)
  })

  it('rejects an unknown key rather than ignoring it', () => {
    // `archived` in particular: archiving is a server decision made by DELETE.
    expect(councilInputSchema.safeParse({ ...COUNCIL, archived: true }).success).toBe(false)
  })

  it('rejects a non-object body', () => {
    expect(councilInputSchema.safeParse('nope').success).toBe(false)
    expect(councilInputSchema.safeParse(null).success).toBe(false)
  })

  it('surfaces issues with a message — this is the 400 body', () => {
    const result = councilInputSchema.safeParse({ ...COUNCIL, members: seats(1) })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.issues.map((issue) => issue.message)).toContain(
      'A council needs at least 2 personas.',
    )
  })
})

describe('councilIdSchema', () => {
  it('accepts a UUID', () => {
    expect(councilIdSchema.safeParse(UUID_C).success).toBe(true)
  })

  it.each(['not-a-uuid', '', '123', UUID.slice(0, -1)])('rejects %o', (value) => {
    expect(councilIdSchema.safeParse(value).success).toBe(false)
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
