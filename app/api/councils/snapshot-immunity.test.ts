/**
 * PRD §7, the snapshot rule: "sessions read personas **only** through
 * `council_snapshot`. `council_id` is a provenance pointer, nullable, never
 * joined for rendering."
 *
 * This is the regression test T-023 exists to make permanent. It drives the
 * *real* route handlers — create a session, capture the raw bytes of both
 * session reads, rename the council and reverse its speaking order through
 * `PUT /api/councils/[id]`, then capture the bytes again — and asserts the two
 * captures are identical. Not "equivalent after parsing": identical text, so a
 * reordered key or a re-resolved council name would fail.
 *
 * The database is replaced by a small in-memory store rather than mocked
 * per-call, so the council edit really does land somewhere the session reads
 * could see it if they were tempted to look. `@/lib/llm` is mocked because
 * `GET /api/sessions/[id]` reads the provider name through `lib/session/view`;
 * the gate must stay free of a database, an API key, and the network.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { PUT as updateCouncilRoute } from './[id]/route'
import { GET as getSession } from '../sessions/[id]/route'
import { GET as listSessionsRoute, POST as createSession } from '../sessions/route'

const COUNCIL_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301'
const SESSION_ID = '5c2f4a1b-6d7e-4f80-9a1b-2c3d4e5f6a7b'
const PRAGMATIST = '9c858901-8a57-4791-81fe-4c455b099bc9'
const SKEPTIC = '1b4e28ba-2fa1-11d2-883f-0016d3cca427'
const ECONOMIST = '7d8e2f10-3c4b-4a5d-8e6f-9a0b1c2d3e4f'

/**
 * Hoisted so the `vi.mock` factory below — which vitest lifts above the imports
 * — can close over it. Fixed timestamps keep the serialized bytes stable.
 */
const store = vi.hoisted(() => {
  const created = new Date('2026-01-01T00:00:00.000Z')

  type Member = { personaId: string; position: number }
  type Persona = { id: string; name: string; role: string; charter: string; color: string }
  type Session = {
    id: string
    topic: string
    councilId: string
    model: string | null
    councilSnapshot: { name: string; rounds: number; directive?: string; members: unknown[] }
    status: string
    turnCursor: number
    createdAt: Date
    updatedAt: Date
    completedAt: Date | null
  }

  const personas: Persona[] = [
    {
      id: '9c858901-8a57-4791-81fe-4c455b099bc9',
      name: 'The Pragmatist',
      role: 'Delivery-focused practitioner',
      charter: 'You judge every proposal by what it would take to actually ship it.',
      color: '#2563eb',
    },
    {
      id: '1b4e28ba-2fa1-11d2-883f-0016d3cca427',
      name: 'The Skeptic',
      role: 'Risk and evidence analyst',
      charter: 'You want to know how anyone could tell if the claim were false.',
      color: '#dc2626',
    },
    {
      id: '7d8e2f10-3c4b-4a5d-8e6f-9a0b1c2d3e4f',
      name: 'The Economist',
      role: 'Incentives and trade-offs',
      charter: 'You follow the money and the second-order effects.',
      color: '#059669',
    },
  ]

  return {
    created,
    personas,
    council: {
      id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
      name: 'Decision Panel',
      description: 'General-purpose judgement.',
      // A3: null at first; one case below adds one *after* a session exists.
      directive: null as string | null,
      defaultRounds: 2,
      archived: false,
    },
    members: [
      { personaId: personas[0].id, position: 0 },
      { personaId: personas[1].id, position: 1 },
      { personaId: personas[2].id, position: 2 },
    ] as Member[],
    sessions: [] as Session[],
  }
})

vi.mock('@/lib/llm', () => ({
  getProviderName: () => 'anthropic',
  // `GET /api/sessions/[id]` also reports the app default model (Amendment A1).
  getModel: () => 'claude-sonnet-5',
}))

