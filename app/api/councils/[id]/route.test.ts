/**
 * `PUT`/`DELETE /api/councils/[id]` (T-023).
 *
 * Two contracts are pinned here. PUT rewrites the whole record and renumbers the
 * speaking order server-side, however the client numbered it. DELETE archives a
 * council that any session still points at — `sessions.council_id` is
 * `on delete set null`, so removing the row would erase the provenance of past
 * runs — and reports which happened as `{archived}`.
 *
 * The repo is mocked, so no database is needed.
 */
import type { Mock } from 'vitest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  archiveCouncil,
  countCouncilReferences,
  deleteCouncil,
  findCouncil,
  findCouncilDetail,
  findPersonasByIds,
  replaceCouncilMembers,
  updateCouncil,
} from '@/lib/db/repo'

import { DELETE, PUT } from './route'

vi.mock('@/lib/db/repo', () => ({
  archiveCouncil: vi.fn(),
  countCouncilReferences: vi.fn(),
  deleteCouncil: vi.fn(),
  findCouncil: vi.fn(),
  findCouncilDetail: vi.fn(),
  findPersonasByIds: vi.fn(),
  replaceCouncilMembers: vi.fn(),
  updateCouncil: vi.fn(),
}))

const archiveCouncilMock = archiveCouncil as unknown as Mock
const countCouncilReferencesMock = countCouncilReferences as unknown as Mock
const deleteCouncilMock = deleteCouncil as unknown as Mock
const findCouncilMock = findCouncil as unknown as Mock
const findCouncilDetailMock = findCouncilDetail as unknown as Mock
const findPersonasByIdsMock = findPersonasByIds as unknown as Mock
const replaceCouncilMembersMock = replaceCouncilMembers as unknown as Mock
const updateCouncilMock = updateCouncil as unknown as Mock

const ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301'
const PRAGMATIST = '9c858901-8a57-4791-81fe-4c455b099bc9'
const SKEPTIC = '1b4e28ba-2fa1-11d2-883f-0016d3cca427'

const ROW = { id: ID, name: 'Decision Panel', archived: false }

const DETAIL = {
  id: ID,
  name: 'Decision Panel',
  description: 'General-purpose judgement.',
  directive: 'Argue adversarially before converging.',
  defaultRounds: 3,
  members: [
    { personaId: SKEPTIC, position: 0, name: 'The Skeptic', color: '#dc2626' },
    { personaId: PRAGMATIST, position: 1, name: 'The Pragmatist', color: '#2563eb' },
  ],
}

function councilInput(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Decision Panel',
    description: 'General-purpose judgement.',
    directive: 'Argue adversarially before converging.',
    defaultRounds: 3,
    members: [
      { personaId: PRAGMATIST, position: 0 },
      { personaId: SKEPTIC, position: 1 },
    ],
    ...overrides,
  }
}

function params(id: string) {
  return { params: Promise.resolve({ id }) }
}

