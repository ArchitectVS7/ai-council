// @vitest-environment jsdom
/**
 * Chamber rendering and control wiring (T-013).
 *
 * The fixture is the shape the API actually returns, and `fetch` is stubbed, so
 * nothing here needs a database, a provider, or a network.
 */
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ChamberTurn, ChamberView } from '@/lib/chamber/types'
import { exportSessionMarkdown, markdownFilename } from '@/lib/council/export-md'

import Chamber from './chamber'

const SESSION_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301'
const PROVIDER_ERROR = 'Anthropic request failed (529): overloaded_error'
const CREATED_AT = '2026-07-28T09:15:00.000Z'

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
      createdAt: CREATED_AT,
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
  it('renders every turn, with the only synthesis badged Result and the persona colour applied inline', () => {
    render(<Chamber initialView={fixture()} />)

    expect(within(screen.getByRole('list', { name: 'Transcript' })).getAllByRole('listitem')).toHaveLength(3)
    expect(screen.getByText('Pragmatist')).toBeTruthy()
    expect(screen.getByText('The build is green; ship it.')).toBeTruthy()
    expect(screen.getByText('The Chair')).toBeTruthy()
    // The lone complete synthesis is the latest, so it carries the result badge.
    expect(screen.getByText('Result')).toBeTruthy()

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

/** A transcript turn with fixture defaults; `seq` doubles as the id. */
function turn(overrides: Partial<ChamberTurn> & { seq: number }): ChamberTurn {
  return {
    id: `t-${overrides.seq}`,
    kind: 'persona',
    speakerName: 'Pragmatist',
    round: 1,
    content: 'The build is green; ship it.',
    status: 'complete',
    error: null,
    ...overrides,
  }
}

/** The base fixture with a different session status or cursor. */
function sessionFixture(
  patch: Partial<ChamberView['session']>,
  turns?: ChamberTurn[],
): ChamberView {
  const base = fixture()
  return {
    ...base,
    session: { ...base.session, ...patch },
    ...(turns === undefined ? {} : { turns }),
  }
}

describe('chamber interjection', () => {
  const INTERJECTED = [
    turn({ seq: 0 }),
    turn({ seq: 1, kind: 'interjection', speakerName: null, content: 'Stay on the rollback question.' }),
  ]

  it('styles an interjection differently from a persona turn', () => {
    render(<Chamber initialView={fixture({ turns: INTERJECTED })} />)

    const persona = screen.getByTestId('turn-0')
    const interjection = screen.getByTestId('turn-1')

    expect(interjection.className).not.toBe(persona.className)
    // Asserted on a marker of the interjection branch, so collapsing the two
    // branches into one fails here rather than passing on a coincidence.
    expect(interjection.className).toContain('italic')
    expect(persona.className).not.toContain('italic')

    expect(within(interjection).getByText('Convener')).toBeTruthy()
    expect(within(interjection).getByText('Interjection')).toBeTruthy()
    expect(within(persona).queryByText('Interjection')).toBeNull()
  })

  it('posts the note as JSON and reloads the session from the server', async () => {
    const fetchSpy = stubFetch(async (url) =>
      url.endsWith('/interject') ? json({ ok: true, turn: { id: 't-1', seq: 1 } }) : json(fixture()),
    )

    render(<Chamber initialView={fixture({ turns: [turn({ seq: 0 })] })} />)
    const box = screen.getByLabelText('Interject') as HTMLTextAreaElement
    fireEvent.change(box, { target: { value: 'Stay on the rollback question.' } })
    fireEvent.click(button('Interject'))

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2))
    expect(fetchSpy.mock.calls[0][0]).toBe(`/api/sessions/${SESSION_ID}/interject`)
    const init = fetchSpy.mock.calls[0][1] as RequestInit
    expect(init.method).toBe('POST')
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(init.body).toBe(JSON.stringify({ content: 'Stay on the rollback question.' }))
    // The refetch is the plain GET — the note is never appended locally.
    expect(fetchSpy.mock.calls[1][0]).toBe(`/api/sessions/${SESSION_ID}`)
    expect(fetchSpy.mock.calls[1][1]).toBeUndefined()

    await waitFor(() => expect(box.value).toBe(''))
  })

  it('surfaces a refusal verbatim and keeps the typed note', async () => {
    const refusal = 'The most recent turn failed; retry it before adding an interjection.'
    const fetchSpy = stubFetch(async () => json({ error: refusal }, 409))

    render(<Chamber initialView={fixture({ turns: [turn({ seq: 0 })] })} />)
    const box = screen.getByLabelText('Interject') as HTMLTextAreaElement
    fireEvent.change(box, { target: { value: 'Stay on the rollback question.' } })
    fireEvent.click(button('Interject'))

    expect((await screen.findByRole('alert')).textContent).toBe(refusal)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(box.value).toBe('Stay on the rollback question.')
  })

  it('refuses to post an empty or whitespace-only note', () => {
    render(<Chamber initialView={fixture({ turns: [turn({ seq: 0 })] })} />)

    expect(button('Interject').disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Interject'), { target: { value: '   ' } })
    expect(button('Interject').disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Interject'), { target: { value: 'Say more about cost.' } })
    expect(button('Interject').disabled).toBe(false)
  })

  it('stays live at the turn cap, where generation is blocked', () => {
    render(<Chamber initialView={sessionFixture({ turnCursor: 60 }, [turn({ seq: 0 })])} />)
    fireEvent.change(screen.getByLabelText('Interject'), { target: { value: 'One more thing.' } })

    expect(button('Step').disabled).toBe(true)
    // A note generates nothing, so the cap must not block it (PRD §5.3).
    expect(button('Interject').disabled).toBe(false)
  })

  it('is blocked on a session that is no longer active', () => {
    render(<Chamber initialView={sessionFixture({ status: 'completed' }, [turn({ seq: 0 })])} />)
    fireEvent.change(screen.getByLabelText('Interject'), { target: { value: 'One more thing.' } })

    expect(button('Interject').disabled).toBe(true)
  })
})

describe('chamber regenerate', () => {
  const cases: Array<[string, ChamberView, boolean]> = [
    ['a complete persona turn is latest', fixture({ turns: [turn({ seq: 0 })] }), false],
    [
      'a complete synthesis is latest',
      fixture({ turns: [turn({ seq: 0 }), turn({ seq: 1, kind: 'synthesis', speakerName: 'The Chair' })] }),
      false,
    ],
    [
      'the latest turn failed',
      fixture({ turns: [turn({ seq: 0, status: 'failed', content: '', error: PROVIDER_ERROR })] }),
      true,
    ],
    [
      'the latest turn is an interjection',
      fixture({ turns: [turn({ seq: 0 }), turn({ seq: 1, kind: 'interjection', speakerName: null })] }),
      true,
    ],
    ['there are no turns yet', fixture({ turns: [] }), true],
    ['the session is at the turn cap', sessionFixture({ turnCursor: 60 }, [turn({ seq: 0 })]), true],
    ['the session is completed', sessionFixture({ status: 'completed' }, [turn({ seq: 0 })]), true],
  ]

  for (const [name, view, expected] of cases) {
    it(`is ${expected ? 'disabled' : 'enabled'} when ${name}`, () => {
      render(<Chamber initialView={view} />)

      expect(button('Regenerate last').disabled).toBe(expected)
    })
  }

  it('posts to regenerate-last and reloads', async () => {
    const fetchSpy = stubFetch(async (url) =>
      url.endsWith('/regenerate-last') ? json(COMPLETE_TURN) : json(fixture()),
    )

    render(<Chamber initialView={fixture({ turns: [turn({ seq: 0 })] })} />)
    fireEvent.click(button('Regenerate last'))

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2))
    expect(fetchSpy.mock.calls[0][0]).toBe(`/api/sessions/${SESSION_ID}/regenerate-last`)
    expect(fetchSpy.mock.calls[0][1]).toEqual({ method: 'POST' })
    expect(fetchSpy.mock.calls[1][0]).toBe(`/api/sessions/${SESSION_ID}`)
  })
})

