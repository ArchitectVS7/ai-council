/**
 * `PUT`/`DELETE /api/personas/[id]` (T-022).
 *
 * The acceptance-critical contract is DELETE: a persona that is still
 * referenced by a council or by history is *archived*, and the response says so
 * (`{archived: true}`). Only an unreferenced persona is actually removed. The
 * repo is mocked, so no database is needed.
 */
import type { Mock } from 'vitest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  archivePersona,
  countPersonaReferences,
  deletePersona,
  findPersona,
  updatePersona,
} from '@/lib/db/repo'

import { DELETE, PUT } from './route'

vi.mock('@/lib/db/repo', () => ({
  archivePersona: vi.fn(),
  countPersonaReferences: vi.fn(),
  deletePersona: vi.fn(),
  findPersona: vi.fn(),
  updatePersona: vi.fn(),
}))

const archivePersonaMock = archivePersona as unknown as Mock
const countPersonaReferencesMock = countPersonaReferences as unknown as Mock
const deletePersonaMock = deletePersona as unknown as Mock
const findPersonaMock = findPersona as unknown as Mock
const updatePersonaMock = updatePersona as unknown as Mock

const ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301'

const PERSONA = {
  id: ID,
  name: 'The Pragmatist',
  role: 'Delivery-focused practitioner',
  charter: 'You judge every proposal by what it would take to actually ship it.',
  color: '#2563eb',
}

const ROW = {
  ...PERSONA,
  archived: false,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
}

function personaInput() {
  return {
    name: PERSONA.name,
    role: PERSONA.role,
    charter: PERSONA.charter,
    color: PERSONA.color,
  }
}

function params(id: string) {
  return { params: Promise.resolve({ id }) }
}

function putRequest(body: unknown): Request {
  return new Request(`http://localhost/api/personas/${ID}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function deleteRequest(): Request {
  return new Request(`http://localhost/api/personas/${ID}`, { method: 'DELETE' })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('PUT /api/personas/[id]', () => {
  it('replaces the four editable fields and returns the stored persona', async () => {
    updatePersonaMock.mockResolvedValue({ ...ROW, charter: 'Revised charter.' })

    const response = await PUT(
      putRequest({ ...personaInput(), charter: '  Revised charter.  ' }),
      params(ID),
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ persona: { ...PERSONA, charter: 'Revised charter.' } })
    expect(updatePersonaMock).toHaveBeenCalledWith(ID, {
      ...personaInput(),
      charter: 'Revised charter.',
    })
  })

  it('answers 404 when the id matched no row instead of pretending the write happened', async () => {
    updatePersonaMock.mockResolvedValue(null)

    const response = await PUT(putRequest(personaInput()), params(ID))

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: `Persona ${ID} not found.` })
  })

  it.each([
    ['an empty name', { ...personaInput(), name: '' }],
    ['a whitespace-only name', { ...personaInput(), name: '  ' }],
    ['an empty charter', { ...personaInput(), charter: '' }],
    ['a whitespace-only charter', { ...personaInput(), charter: ' \n ' }],
    ['a multi-line role', { ...personaInput(), role: 'One\ntwo' }],
    ['an unknown key', { ...personaInput(), archived: true }],
  ])('rejects %s with a 400 and writes nothing', async (_label, body) => {
    const response = await PUT(putRequest(body), params(ID))

    expect(response.status).toBe(400)
    const payload = (await response.json()) as { error: string; issues: unknown[] }
    expect(payload.error).toBe('Invalid request body.')
    expect(Array.isArray(payload.issues)).toBe(true)
    expect(updatePersonaMock).not.toHaveBeenCalled()
  })

  it('rejects a malformed id before touching the database', async () => {
    const response = await PUT(putRequest(personaInput()), params('persona-1'))

    expect(response.status).toBe(400)
    expect(((await response.json()) as { error: string }).error).toBe('Invalid persona id.')
    expect(updatePersonaMock).not.toHaveBeenCalled()
  })

  it('rejects a body that is not JSON', async () => {
    const response = await PUT(
      new Request(`http://localhost/api/personas/${ID}`, { method: 'PUT', body: 'not json' }),
      params(ID),
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'Request body must be valid JSON.' })
    expect(updatePersonaMock).not.toHaveBeenCalled()
  })

  it('surfaces a write failure as a 500 carrying the real message', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    updatePersonaMock.mockRejectedValue(new Error('DATABASE_URL is not set.'))

    const response = await PUT(putRequest(personaInput()), params(ID))

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'DATABASE_URL is not set.' })
  })
})

describe('DELETE /api/personas/[id]', () => {
  it('archives a referenced persona and reports that it archived rather than deleted', async () => {
    findPersonaMock.mockResolvedValue(ROW)
    countPersonaReferencesMock.mockResolvedValue(1)
    archivePersonaMock.mockResolvedValue({ ...ROW, archived: true })

    const response = await DELETE(deleteRequest(), params(ID))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ archived: true })
    expect(countPersonaReferencesMock).toHaveBeenCalledWith({ id: ID, name: PERSONA.name })
    expect(archivePersonaMock).toHaveBeenCalledWith(ID)
    expect(deletePersonaMock).not.toHaveBeenCalled()
  })

  it('deletes an unreferenced persona and reports that it was not archived', async () => {
    findPersonaMock.mockResolvedValue(ROW)
    countPersonaReferencesMock.mockResolvedValue(0)

    const response = await DELETE(deleteRequest(), params(ID))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ archived: false })
    expect(deletePersonaMock).toHaveBeenCalledWith(ID)
    expect(archivePersonaMock).not.toHaveBeenCalled()
  })

  it('is idempotent for an already archived persona: no second write', async () => {
    findPersonaMock.mockResolvedValue({ ...ROW, archived: true })

    const response = await DELETE(deleteRequest(), params(ID))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ archived: true })
    expect(countPersonaReferencesMock).not.toHaveBeenCalled()
    expect(archivePersonaMock).not.toHaveBeenCalled()
    expect(deletePersonaMock).not.toHaveBeenCalled()
  })

  it('answers 404 for an unknown id', async () => {
    findPersonaMock.mockResolvedValue(null)

    const response = await DELETE(deleteRequest(), params(ID))

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: `Persona ${ID} not found.` })
    expect(archivePersonaMock).not.toHaveBeenCalled()
    expect(deletePersonaMock).not.toHaveBeenCalled()
  })

  it('rejects a malformed id before touching the database', async () => {
    const response = await DELETE(deleteRequest(), params('nope'))

    expect(response.status).toBe(400)
    expect(((await response.json()) as { error: string }).error).toBe('Invalid persona id.')
    expect(findPersonaMock).not.toHaveBeenCalled()
  })

  it('surfaces a failure as a 500 carrying the real message', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    findPersonaMock.mockResolvedValue(ROW)
    countPersonaReferencesMock.mockRejectedValue(new Error('relation "sessions" does not exist'))

    const response = await DELETE(deleteRequest(), params(ID))

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'relation "sessions" does not exist' })
    expect(deletePersonaMock).not.toHaveBeenCalled()
  })
})
