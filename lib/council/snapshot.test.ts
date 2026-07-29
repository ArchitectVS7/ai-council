import { describe, expect, it } from 'vitest'

import {
  MAX_COUNCIL_MEMBERS,
  MAX_DIRECTIVE_LENGTH,
  MAX_ROUNDS,
  MIN_COUNCIL_MEMBERS,
  MIN_ROUNDS,
  buildCouncilSnapshot,
  type SnapshotSource,
  type SnapshotSourceMember,
} from './snapshot'
import type { CouncilSnapshot } from './types'

function member(overrides: Partial<SnapshotSourceMember> & { position: number }): SnapshotSourceMember {
  return {
    name: `Persona ${overrides.position}`,
    role: 'Role',
    charter: 'A charter.',
    color: '#123456',
    ...overrides,
  }
}

/** A council of three, deliberately handed to the builder out of order. */
function sampleCouncil(overrides: Partial<SnapshotSource> = {}): SnapshotSource {
  return {
    name: 'Decision Panel',
    defaultRounds: 2,
    directive: null,
    members: [
      {
        name: 'Skeptic',
        role: 'Risk analyst',
        charter: 'Challenges assumptions and demands evidence.',
        color: '#b91c1c',
        position: 1,
      },
      {
        name: 'Pragmatist',
        role: 'Delivery lead',
        charter: 'Weighs what can actually ship.',
        color: '#0f766e',
        position: 0,
      },
      {
        name: 'Visionary',
        role: 'Strategist',
        charter: 'Argues from where this could go in five years.',
        color: '#7c3aed',
        position: 2,
      },
    ],
    ...overrides,
  }
}

function expectOk(result: ReturnType<typeof buildCouncilSnapshot>): CouncilSnapshot {
  if (!result.ok) throw new Error(`expected ok, got refusal: ${result.message}`)
  return result.snapshot
}

describe('buildCouncilSnapshot', () => {
  it('produces exactly the PRD §7 shape from a sample council and its personas', () => {
    const result = buildCouncilSnapshot(sampleCouncil())

    expect(result).toEqual({
      ok: true,
      snapshot: {
        name: 'Decision Panel',
        rounds: 2,
        members: [
          {
            name: 'Pragmatist',
            role: 'Delivery lead',
            charter: 'Weighs what can actually ship.',
            color: '#0f766e',
          },
          {
            name: 'Skeptic',
            role: 'Risk analyst',
            charter: 'Challenges assumptions and demands evidence.',
            color: '#b91c1c',
          },
          {
            name: 'Visionary',
            role: 'Strategist',
            charter: 'Argues from where this could go in five years.',
            color: '#7c3aed',
          },
        ],
      },
    })
  })

  it('orders members by position, not by the caller-supplied array order', () => {
    const snapshot = expectOk(buildCouncilSnapshot(sampleCouncil()))
    expect(snapshot.members.map((m) => m.name)).toEqual(['Pragmatist', 'Skeptic', 'Visionary'])
  })

  it('emits only name/role/charter/color per member — no persona id, no position', () => {
    const snapshot = expectOk(buildCouncilSnapshot(sampleCouncil()))
    for (const m of snapshot.members) {
      expect(Object.keys(m).sort()).toEqual(['charter', 'color', 'name', 'role'])
    }
  })

  it('is assignable to CouncilSnapshot', () => {
    const snapshot: CouncilSnapshot = expectOk(buildCouncilSnapshot(sampleCouncil()))
    expect(snapshot.rounds).toBe(2)
  })

  it("uses the council's default rounds when no override is given", () => {
    const snapshot = expectOk(buildCouncilSnapshot(sampleCouncil({ defaultRounds: 4 })))
    expect(snapshot.rounds).toBe(4)
  })

  it('uses the override when one is given', () => {
    const snapshot = expectOk(buildCouncilSnapshot(sampleCouncil({ defaultRounds: 2 }), 5))
    expect(snapshot.rounds).toBe(5)
  })

  it('trims whitespace on the council name and every member field', () => {
    const snapshot = expectOk(
      buildCouncilSnapshot({
        name: '  Red Team  ',
        defaultRounds: 1,
        directive: null,
        members: [
          member({ position: 0, name: ' A ', role: ' r ', charter: ' c ', color: ' #fff ' }),
          member({ position: 1 }),
        ],
      }),
    )
    expect(snapshot.name).toBe('Red Team')
    expect(snapshot.members[0]).toEqual({ name: 'A', role: 'r', charter: 'c', color: '#fff' })
  })

  it(`refuses fewer than ${MIN_COUNCIL_MEMBERS} members`, () => {
    const result = buildCouncilSnapshot(sampleCouncil({ members: [member({ position: 0 })] }))
    expect(result.ok).toBe(false)
    expect(result.ok === false && result.message).toContain(String(MIN_COUNCIL_MEMBERS))
    expect(result.ok === false && result.message).toContain(String(MAX_COUNCIL_MEMBERS))
  })

  it(`refuses more than ${MAX_COUNCIL_MEMBERS} members`, () => {
    const members = Array.from({ length: MAX_COUNCIL_MEMBERS + 1 }, (_, position) =>
      member({ position }),
    )
    const result = buildCouncilSnapshot(sampleCouncil({ members }))
    expect(result.ok).toBe(false)
    expect(result.ok === false && result.message).toContain(`has ${MAX_COUNCIL_MEMBERS + 1} members`)
  })

  it(`refuses rounds below ${MIN_ROUNDS}`, () => {
    const result = buildCouncilSnapshot(sampleCouncil(), MIN_ROUNDS - 1)
    expect(result.ok).toBe(false)
    expect(result.ok === false && result.message).toContain(`between ${MIN_ROUNDS} and ${MAX_ROUNDS}`)
  })

  it(`refuses rounds above ${MAX_ROUNDS}`, () => {
    const result = buildCouncilSnapshot(sampleCouncil(), MAX_ROUNDS + 1)
    expect(result.ok).toBe(false)
    expect(result.ok === false && result.message).toContain(`between ${MIN_ROUNDS} and ${MAX_ROUNDS}`)
  })

  it('refuses a non-integer round count', () => {
    const result = buildCouncilSnapshot(sampleCouncil(), 2.5)
    expect(result.ok).toBe(false)
    expect(result.ok === false && result.message).toContain('whole number')
  })

  it("refuses a council whose stored default_rounds is out of bounds, with no silent clamp", () => {
    const result = buildCouncilSnapshot(sampleCouncil({ defaultRounds: 9 }))
    expect(result).toEqual({
      ok: false,
      message: `Rounds must be a whole number between ${MIN_ROUNDS} and ${MAX_ROUNDS}; got 9.`,
    })
  })

  it('refuses duplicate positions rather than guessing the speaking order', () => {
    const result = buildCouncilSnapshot(
      sampleCouncil({ members: [member({ position: 0 }), member({ position: 0, name: 'Other' })] }),
    )
    expect(result.ok).toBe(false)
    expect(result.ok === false && result.message).toContain('two members at position 0')
  })

  it('refuses an empty charter', () => {
    const result = buildCouncilSnapshot(
      sampleCouncil({
        members: [member({ position: 0, charter: '   ' }), member({ position: 1 })],
      }),
    )
    expect(result.ok).toBe(false)
    expect(result.ok === false && result.message).toContain('empty charter')
  })

  it('refuses an empty color', () => {
    const result = buildCouncilSnapshot(
      sampleCouncil({
        members: [member({ position: 0 }), member({ position: 1, color: '' })],
      }),
    )
    expect(result.ok).toBe(false)
    expect(result.ok === false && result.message).toContain('empty color')
  })

  it('refuses a council with no name', () => {
    const result = buildCouncilSnapshot(sampleCouncil({ name: '  ' }))
    expect(result.ok).toBe(false)
    expect(result.ok === false && result.message).toContain('no name')
  })
})