describe('chamber reopen', () => {
  it('is absent on an active session', () => {
    render(<Chamber initialView={fixture()} />)

    expect(screen.queryByRole('button', { name: 'Reopen' })).toBeNull()
  })

  it('is absent on an abandoned session', () => {
    render(<Chamber initialView={sessionFixture({ status: 'abandoned' })} />)

    expect(screen.queryByRole('button', { name: 'Reopen' })).toBeNull()
  })

  it('is shown and live on a completed session', () => {
    render(<Chamber initialView={sessionFixture({ status: 'completed' })} />)

    expect(button('Reopen').disabled).toBe(false)
  })

  it('posts to reopen and lets the refetched status restore the round controls', async () => {
    // The endpoint answers without a `turn` key; reading one would throw.
    const fetchSpy = stubFetch(async (url) =>
      url.endsWith('/reopen')
        ? json({ ok: true, session: { id: SESSION_ID, status: 'active' } })
        : json(fixture({ turns: [turn({ seq: 0 })] })),
    )

    render(<Chamber initialView={sessionFixture({ status: 'completed' }, [turn({ seq: 0 })])} />)
    expect(button('Step').disabled).toBe(true)

    fireEvent.click(button('Reopen'))

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2))
    expect(fetchSpy.mock.calls[0][0]).toBe(`/api/sessions/${SESSION_ID}/reopen`)
    expect(fetchSpy.mock.calls[0][1]).toEqual({ method: 'POST' })
    expect(fetchSpy.mock.calls[1][0]).toBe(`/api/sessions/${SESSION_ID}`)

    // Restored by server state, not by a local guess.
    await waitFor(() => expect(button('Step').disabled).toBe(false))
    expect(screen.queryByRole('button', { name: 'Reopen' })).toBeNull()
  })
})

