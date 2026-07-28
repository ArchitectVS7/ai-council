/**
 * `GET /api/councils` is a thin read: call the repo, return the rows, and let a
 * failure surface as a 500 carrying the real message (R4). This pins that
 * contract with the repo mocked, so no database is needed.
 */
import type { Mock } from 'vitest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { listCouncils } from '@/lib/db/repo'

import { GET } from './route'

vi.mock('@/lib/db/repo', () => ({ listCouncils: vi.fn() }))

const listCouncilsMock = listCouncils as unknown as Mock

const COUNCILS = [
  {
    id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
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