describe('the council directive (PRD Amendment A3)', () => {
  const DIRECTIVE = 'Argue adversarially. Do not converge until the evidence forces it.'

  it('copies the directive into the snapshot at the {name, rounds, directive, members} key order', () => {
    const snapshot = expectOk(buildCouncilSnapshot(sampleCouncil({ directive: DIRECTIVE })))

    expect(snapshot.directive).toBe(DIRECTIVE)
    // Key order is what the transfer round-trip compares byte for byte.
    expect(Object.keys(snapshot)).toEqual(['name', 'rounds', 'directive', 'members'])
  })

  it('trims the directive', () => {
    const snapshot = expectOk(
      buildCouncilSnapshot(sampleCouncil({ directive: `  ${DIRECTIVE}  ` })),
    )
    expect(snapshot.directive).toBe(DIRECTIVE)
  })

  it.each([
    ['null', null],
    ['an empty string', ''],
    ['whitespace only', '   \n  '],
  ])('omits the key entirely for %s, so the snapshot stays pre-A3 shaped', (_label, directive) => {
    const snapshot = expectOk(buildCouncilSnapshot(sampleCouncil({ directive })))

    expect('directive' in snapshot).toBe(false)
    expect(Object.keys(snapshot)).toEqual(['name', 'rounds', 'members'])
    // Deep-equal to the snapshot a directive-less council produced before A3.
    expect(snapshot).toEqual(expectOk(buildCouncilSnapshot(sampleCouncil({ directive: null }))))
  })

  it(`carries a directive at the ${MAX_DIRECTIVE_LENGTH}-character bound`, () => {
    const long = 'x'.repeat(MAX_DIRECTIVE_LENGTH)
    expect(expectOk(buildCouncilSnapshot(sampleCouncil({ directive: long }))).directive).toBe(long)
  })

  it('does not refuse a legacy over-long directive — the bound lives at the write boundary', () => {
    const tooLong = 'x'.repeat(MAX_DIRECTIVE_LENGTH + 1)
    const snapshot = expectOk(buildCouncilSnapshot(sampleCouncil({ directive: tooLong })))
    expect(snapshot.directive).toBe(tooLong)
  })
})
