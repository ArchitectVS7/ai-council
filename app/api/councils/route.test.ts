/**
 * `GET /api/councils` is a thin read: call the repo, return the rows, and let a
 * failure surface as a 500 carrying the real message (R4).
 *
 * `POST /api/councils` is the create half of the builder (T-023). The
 * acceptance-critical contract here is that the *server* decides the speaking
 * order: whatever positions the client submits, `council_members` is written
 * with a contiguous `0..n-1` sequence.
 *
 * The repo is mocked, so no database is needed.
 */
import type { Mock } from 'vitest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  findCouncilDetail,
  findPersonasByIds,
  insertCouncil,
  listCouncils,
  replaceCouncilMembers,
} from '@/lib/db/repo'

import { GET, POST } from './route'

vi.mock('@/lib/db/repo', () => ({
  findCouncilDetail: vi.fn(),
  findPersonasByIds: vi.fn(),
  insertCouncil: vi.fn(),
  listCouncils: vi.fn(),
  replaceCouncilMembers: vi.fn(),
}))

const findCouncilDetailMock = findCouncilDetail as unknown as Mock
const findPersonasByIdsMock = findPersonasByIds as unknown as Mock
const insertCouncilMock = insertCouncil as unknown as Mock
const listCouncilsMock = listCouncils as unknown as Mock
const replaceCouncilMembersMock = replaceCouncilMembers as unknown as Mock

const COUNCIL_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301'
const PRAGMATIST = '9c858901-8a57-4791-81fe-4c455b099bc9'
const SKEPTIC = '1b4e28ba-2fa1-11d2-883f-0016d3cca427'
const ECONOMIST = '7d8e2f10-3c4b-4a5d-8e6f-9a0b1c2d3e4f'

const COUNCILS = [
  {
    id: COUNCIL_ID,
    name: 'Decision Panel',
    description: 'General-purpose judgement.',
    defaultRounds: 2,
  },
  {
    id: '9c858901-8a57-4791-81fe-4c455b099bc9',
    name: 'Red Team',
    description: null,
    defaultRounds: 3,
  },
]

const DETAIL = {
  id: COUNCIL_ID,
  name: 'Decision Panel',
  description: 'General-purpose judgement.',
  directive: 'Argue adversarially before converging.',
  defaultRounds: 2,
  members: [
    { personaId: PRAGMATIST, position: 0, name: 'The Pragmatist', color: '#2563eb' },
    { personaId: SKEPTIC, position: 1, name: 'The Skeptic', color: '#dc2626' },
  ],
}

function councilInput(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Decision Panel',
    description: 'General-purpose judgement.',
    directive: 'Argue adversarially before converging.',
    defaultRounds: 2,
    members: [
      { personaId: PRAGMATIST, position: 0 },
      { personaId: SKEPTIC, position: 1 },
    ],
    ...overrides,
  }
}

function postRequest(body: unknown): Request {
  return new Request('http://localhost/api/councils', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/councils', () => {
  it('returns the council library the picker needs', async () => {
    listCouncilsMock.mockResolvedValue(COUNCILS)

    const response = await GET()

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ councils: COUNCILS })
  })

  it('returns an empty list rather than a stand-in when the library is empty', async () => {
    listCouncilsMock.mockResolvedValue([])

    const response = await GET()

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ councils: [] })
  })

  it('surfaces a read failure as a 500 carrying the real message', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    listCouncilsMock.mockRejectedValue(new Error('DATABASE_URL is not set.'))

    const response = await GET()

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'DATABASE_URL is not set.' })
  })
})

