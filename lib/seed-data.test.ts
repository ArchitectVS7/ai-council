import { describe, expect, it } from 'vitest'

import { CHAIR_PERSONA_NAME, seedCouncils, seedPersonas } from './seed-data'

// PRD §5.3 (`design-docs/02-PRD-Rebuild.md`): "Council: 2–8 personas. Rounds per run: 1–5."
const MIN_MEMBERS = 2
const MAX_MEMBERS = 8
const MIN_ROUNDS = 1
const MAX_ROUNDS = 5

// PRD §3: banned vocabulary. Word-bounded so "agenda"/"engagement" do not false-positive.
const BANNED_WORDS = /\b(flows?|workflows?|templates?|discussions?|agents?|debates?)\b/i

const personaNames = seedPersonas.map((p) => p.name)

describe('seedPersonas', () => {
  it('ships eight personas with unique names', () => {
    expect(seedPersonas).toHaveLength(8)
    expect(new Set(personaNames).size).toBe(seedPersonas.length)
  })

  it('gives every persona a non-empty name, single-line role and substantive charter', () => {
    for (const persona of seedPersonas) {
      expect(persona.name.trim()).not.toBe('')
      expect(persona.role.trim()).not.toBe('')
      expect(persona.role).not.toContain('\n')
      expect(persona.charter.trim()).not.toBe('')
      expect(persona.charter.trim().length).toBeGreaterThanOrEqual(80)
    }
  })

  it('gives every persona a distinct six-digit hex color', () => {
    const colors = seedPersonas.map((p) => p.color)
    for (const color of colors) {
      expect(color).toMatch(/^#[0-9a-f]{6}$/i)
    }
    expect(new Set(colors).size).toBe(colors.length)
  })

  it('includes The Chair as a persona', () => {
    expect(personaNames).toContain(CHAIR_PERSONA_NAME)
  })
})

describe('seedCouncils', () => {
  it('ships the three default councils', () => {
    expect(new Set(seedCouncils.map((c) => c.name))).toEqual(
      new Set(['Decision Panel', 'Creative Board', 'Red Team']),
    )
    for (const council of seedCouncils) {
      expect(council.description.trim()).not.toBe('')
    }
  })

  it('stays inside the PRD §5.3 member and round limits', () => {
    for (const council of seedCouncils) {
      expect(council.members.length).toBeGreaterThanOrEqual(MIN_MEMBERS)
      expect(council.members.length).toBeLessThanOrEqual(MAX_MEMBERS)
      expect(council.defaultRounds).toBeGreaterThanOrEqual(MIN_ROUNDS)
      expect(council.defaultRounds).toBeLessThanOrEqual(MAX_ROUNDS)
    }
  })

  it('names each member once and only names known personas', () => {
    for (const council of seedCouncils) {
      expect(new Set(council.members).size).toBe(council.members.length)
      for (const member of council.members) {
        expect(personaNames).toContain(member)
      }
    }
  })

  it('never puts The Chair in a speaking order', () => {
    for (const council of seedCouncils) {
      expect(council.members).not.toContain(CHAIR_PERSONA_NAME)
    }
  })

  it('uses every non-Chair persona in at least one council', () => {
    const seated = new Set(seedCouncils.flatMap((c) => c.members))
    for (const name of personaNames) {
      if (name === CHAIR_PERSONA_NAME) continue
      expect(seated).toContain(name)
    }
  })
})

describe('seed vocabulary', () => {
  it('uses no banned word from the PRD §3 glossary', () => {
    for (const persona of seedPersonas) {
      for (const text of [persona.name, persona.role, persona.charter]) {
        expect(text).not.toMatch(BANNED_WORDS)
      }
    }
    for (const council of seedCouncils) {
      for (const text of [council.name, council.description]) {
        expect(text).not.toMatch(BANNED_WORDS)
      }
    }
  })
})