vi.mock('@/lib/db/repo', () => {
  function persona(id: string) {
    const found = store.personas.find((entry) => entry.id === id)
    if (!found) throw new Error(`Test store has no persona ${id}.`)
    return found
  }

  return {
    findCouncilWithMembers: async (councilId: string) =>
      councilId === store.council.id
        ? {
            name: store.council.name,
            defaultRounds: store.council.defaultRounds,
            directive: store.council.directive,
            members: store.members.map((member) => {
              const { name, role, charter, color } = persona(member.personaId)
              return { name, role, charter, color, position: member.position }
            }),
          }
        : null,

    insertSession: async (input: {
      topic: string
      councilId: string
      model?: string | null
      snapshot: unknown
    }) => {
      const session = {
        id: SESSION_ID,
        topic: input.topic,
        councilId: input.councilId,
        model: input.model ?? null,
        councilSnapshot: input.snapshot as {
          name: string
          rounds: number
          directive?: string
          members: unknown[]
        },
        status: 'active',
        turnCursor: 0,
        createdAt: store.created,
        updatedAt: store.created,
        completedAt: null,
      }
      store.sessions.push(session)
      return session
    },

    listSessions: async () =>
      store.sessions.map((session) => ({
        id: session.id,
        topic: session.topic,
        // Exactly what the real repo does: the name comes from the frozen copy.
        councilName: session.councilSnapshot.name,
        status: session.status,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      })),

    findSessionWithTurns: async (sessionId: string) => {
      const session = store.sessions.find((entry) => entry.id === sessionId)
      return session ? { session, turns: [] } : null
    },

    findPersonasByIds: async (ids: string[]) =>
      store.personas.filter((entry) => ids.includes(entry.id)).map((entry) => ({ id: entry.id })),

    updateCouncil: async (
      councilId: string,
      patch: {
        name: string
        description: string | null
        directive: string | null
        defaultRounds: number
      },
    ) => {
      if (councilId !== store.council.id) return null
      Object.assign(store.council, patch)
      return { id: councilId }
    },

    replaceCouncilMembers: async (
      _councilId: string,
      members: { personaId: string; position: number }[],
    ) => {
      store.members = members.map((member) => ({ ...member }))
    },

    findCouncilDetail: async (councilId: string) =>
      councilId === store.council.id
        ? {
            id: store.council.id,
            name: store.council.name,
            description: store.council.description,
            directive: store.council.directive,
            defaultRounds: store.council.defaultRounds,
            members: store.members.map((member) => ({
              personaId: member.personaId,
              position: member.position,
              name: persona(member.personaId).name,
              color: persona(member.personaId).color,
            })),
          }
        : null,
  }
})

type SnapshotMember = { name: string; role: string; charter: string; color: string }

function sessionRequest(): Request {
  return new Request(`http://localhost/api/sessions/${SESSION_ID}`)
}

/** The raw bytes of both session reads — the thing the council edit must not move. */
async function readSessionBytes(): Promise<{ one: string; list: string }> {
  const one = await getSession(sessionRequest(), { params: Promise.resolve({ id: SESSION_ID }) })
  const list = await listSessionsRoute()

  expect(one.status).toBe(200)
  expect(list.status).toBe(200)
  return { one: await one.text(), list: await list.text() }
}

beforeEach(() => {
  store.council.name = 'Decision Panel'
  store.council.description = 'General-purpose judgement.'
  store.council.directive = null
  store.council.defaultRounds = 2
  store.members = [
    { personaId: PRAGMATIST, position: 0 },
    { personaId: SKEPTIC, position: 1 },
    { personaId: ECONOMIST, position: 2 },
  ]
  store.sessions.length = 0
})

