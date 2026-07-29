// @vitest-environment jsdom
/**
 * "Import session" on `/` (T-031).
 *
 * `fetch` is stubbed and the router is mocked, so this drives the real request
 * the control makes and the real navigation it performs — no database, no
 * provider, no network.
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import ImportSession from './import-session'

// jsdom implements `Blob` without `text()`, which every browser has had since
// 2020 and which the component uses. Backed by `FileReader`, the way the
// chamber's export test reads a blob.
beforeAll(() => {
  if (typeof Blob.prototype.text === 'function') return
  Blob.prototype.text = function readAsText(this: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(reader.error)
      reader.readAsText(this)
    })
  }
})

const push = vi.hoisted(() => vi.fn())
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

const SESSION_ID = 'b1f0c2d4-5e6a-47b8-9c0d-1e2f3a4b5c6d'

const DOCUMENT_TEXT = JSON.stringify(
  {
    schemaVersion: 1,
    session: {
      topic: 'Should we ship on Friday?',
      model: null,
      status: 'active',
      turnCursor: 1,
      createdAt: '2026-07-28T09:15:00.000Z',
      completedAt: null,
      councilSnapshot: { name: 'Decision Panel', rounds: 2, members: [] },
    },
    turns: [],
  },
  null,
  2,
)

function json(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response
}

function stubFetch(handler: (url: string, init?: RequestInit) => Promise<Response>) {
  const spy = vi.fn((input: RequestInfo | URL, init?: RequestInit) => handler(String(input), init))
  vi.stubGlobal('fetch', spy)
  return spy
}

function fileInput(): HTMLInputElement {
  return screen.getByLabelText('Session document') as HTMLInputElement
}

function importButton(): HTMLButtonElement {
  return screen.getByRole('button', { name: 'Import session' }) as HTMLButtonElement
}

/** Attaches a JSON file to the input the way a file picker would. */
function chooseFile(text: string, name = 'session.json') {
  const file = new File([text], name, { type: 'application/json' })
  fireEvent.change(fileInput(), { target: { files: [file] } })
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('import session', () => {
  it('is disabled until a file is chosen', () => {
    render(<ImportSession />)

    expect(importButton().disabled).toBe(true)

    chooseFile(DOCUMENT_TEXT)

    expect(importButton().disabled).toBe(false)
  })

  it('posts the file verbatim to /api/sessions and navigates to the id the server returned', async () => {
    const fetchSpy = stubFetch(async () => json({ session: { id: SESSION_ID } }, 201))
    render(<ImportSession />)

    chooseFile(DOCUMENT_TEXT)
    fireEvent.click(importButton())

    await waitFor(() => expect(push).toHaveBeenCalledWith(`/sessions/${SESSION_ID}`))

    const [url, init] = fetchSpy.mock.calls[0]
    expect(url).toBe('/api/sessions')
    expect(init?.method).toBe('POST')
    // Byte-for-byte what the file held: the client reformats nothing.
    expect(init?.body).toBe(DOCUMENT_TEXT)
  })

  it('surfaces the server’s refusal and its zod issues, and does not navigate', async () => {
    stubFetch(async () =>
      json(
        {
          error: 'Invalid session document.',
          issues: [{ message: 'Turn seq values must be unique and ascending.' }],
        },
        400,
      ),
    )
    render(<ImportSession />)

    chooseFile(DOCUMENT_TEXT)
    fireEvent.click(importButton())

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toBe(
      'Invalid session document. Turn seq values must be unique and ascending.',
    )
    expect(push).not.toHaveBeenCalled()
  })

  it('lets the server judge a file that is not JSON at all', async () => {
    const fetchSpy = stubFetch(async () => json({ error: 'Request body must be valid JSON.' }, 400))
    render(<ImportSession />)

    chooseFile('not json at all', 'notes.json')
    fireEvent.click(importButton())

    expect((await screen.findByRole('alert')).textContent).toBe('Request body must be valid JSON.')
    // The file still went to the server; nothing was parsed or repaired locally.
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(fetchSpy.mock.calls[0][1]?.body).toBe('not json at all')
    expect(push).not.toHaveBeenCalled()
  })

  it('reports a transport failure rather than claiming the import worked', async () => {
    stubFetch(async () => {
      throw new Error('Failed to fetch')
    })
    render(<ImportSession />)

    chooseFile(DOCUMENT_TEXT)
    fireEvent.click(importButton())

    expect((await screen.findByRole('alert')).textContent).toBe('Failed to fetch')
    expect(push).not.toHaveBeenCalled()
  })
})
