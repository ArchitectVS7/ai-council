import { describe, expect, it } from 'vitest'

import { findUnknownPersonaId, normalizeCouncilMembers } from './members'

const A = '3f8b6c1e-8f2a-4b7d-9c31-2a1f4e9b7c05'
const B = '9c858901-8a57-4791-81fe-4c455b099bc9'
const C = '1b4e28ba-2fa1-11d2-883f-0016d3cca427'

describe('normalizeCouncilMembers', () => {
  it('renumbers sparse positions to a contiguous 0-based sequence', () => {
    expect(
      normalizeCouncilMembers([
        { personaId: A, position: 0 },
        { personaId: B, position: 5 },
        { personaId: C, position: 9 },
      ]),
    ).toEqual([
      { personaId: A, position: 0 },
      { personaId: B, position: 1 },
      { personaId: C, position: 2 },
    ])
  })

  it('orders by the submitted position, not by array order', () => {
    expect(
      normalizeCouncilMembers([
        { personaId: C, position: 2 },
        { personaId: A, position: 0 },
        { personaId: B, position: 1 },
      ]),
    ).toEqual([
      { personaId: A, position: 0 },
      { personaId: B, position: 1 },
      { personaId: C, position: 2 },
    ])
  })

  it('keeps the submitted order for members that tie on position', () => {
    expect(
      normalizeCouncilMembers([
        { personaId: B, position: 1 },
        { personaId: A, position: 1 },
      ]),
    ).toEqual([
      { personaId: B, position: 0 },
      { personaId: A, position: 1 },
    ])
  })

  it('handles the smallest and largest legal speaking orders', () => {
    expect(normalizeCouncilMembers([{ personaId: A, position: 7 }])).toEqual([
      { personaId: A, position: 0 },
    ])

    const eight = Array.from({ length: 8 }, (_, index) => ({
      personaId: `id-${index}`,
      // Descending, so passing requires sorting rather than trusting the array.
      position: 8 - index,
    }))
    expect(normalizeCouncilMembers(eight).map((member) => member.position)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7,
    ])
    expect(normalizeCouncilMembers(eight).map((member) => member.personaId)).toEqual([
      'id-7',
      'id-6',
      'id-5',
      'id-4',
      'id-3',
      'id-2',
      'id-1',
      'id-0',
    ])
  })

  it('returns an empty array unchanged', () => {
    expect(normalizeCouncilMembers([])).toEqual([])
  })

  it('does not mutate the caller’s array', () => {
    const input = [
      { personaId: C, position: 2 },
      { personaId: A, position: 0 },
    ]
    const before = JSON.stringify(input)

    normalizeCouncilMembers(input)

    expect(JSON.stringify(input)).toBe(before)
  })
})

describe('findUnknownPersonaId', () => {
  it('returns null when every member exists', () => {
    expect(
      findUnknownPersonaId(
        [
          { personaId: A, position: 0 },
          { personaId: B, position: 1 },
        ],
        [B, A, C],
      ),
    ).toBeNull()
  })

  it('names the first missing id so the 400 can point at it', () => {
    expect(
      findUnknownPersonaId(
        [
          { personaId: A, position: 0 },
          { personaId: B, position: 1 },
          { personaId: C, position: 2 },
        ],
        [A],
      ),
    ).toBe(B)
  })

  it('treats an empty known set as "nothing exists"', () => {
    expect(findUnknownPersonaId([{ personaId: A, position: 0 }], [])).toBe(A)
  })

  it('returns null for an empty member list', () => {
    expect(findUnknownPersonaId([], [])).toBeNull()
  })
})
