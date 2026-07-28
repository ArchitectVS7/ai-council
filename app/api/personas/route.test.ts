/**
 * `GET /api/personas` is a thin library read; `POST` is a zod-validated create.
 * Both are pinned with the repo mocked, so no database is needed.
 */
import type { Mock } from 'vitest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { insertPersona, listPersonas } from '@/lib/db/repo'

import { GET, POST } from './route'

vi.mock('@/lib/db/repo', () => ({ insertPersona: vi.fn(), listPersonas: vi.fn() }))

const listPersonasMock = listPersonas as unknown as Mock
const insertPersonaMock = insertPersona as unknown as Mock

const PRAGMATIST = {
  id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
  name: 'The Pragmatist',
  role: 'Delivery-focused practitioner',
  charter: 'You judge every proposal by what it would take to actually ship it.',
  color: '#2563eb',
}

const SKEPTIC = {
  id: '9c858901-8a57-4791-81fe-4c455b099bc9',
  name: 'The Skeptic',
  role: 'Risk and evidence analyst',
  charter: 'You want to know how anyone could tell if the claim on the table were false.',
  color: '#dc2626',
}

/** What the repo hands back on a write: the whole row, timestamps and all. */
const PRAGMATIST_ROW = {
  ...PRAGMATIST,
  archived: false,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
}

/** The four editable fields, fresh each time so a case cannot mutate the next. */
function personaInput() {
  return {
    name: PRAGMATIST.name,
    role: PRAGMATIST.role,
    charter: PRAGMATIST.charter,
    color: PRAGMATIST.color,
  }
}

function post(body: unknown): Request {
  return new Request('http://localhost/api/personas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/personas', () => {
  it('returns the persona library the grid renders', async () => {
    listPersonasMock.mockResolvedValue([PRAGMATIST, SKEPTIC])

    const response = await GET()

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ personas: [PRAGMATIST, SKEPTIC] })
  })

  it('returns an empty list rather than a stand-in when the library is empty', async () => {
    listPersonasMock.mockResolvedValue([])

    const response = await GET()

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ personas: [] })
  })

  it('surfaces a read failure as a 500 carrying the real message', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    listPersonasMock.mockRejectedValue(new Error('DATABASE_URL is not set.'))

    const response = await GET()

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'DATABASE_URL is not set.' })
  })
})

describe('POST /api/personas', () => {
  it('creates a persona and returns it without the archived flag or timestamps', async () => {
    insertPersonaMock.mockResolvedValue(PRAGMATIST_ROW)

    const response = await POST(
      post({
        name: '  The Pragmatist  ',
        role: PRAGMATIST.role,
        charter: PRAGMATIST.charter,
        color: PRAGMATIST.color,
      }),
    )

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({ persona: PRAGMATIST })
    // The trimmed value is what reaches the database.
    expect(insertPersonaMock).toHaveBeenCalledWith({
      name: 'The Pragmatist',
      role: PRAGMATIST.role,
      charter: PRAGMATIST.charter,
      color: PRAGMATIST.color,
    })
  })

  it.each([
    ['an empty name', { ...personaInput(), name: '' }],
    ['a whitespace-only name', { ...personaInput(), name: '   ' }],
    ['an empty charter', { ...personaInput(), charter: '' }],
    ['a whitespace-only charter', { ...personaInput(), charter: '  ' }],
    ['a malformed color', { ...personaInput(), color: 'red' }],
    ['an unknown key', { ...personaInput(), archived: true }],
  ])('rejects %s with a 400 and writes nothing', async (_label, body) => {
    const response = await POST(post(body))

    expect(response.status).toBe(400)
    const payload = (await response.json()) as { error: string; issues: unknown[] }
    expect(payload.error).toBe('Invalid request body.')
    expect(Array.isArray(payload.issues)).toBe(true)
    expect(insertPersonaMock).not.toHaveBeenCalled()
  })

  it('rejects a body that is not JSON', async () => {
    const response = await POST(
      new Request('http://localhost/api/personas', { method: 'POST', body: 'not json' }),
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'Request body must be valid JSON.' })
    expect(insertPersonaMock).not.toHaveBeenCalled()
  })

  it('surfaces a write failure as a 500 carrying the real message', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    insertPersonaMock.mockRejectedValue(new Error('Persona insert returned no row.'))

    const response = await POST(post(personaInput()))

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'Persona insert returned no row.' })
  })
})
