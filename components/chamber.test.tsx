// @vitest-environment jsdom
/**
 * Chamber rendering and control wiring (T-013).
 *
 * The fixture is the shape the API actually returns, and `fetch` is stubbed, so
 * nothing here needs a database, a provider, or a network.
 */
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ChamberView } from '@/lib/chamber/types'

import Chamber from './chamber'

const SESSION_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301'
const PROVIDER_ERROR = 'Anthropic request failed (529): overloaded_error'

const SNAPSHOT = {
  name: 'Decision Panel',
  rounds: 2,
  members: [
    { name: 'Pragmatist', role: 'Ships things', charter: 'Focus on what is buildable.', color: '#2563eb' },
    { name: 'Skeptic', role: 'Doubts things', charter: 'Challenge every assumption.', color: '#dc2626' },
    { name: 'Visionary', role: 'Dreams things', charter: 'Look past the quarter.', color: '#16a34a' },
  ],
}

function fixture(overrides: Partial<ChamberView> = {}): ChamberView {
  return {
    session: {
      id: SESSION_ID,
      topic: 'Should we ship on Friday?',
      status: 'active',
      turnCursor: 3,
      councilSnapshot: SNAPSHOT,
    },
    turns: [
      {
        id: 'turn-a',
        seq: 0,
        kind: 'persona',
        speakerName: 'Pragmatist',
        round: 1,
        content: 'The build is green; ship it.',
        status: 'complete',
        error: null,
      },
      {
        id: 'turn-b',
        seq: 1,
        kind: 'synthesis',
        speakerName: 'The Chair',
        round: 1,
        content: 'The council leans toward shipping with a rollback plan.',
        status: 'complete',
        error: null,
      },
      {
        id: 'turn-c',
        seq: 2,
        kind: 'persona',
        speakerName: 'Skeptic',
        round: 1,
        content: '',
        status: 'failed',
        error: PROVIDER_ERROR,
      },
    ],
    mockMode: true,
    ...overrides,
  }
}

function json(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response
}

const COMPLETE_TURN = { ok: true, turn: { id: 'turn-c', seq: 2, status: 'complete' } }

/** Installs a `fetch` double and returns the spy so calls can be asserted. */
function stubFetch(handler: (url: string, init?: RequestInit) => Promise<Response>) {
  const spy = vi.fn((input: RequestInfo | URL, init?: RequestInit) => handler(String(input), init))
  vi.stubGlobal('fetch', spy)
  return spy
}