function putRequest(body: unknown): Request {
  return new Request(`http://localhost/api/councils/${ID}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function deleteRequest(): Request {
  return new Request(`http://localhost/api/councils/${ID}`, { method: 'DELETE' })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('PUT /api/councils/[id]', () => {
  it('replaces the fields and the speaking order, and returns the stored council', async () => {
    findPersonasByIdsMock.mockResolvedValue([{ id: PRAGMATIST }, { id: SKEPTIC }])
    updateCouncilMock.mockResolvedValue({ id: ID })
    findCouncilDetailMock.mockResolvedValue(DETAIL)

    const response = await PUT(putRequest(councilInput()), params(ID))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ council: DETAIL })
    // A3: the directive is replaced alongside the display-only description.
    expect(updateCouncilMock).toHaveBeenCalledWith(ID, {
      name: 'Decision Panel',
      description: 'General-purpose judgement.',
      directive: 'Argue adversarially before converging.',
      defaultRounds: 3,
    })
  })

  it('renumbers a reordered speaking order to contiguous positions', async () => {
    findPersonasByIdsMock.mockResolvedValue([{ id: PRAGMATIST }, { id: SKEPTIC }])
    updateCouncilMock.mockResolvedValue({ id: ID })
    findCouncilDetailMock.mockResolvedValue(DETAIL)

    await PUT(
      putRequest(
        councilInput({
          members: [
            { personaId: PRAGMATIST, position: 6 },
            { personaId: SKEPTIC, position: 2 },
          ],
        }),
      ),
      params(ID),
    )

    expect(replaceCouncilMembersMock).toHaveBeenCalledWith(ID, [
      { personaId: SKEPTIC, position: 0 },
      { personaId: PRAGMATIST, position: 1 },
    ])
  })

  it('answers 404 when the id matched no row instead of pretending the write happened', async () => {
    findPersonasByIdsMock.mockResolvedValue([{ id: PRAGMATIST }, { id: SKEPTIC }])
    updateCouncilMock.mockResolvedValue(null)

    const response = await PUT(putRequest(councilInput()), params(ID))

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: `Council ${ID} not found.` })
    expect(replaceCouncilMembersMock).not.toHaveBeenCalled()
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
    ['a whitespace-only name', councilInput({ name: '   ' })],
    ['a missing description key', { ...councilInput(), description: undefined }],
    ['a missing directive key', { ...councilInput(), directive: undefined }],
    ['an over-long directive', councilInput({ directive: 'x'.repeat(2_001) })],
    ['an unknown key', councilInput({ archived: true })],
    [
      'a duplicate persona',
      councilInput({
        members: [
          { personaId: PRAGMATIST, position: 0 },
          { personaId: PRAGMATIST, position: 1 },
        ],
      }),
    ],
  ])('rejects %s with a 400 and writes nothing', async (_label, body) => {
    const response = await PUT(putRequest(body), params(ID))

    expect(response.status).toBe(400)
    const payload = (await response.json()) as { error: string; issues: unknown[] }
    expect(payload.error).toBe('Invalid request body.')
    expect(Array.isArray(payload.issues)).toBe(true)
    expect(updateCouncilMock).not.toHaveBeenCalled()
    expect(replaceCouncilMembersMock).not.toHaveBeenCalled()
  })

  it('names an unknown persona in a 400 and writes nothing', async () => {
    findPersonasByIdsMock.mockResolvedValue([{ id: PRAGMATIST }])

    const response = await PUT(putRequest(councilInput()), params(ID))

    expect(response.status).toBe(400)
    expect(((await response.json()) as { error: string }).error).toBe(
      `Persona ${SKEPTIC} is not in the library; it cannot be seated.`,
    )
    expect(updateCouncilMock).not.toHaveBeenCalled()
  })

  it('rejects a malformed id before touching the database', async () => {
    const response = await PUT(putRequest(councilInput()), params('council-1'))

    expect(response.status).toBe(400)
    expect(((await response.json()) as { error: string }).error).toBe('Invalid council id.')
    expect(updateCouncilMock).not.toHaveBeenCalled()
  })

  it('rejects a body that is not JSON', async () => {
    const response = await PUT(
      new Request(`http://localhost/api/councils/${ID}`, { method: 'PUT', body: 'not json' }),
      params(ID),
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'Request body must be valid JSON.' })
    expect(updateCouncilMock).not.toHaveBeenCalled()
  })

  it('surfaces a write failure as a 500 carrying the real message', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    findPersonasByIdsMock.mockResolvedValue([{ id: PRAGMATIST }, { id: SKEPTIC }])
    updateCouncilMock.mockRejectedValue(new Error('DATABASE_URL is not set.'))

    const response = await PUT(putRequest(councilInput()), params(ID))

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'DATABASE_URL is not set.' })
  })
})

describe('DELETE /api/councils/[id]', () => {
  it('archives a council that sessions still point at, and reports that it archived', async () => {
    findCouncilMock.mockResolvedValue(ROW)
    countCouncilReferencesMock.mockResolvedValue(2)
    archiveCouncilMock.mockResolvedValue({ id: ID })

    const response = await DELETE(deleteRequest(), params(ID))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ archived: true })
    expect(countCouncilReferencesMock).toHaveBeenCalledWith(ID)
    expect(archiveCouncilMock).toHaveBeenCalledWith(ID)
    expect(deleteCouncilMock).not.toHaveBeenCalled()
  })

  it('deletes an unreferenced council and reports that it was not archived', async () => {
    findCouncilMock.mockResolvedValue(ROW)
    countCouncilReferencesMock.mockResolvedValue(0)

    const response = await DELETE(deleteRequest(), params(ID))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ archived: false })
    expect(deleteCouncilMock).toHaveBeenCalledWith(ID)
    expect(archiveCouncilMock).not.toHaveBeenCalled()
  })

  it('is idempotent for an already archived council: no second write', async () => {
    findCouncilMock.mockResolvedValue({ ...ROW, archived: true })

    const response = await DELETE(deleteRequest(), params(ID))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ archived: true })
    expect(countCouncilReferencesMock).not.toHaveBeenCalled()
    expect(archiveCouncilMock).not.toHaveBeenCalled()
    expect(deleteCouncilMock).not.toHaveBeenCalled()
  })

  it('answers 404 for an unknown id', async () => {
    findCouncilMock.mockResolvedValue(null)

    const response = await DELETE(deleteRequest(), params(ID))

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: `Council ${ID} not found.` })
    expect(archiveCouncilMock).not.toHaveBeenCalled()
    expect(deleteCouncilMock).not.toHaveBeenCalled()
  })

  it('rejects a malformed id before touching the database', async () => {
    const response = await DELETE(deleteRequest(), params('nope'))

    expect(response.status).toBe(400)
    expect(((await response.json()) as { error: string }).error).toBe('Invalid council id.')
    expect(findCouncilMock).not.toHaveBeenCalled()
  })

  it('surfaces a failure as a 500 carrying the real message', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    findCouncilMock.mockResolvedValue(ROW)
    countCouncilReferencesMock.mockRejectedValue(new Error('relation "sessions" does not exist'))

    const response = await DELETE(deleteRequest(), params(ID))

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'relation "sessions" does not exist' })
    expect(deleteCouncilMock).not.toHaveBeenCalled()
  })
})
