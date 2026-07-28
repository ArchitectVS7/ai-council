/**
 * The GET payload assembler: the session and its transcript pass through
 * untouched, and `mockMode` is true for exactly one provider.
 */
import type { Mock } from 'vitest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { findSessionWithTurns } from '@/lib/db/repo'
import { getModel, getProviderName } from '@/lib/llm'

import { loadSessionView } from './view'
import type { SessionView } from './view'

vi.mock('@/lib/db/repo', () => ({ findSessionWithTurns: vi.fn() }))
vi.mock('@/lib/llm', () => ({ getProviderName: vi.fn(), getModel: vi.fn() }))

const findSession = findSessionWithTurns as unknown as Mock
const providerName = getProviderName as unknown as Mock
const defaultModel = getModel as unknown as Mock

const SESSION_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301'
// The smallest rows that make the assertions readable, not full database rows.
const FOUND = {
  session: { id: SESSION_ID, topic: 'Ship on Friday?', status: 'active', turnCursor: 2 },
  turns: [{ id: 'turn-1', seq: 0, kind: 'persona', status: 'complete' }],
}

beforeEach(() => {
  vi.clearAllMocks()
  findSession.mockResolvedValue(FOUND)
  defaultModel.mockReturnValue('claude-sonnet-5')
})

describe('loadSessionView', () => {
  it('reports mock mode only under the mock provider', async () => {
    providerName.mockReturnValue('mock')
    expect((await loadSessionView(SESSION_ID))?.mockMode).toBe(true)

    providerName.mockReturnValue('anthropic')
    expect((await loadSessionView(SESSION_ID))?.mockMode).toBe(false)

    providerName.mockReturnValue('openai')
    expect((await loadSessionView(SESSION_ID))?.mockMode).toBe(false)
  })

  it('passes the session and its transcript through unchanged', async () => {
    providerName.mockReturnValue('anthropic')

    const view = (await loadSessionView(SESSION_ID)) as unknown as SessionView

    expect(view.session).toBe(FOUND.session)
    expect(view.turns).toBe(FOUND.turns)
    expect(findSession).toHaveBeenCalledWith(SESSION_ID)
  })

  it('carries the app default model so the chamber can show an effective model (A1)', async () => {
    providerName.mockReturnValue('anthropic')
    defaultModel.mockReturnValue('claude-opus-5')

    expect((await loadSessionView(SESSION_ID))?.defaultModel).toBe('claude-opus-5')
    // The *app* default, not the session's override — called with no argument.
    expect(defaultModel).toHaveBeenCalledWith()
  })

  it('returns null for an unknown id rather than fabricating a payload', async () => {
    providerName.mockReturnValue('mock')
    findSession.mockResolvedValue(null)

    expect(await loadSessionView(SESSION_ID)).toBeNull()
  })

  it('surfaces an unreadable LLM_PROVIDER instead of quietly un-badging the page', async () => {
    providerName.mockImplementation(() => {
      throw new Error('LLM_PROVIDER has an unsupported value "gemini".')
    })

    await expect(loadSessionView(SESSION_ID)).rejects.toThrow(/unsupported value/)
  })
})