describe('chamber synthesis labelling', () => {
  it('labels only the latest of two syntheses Result', () => {
    const turns = [
      turn({ seq: 0 }),
      turn({ seq: 1, kind: 'synthesis', speakerName: 'The Chair', content: 'First reading.' }),
      turn({ seq: 2, round: 2 }),
      turn({ seq: 3, kind: 'synthesis', speakerName: 'The Chair', round: 2, content: 'Second reading.' }),
    ]
    render(<Chamber initialView={fixture({ turns })} />)

    expect(screen.getAllByText('Result')).toHaveLength(1)
    expect(within(screen.getByTestId('turn-3')).getByText('Result')).toBeTruthy()
    expect(within(screen.getByTestId('turn-1')).getByText('Synthesis')).toBeTruthy()
    expect(within(screen.getByTestId('turn-1')).queryByText('Result')).toBeNull()
  })

  it('does not let a failed later synthesis steal the label', () => {
    const turns = [
      turn({ seq: 1, kind: 'synthesis', speakerName: 'The Chair', content: 'First reading.' }),
      turn({
        seq: 3,
        kind: 'synthesis',
        speakerName: 'The Chair',
        status: 'failed',
        content: '',
        error: PROVIDER_ERROR,
      }),
    ]
    render(<Chamber initialView={fixture({ turns })} />)

    expect(within(screen.getByTestId('turn-1')).getByText('Result')).toBeTruthy()
    expect(within(screen.getByTestId('turn-3')).getByText('Synthesis')).toBeTruthy()
  })
})

describe('chamber export', () => {
  /** What the serializer produces for the fixture — the byte-for-byte expectation. */
  function expectedMarkdown(): string {
    const view = fixture()
    return exportSessionMarkdown({
      topic: view.session.topic,
      snapshot: view.session.councilSnapshot,
      createdAt: view.session.createdAt,
      turns: view.turns,
    })
  }

  let writeText: ReturnType<typeof vi.fn>
  let createObjectURL: ReturnType<typeof vi.fn>
  let revokeObjectURL: ReturnType<typeof vi.fn>
  let downloads: string[]

  /** jsdom's Blob has no `text()`, so read it the way a browser used to. */
  function readBlob(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(reader.error)
      reader.readAsText(blob)
    })
  }

  beforeEach(() => {
    writeText = vi.fn(async () => {})
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })

    // jsdom does not implement the object-URL pair, so these are defined rather
    // than spied.
    createObjectURL = vi.fn(() => 'blob:mock-url')
    revokeObjectURL = vi.fn()
    Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, configurable: true })
    Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, configurable: true })

    downloads = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      downloads.push(this.download)
    })
  })

  afterEach(() => {
    Reflect.deleteProperty(navigator, 'clipboard')
    Reflect.deleteProperty(URL, 'createObjectURL')
    Reflect.deleteProperty(URL, 'revokeObjectURL')
    vi.restoreAllMocks()
  })

  it('renders both export buttons, live even on a completed session', () => {
    const view = fixture()
    render(<Chamber initialView={{ ...view, session: { ...view.session, status: 'completed' } }} />)

    expect(button('Copy Markdown').disabled).toBe(false)
    expect(button('Download .md').disabled).toBe(false)
  })

  it('copies exactly what the serializer produces and confirms it', async () => {
    const fetchSpy = stubFetch(async () => json(fixture()))
    render(<Chamber initialView={fixture()} />)

    fireEvent.click(button('Copy Markdown'))

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1))
    expect(writeText.mock.calls[0][0]).toBe(expectedMarkdown())
    expect(await screen.findByText('Copied to the clipboard.')).toBeTruthy()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('downloads a text/markdown blob of the same serializer output', async () => {
    const fetchSpy = stubFetch(async () => json(fixture()))
    render(<Chamber initialView={fixture()} />)

    fireEvent.click(button('Download .md'))

    await waitFor(() => expect(createObjectURL).toHaveBeenCalledTimes(1))
    const blob = createObjectURL.mock.calls[0][0] as Blob
    expect(blob.type).toBe('text/markdown')
    expect(await readBlob(blob)).toBe(expectedMarkdown())

    const view = fixture()
    expect(downloads).toEqual([
      markdownFilename({ topic: view.session.topic, createdAt: view.session.createdAt }),
    ])
    expect(downloads[0].endsWith('.md')).toBe(true)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('surfaces a clipboard failure instead of claiming success', async () => {
    writeText.mockRejectedValue(new Error('Clipboard write denied'))
    render(<Chamber initialView={fixture()} />)

    fireEvent.click(button('Copy Markdown'))

    expect((await screen.findByRole('alert')).textContent).toBe('Clipboard write denied')
    expect(screen.queryByText('Copied to the clipboard.')).toBeNull()
  })
})