describe('editing a council cannot alter a session that already ran (PRD §7)', () => {
  it('leaves both session reads byte-identical across a rename and a reorder', async () => {
    const created = await createSession(
      new Request('http://localhost/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: 'Should we ship on Friday?',
          councilId: COUNCIL_ID,
          rounds: 2,
        }),
      }),
    )
    expect(created.status).toBe(201)

    const before = await readSessionBytes()

    // The edit under test: a different name and the speaking order reversed.
    const edited = await updateCouncilRoute(
      new Request(`http://localhost/api/councils/${COUNCIL_ID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Renamed Panel',
          description: 'Rewritten description.',
          directive: 'Rewritten directive.',
          defaultRounds: 5,
          members: [
            { personaId: ECONOMIST, position: 0 },
            { personaId: SKEPTIC, position: 1 },
            { personaId: PRAGMATIST, position: 2 },
          ],
        }),
      }),
      { params: Promise.resolve({ id: COUNCIL_ID }) },
    )

    // The edit must really have landed, or this test would pass vacuously.
    expect(edited.status).toBe(200)
    const editedBody = (await edited.json()) as {
      council: { name: string; defaultRounds: number; members: { name: string }[] }
    }
    expect(editedBody.council.name).toBe('Renamed Panel')
    expect(editedBody.council.defaultRounds).toBe(5)
    expect(editedBody.council.members.map((member) => member.name)).toEqual([
      'The Economist',
      'The Skeptic',
      'The Pragmatist',
    ])

    const after = await readSessionBytes()

    expect(after.one).toBe(before.one)
    expect(after.list).toBe(before.list)
  })

  it('still renders the original council name and speaking order from the snapshot', async () => {
    await createSession(
      new Request('http://localhost/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: 'Hiring plan', councilId: COUNCIL_ID }),
      }),
    )

    await updateCouncilRoute(
      new Request(`http://localhost/api/councils/${COUNCIL_ID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Renamed Panel',
          description: null,
          directive: null,
          defaultRounds: 4,
          members: [
            { personaId: ECONOMIST, position: 0 },
            { personaId: PRAGMATIST, position: 1 },
            { personaId: SKEPTIC, position: 2 },
          ],
        }),
      }),
      { params: Promise.resolve({ id: COUNCIL_ID }) },
    )

    const response = await getSession(sessionRequest(), {
      params: Promise.resolve({ id: SESSION_ID }),
    })
    const body = (await response.json()) as {
      session: {
        councilId: string
        councilSnapshot: { name: string; rounds: number; members: SnapshotMember[] }
      }
    }

    expect(body.session.councilSnapshot.name).toBe('Decision Panel')
    expect(body.session.councilSnapshot.rounds).toBe(2)
    expect(body.session.councilSnapshot.members.map((member) => member.name)).toEqual([
      'The Pragmatist',
      'The Skeptic',
      'The Economist',
    ])
    // The provenance pointer survives; it is simply never resolved for rendering.
    expect(body.session.councilId).toBe(COUNCIL_ID)
    // And nothing in the snapshot points back at a row that could change.
    for (const member of body.session.councilSnapshot.members) {
      expect(Object.keys(member).sort()).toEqual(['charter', 'color', 'name', 'role'])
    }
  })

  it('shows the frozen council name in the sessions list, not the renamed one', async () => {
    await createSession(
      new Request('http://localhost/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: 'Pricing', councilId: COUNCIL_ID }),
      }),
    )

    await updateCouncilRoute(
      new Request(`http://localhost/api/councils/${COUNCIL_ID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Renamed Panel',
          description: null,
          directive: null,
          defaultRounds: 2,
          members: [
            { personaId: SKEPTIC, position: 0 },
            { personaId: PRAGMATIST, position: 1 },
          ],
        }),
      }),
      { params: Promise.resolve({ id: COUNCIL_ID }) },
    )

    const response = await listSessionsRoute()
    const body = (await response.json()) as { sessions: { councilName: string }[] }

    expect(body.sessions.map((session) => session.councilName)).toEqual(['Decision Panel'])
  })

  it('adding a directive after the session was created leaves its reads byte-identical (A3)', async () => {
    const created = await createSession(
      new Request('http://localhost/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: 'Runway', councilId: COUNCIL_ID }),
      }),
    )
    expect(created.status).toBe(201)

    const before = await readSessionBytes()

    const edited = await updateCouncilRoute(
      new Request(`http://localhost/api/councils/${COUNCIL_ID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Decision Panel',
          description: 'General-purpose judgement.',
          directive: 'From now on, argue adversarially.',
          defaultRounds: 2,
          members: [
            { personaId: PRAGMATIST, position: 0 },
            { personaId: SKEPTIC, position: 1 },
            { personaId: ECONOMIST, position: 2 },
          ],
        }),
      }),
      { params: Promise.resolve({ id: COUNCIL_ID }) },
    )

    // The directive really landed on the council, or this would pass vacuously.
    expect(edited.status).toBe(200)
    expect(store.council.directive).toBe('From now on, argue adversarially.')

    const after = await readSessionBytes()

    expect(after.one).toBe(before.one)
    expect(after.list).toBe(before.list)
    // And the frozen snapshot still carries no directive at all.
    expect(before.one).not.toContain('directive')
  })

  it('freezes a directive that was set before the session was created (A3)', async () => {
    store.council.directive = 'Seek a hybrid position rather than a winner.'

    await createSession(
      new Request('http://localhost/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: 'Runway', councilId: COUNCIL_ID }),
      }),
    )

    const before = await readSessionBytes()

    // Clearing it on the council must not reach the session that already ran.
    await updateCouncilRoute(
      new Request(`http://localhost/api/councils/${COUNCIL_ID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Decision Panel',
          description: null,
          directive: null,
          defaultRounds: 2,
          members: [
            { personaId: PRAGMATIST, position: 0 },
            { personaId: SKEPTIC, position: 1 },
          ],
        }),
      }),
      { params: Promise.resolve({ id: COUNCIL_ID }) },
    )

    const response = await getSession(sessionRequest(), {
      params: Promise.resolve({ id: SESSION_ID }),
    })
    const body = (await response.json()) as {
      session: { councilSnapshot: { directive?: string } }
    }

    expect(body.session.councilSnapshot.directive).toBe(
      'Seek a hybrid position rather than a winner.',
    )
    expect((await readSessionBytes()).one).toBe(before.one)
  })
})