describe('POST /api/councils', () => {
  it('creates the council and answers with the stored record, members included', async () => {
    findPersonasByIdsMock.mockResolvedValue([{ id: PRAGMATIST }, { id: SKEPTIC }])
    insertCouncilMock.mockResolvedValue({ id: COUNCIL_ID })
    findCouncilDetailMock.mockResolvedValue(DETAIL)

    const response = await POST(postRequest(councilInput()))

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({ council: DETAIL })
    // A3: the directive is written alongside the display-only description.
    expect(insertCouncilMock).toHaveBeenCalledWith({
      name: 'Decision Panel',
      description: 'General-purpose judgement.',
      directive: 'Argue adversarially before converging.',
      defaultRounds: 2,
    })
    expect(findCouncilDetailMock).toHaveBeenCalledWith(COUNCIL_ID)
  })

  it('stores a contiguous 0-based speaking order however the client numbered it', async () => {
    findPersonasByIdsMock.mockResolvedValue([
      { id: PRAGMATIST },
      { id: SKEPTIC },
      { id: ECONOMIST },
    ])
    insertCouncilMock.mockResolvedValue({ id: COUNCIL_ID })
    findCouncilDetailMock.mockResolvedValue(DETAIL)

    const response = await POST(
      postRequest(
        councilInput({
          members: [
            { personaId: SKEPTIC, position: 9 },
            { personaId: ECONOMIST, position: 0 },
            { personaId: PRAGMATIST, position: 4 },
          ],
        }),
      ),
    )

    expect(response.status).toBe(201)
    expect(replaceCouncilMembersMock).toHaveBeenCalledWith(COUNCIL_ID, [
      { personaId: ECONOMIST, position: 0 },
      { personaId: PRAGMATIST, position: 1 },
      { personaId: SKEPTIC, position: 2 },
    ])
  })

  it.each([
    ['one member', councilInput({ members: [{ personaId: PRAGMATIST, position: 0 }] })],
    [
      'nine members',
      councilInput({
        members: Array.from({ length: 9 }, (_, index) => ({
          personaId: `3f8b6c1e-8f2a-4b7d-9c31-2a1f4e9b7c${String(index).padStart(2, '0')}`,
          position: index,
        })),
      }),
    ],
    ['defaultRounds 0', councilInput({ defaultRounds: 0 })],
    ['defaultRounds 6', councilInput({ defaultRounds: 6 })],
    ['fractional defaultRounds', councilInput({ defaultRounds: 2.5 })],
    ['an empty name', councilInput({ name: '  ' })],
    ['a missing directive key', { ...councilInput(), directive: undefined }],
    ['an over-long directive', councilInput({ directive: 'x'.repeat(2_001) })],
    ['an unknown key', councilInput({ archived: true })],
  ])('rejects %s with a 400 and writes nothing', async (_label, body) => {
    const response = await POST(postRequest(body))

    expect(response.status).toBe(400)
    const payload = (await response.json()) as { error: string; issues: unknown[] }
    expect(payload.error).toBe('Invalid request body.')
    expect(Array.isArray(payload.issues)).toBe(true)
    expect(insertCouncilMock).not.toHaveBeenCalled()
    expect(replaceCouncilMembersMock).not.toHaveBeenCalled()
  })

  it('names an unknown persona in a 400 instead of letting a foreign key fail', async () => {
    findPersonasByIdsMock.mockResolvedValue([{ id: PRAGMATIST }])

    const response = await POST(postRequest(councilInput()))

    expect(response.status).toBe(400)
    expect(((await response.json()) as { error: string }).error).toBe(
      `Persona ${SKEPTIC} is not in the library; it cannot be seated.`,
    )
    expect(insertCouncilMock).not.toHaveBeenCalled()
    expect(replaceCouncilMembersMock).not.toHaveBeenCalled()
  })

  it('rejects a body that is not JSON', async () => {
    const response = await POST(
      new Request('http://localhost/api/councils', { method: 'POST', body: 'not json' }),
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'Request body must be valid JSON.' })
    expect(insertCouncilMock).not.toHaveBeenCalled()
  })

  it('surfaces a write failure as a 500 carrying the real message', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    findPersonasByIdsMock.mockResolvedValue([{ id: PRAGMATIST }, { id: SKEPTIC }])
    insertCouncilMock.mockRejectedValue(new Error('DATABASE_URL is not set.'))

    const response = await POST(postRequest(councilInput()))

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'DATABASE_URL is not set.' })
  })
})