function button(name: string): HTMLButtonElement {
  return screen.getByRole('button', { name }) as HTMLButtonElement
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('chamber transcript', () => {
  it('renders every turn, with the synthesis labelled and the persona colour applied inline', () => {
    render(<Chamber initialView={fixture()} />)

    expect(within(screen.getByRole('list', { name: 'Transcript' })).getAllByRole('listitem')).toHaveLength(3)
    expect(screen.getByText('Pragmatist')).toBeTruthy()
    expect(screen.getByText('The build is green; ship it.')).toBeTruthy()
    expect(screen.getByText('The Chair')).toBeTruthy()
    expect(screen.getByText('Synthesis')).toBeTruthy()

    // Colours come from the council snapshot, so they are inline styles rather
    // than classes (jsdom may serialise the hex as `rgb(...)`).
    const style = screen.getByTestId('turn-0').getAttribute('style') ?? ''
    expect(/#2563eb|rgb\(37,\s*99,\s*235\)/.test(style)).toBe(true)
    const failedStyle = screen.getByTestId('turn-2').getAttribute('style') ?? ''
    expect(/#dc2626|rgb\(220,\s*38,\s*38\)/.test(failedStyle)).toBe(true)
  })

  it('shows the provider error verbatim and a Retry button on the failed turn only', () => {
    render(<Chamber initialView={fixture()} />)

    const retries = screen.getAllByRole('button', { name: 'Retry' })
    expect(retries).toHaveLength(1)

    const failedTurn = screen.getByTestId('turn-2')
    expect(within(failedTurn).getByRole('button', { name: 'Retry' })).toBe(retries[0])
    expect(within(failedTurn).getByText(PROVIDER_ERROR)).toBeTruthy()

    expect(within(screen.getByTestId('turn-0')).queryByRole('button', { name: 'Retry' })).toBeNull()
    expect(within(screen.getByTestId('turn-1')).queryByRole('button', { name: 'Retry' })).toBeNull()
  })

  it('posts to retry-last and reloads the session from the server', async () => {
    const fetchSpy = stubFetch(async (url) =>
      url.endsWith('/retry-last') ? json(COMPLETE_TURN) : json(fixture()),
    )

    render(<Chamber initialView={fixture()} />)
    fireEvent.click(button('Retry'))

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2))
    expect(fetchSpy.mock.calls[0][0]).toBe(`/api/sessions/${SESSION_ID}/retry-last`)
    expect(fetchSpy.mock.calls[0][1]).toEqual({ method: 'POST' })
    // The refetch is the plain GET — the client never patches state locally.
    expect(fetchSpy.mock.calls[1][0]).toBe(`/api/sessions/${SESSION_ID}`)
    expect(fetchSpy.mock.calls[1][1]).toBeUndefined()
  })
})

describe('chamber header', () => {
  it('renders the turn counter against the 60-turn cap', () => {
    render(<Chamber initialView={fixture()} />)

    expect(screen.getByTestId('turn-counter').textContent).toBe('3 / 60')
  })

  it('renders the council name from the snapshot', () => {
    render(<Chamber initialView={fixture()} />)

    expect(screen.getByText('Decision Panel')).toBeTruthy()
  })

  it('badges MOCK MODE when the server reports the mock provider', () => {
    render(<Chamber initialView={fixture({ mockMode: true })} />)

    expect(screen.getByText(/mock mode/i)).toBeTruthy()
  })

  it('renders no badge when the server reports a real provider', () => {
    render(<Chamber initialView={fixture({ mockMode: false })} />)

    expect(screen.queryByText(/mock mode/i)).toBeNull()
  })
})

describe('chamber controls', () => {
  it('disables the generating controls while a turn is in flight, leaving Pause live', async () => {
    let releaseAdvance!: (response: Response) => void
    const fetchSpy = stubFetch(async (url) => {
      if (url.endsWith('/advance')) {
        return new Promise<Response>((resolve) => {
          releaseAdvance = resolve
        })
      }
      return json(fixture())
    })

    render(<Chamber initialView={fixture()} />)
    expect(button('Pause').disabled).toBe(true)

    fireEvent.click(button('Run round'))

    await waitFor(() => expect(button('Step').disabled).toBe(true))
    expect(button('Run round').disabled).toBe(true)
    expect(button('Synthesize').disabled).toBe(true)
    expect(button('Retry').disabled).toBe(true)
    // Pause is the one control that must stay live during a run, or it could
    // never be pressed.
    expect(button('Pause').disabled).toBe(false)

    fireEvent.click(button('Pause'))
    releaseAdvance(json(COMPLETE_TURN))

    await waitFor(() => expect(button('Step').disabled).toBe(false))
    expect(button('Pause').disabled).toBe(true)
    // One advance, its refetch, and nothing after the pause.
    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })

  it('steps once through advance and reloads', async () => {
    const fetchSpy = stubFetch(async (url) =>
      url.endsWith('/advance') ? json(COMPLETE_TURN) : json(fixture()),
    )

    render(<Chamber initialView={fixture()} />)
    fireEvent.click(button('Step'))

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2))
    expect(fetchSpy.mock.calls[0][0]).toBe(`/api/sessions/${SESSION_ID}/advance`)
  })

  it('posts to synthesize', async () => {
    const fetchSpy = stubFetch(async (url) =>
      url.endsWith('/synthesize') ? json(COMPLETE_TURN) : json(fixture()),
    )

    render(<Chamber initialView={fixture()} />)
    fireEvent.click(button('Synthesize'))

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2))
    expect(fetchSpy.mock.calls[0][0]).toBe(`/api/sessions/${SESSION_ID}/synthesize`)
  })

  it('surfaces a server refusal verbatim and leaves the transcript untouched', async () => {
    const refusal = 'A turn is already being generated for this session. Wait for it to finish.'
    const fetchSpy = stubFetch(async () => json({ error: refusal }, 409))

    render(<Chamber initialView={fixture()} />)
    fireEvent.click(button('Step'))

    expect((await screen.findByRole('alert')).textContent).toBe(refusal)
    expect(within(screen.getByRole('list', { name: 'Transcript' })).getAllByRole('listitem')).toHaveLength(3)
    // A refusal is not followed by a refetch.
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('halts a run round on a failed turn and points at Retry', async () => {
    const failed = { ok: true, turn: { id: 'turn-c', seq: 2, status: 'failed' } }
    stubFetch(async (url) => (url.endsWith('/advance') ? json(failed) : json(fixture())))

    render(<Chamber initialView={fixture()} />)
    fireEvent.click(button('Run round'))

    expect((await screen.findByRole('alert')).textContent).toMatch(/failed to generate/i)
    await waitFor(() => expect(button('Step').disabled).toBe(false))
  })

  it('blocks generation on a session that is no longer active', () => {
    const view = fixture()
    render(<Chamber initialView={{ ...view, session: { ...view.session, status: 'completed' } }} />)

    expect(button('Step').disabled).toBe(true)
    expect(button('Run round').disabled).toBe(true)
    expect(button('Synthesize').disabled).toBe(true)
    expect(button('Retry').disabled).toBe(true)
  })

  it('blocks generation at the 60-turn cap', () => {
    const view = fixture()
    render(<Chamber initialView={{ ...view, session: { ...view.session, turnCursor: 60 } }} />)

    expect(screen.getByTestId('turn-counter').textContent).toBe('60 / 60')
    expect(button('Step').disabled).toBe(true)
    expect(button('Synthesize').disabled).toBe(true)
  })
})
