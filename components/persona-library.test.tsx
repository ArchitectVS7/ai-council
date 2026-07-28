// @vitest-environment jsdom
/**
 * The persona library and editor on `/personas` (T-022).
 *
 * `fetch` is stubbed, so this exercises the real requests the editor makes and
 * the real list it renders afterwards without a database or a network. Every
 * assertion about what ends up on screen is an assertion about the *server's*
 * response, not about what was typed.
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import PersonaLibrary from './persona-library'

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

const SEEDED = [PRAGMATIST, SKEPTIC]

function json(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response
}

/** Installs a `fetch` double and returns the spy so calls can be asserted. */
function stubFetch(handler: (url: string, init?: RequestInit) => Promise<Response>) {
  const spy = vi.fn((input: RequestInfo | URL, init?: RequestInit) => handler(String(input), init))
  vi.stubGlobal('fetch', spy)
  return spy
}

function field(label: string): HTMLInputElement | HTMLTextAreaElement {
  return screen.getByLabelText(label) as HTMLInputElement | HTMLTextAreaElement
}

function fill(values: { name?: string; role?: string; charter?: string; color?: string }) {
  for (const [label, value] of [
    ['Name', values.name],
    ['Role', values.role],
    ['Charter', values.charter],
    ['Color', values.color],
  ] as const) {
    if (value !== undefined) fireEvent.change(field(label), { target: { value } })
  }
}

function swatchColor(id: string): string {
  return (screen.getByTestId(`swatch-${id}`) as HTMLElement).style.backgroundColor
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('library grid', () => {
  it('lists the seeded personas with name, role, and a color swatch', () => {
    render(<PersonaLibrary initialPersonas={SEEDED} />)

    expect(screen.getByText('The Pragmatist')).toBeTruthy()
    expect(screen.getByText('Delivery-focused practitioner')).toBeTruthy()
    expect(screen.getByText('The Skeptic')).toBeTruthy()
    expect(screen.getByText('Risk and evidence analyst')).toBeTruthy()

    // jsdom normalises an inline color to `rgb()`.
    expect(swatchColor(PRAGMATIST.id)).toBe('rgb(37, 99, 235)')
    expect(swatchColor(SKEPTIC.id)).toBe('rgb(220, 38, 38)')
  })

  it('says so plainly when the library is empty instead of inventing a persona', () => {
    render(<PersonaLibrary initialPersonas={[]} />)

    expect(screen.getByText(/no personas yet/i)).toBeTruthy()
    expect(screen.queryByLabelText('Personas')).toBeNull()
  })
})

describe('creating a persona', () => {
  it('posts exactly the four fields and renders the persona the server stored', async () => {
    // A different name than typed, so passing this test requires rendering the
    // response rather than the form input.
    const stored = { ...SKEPTIC, name: 'The Skeptic (stored)' }
    const fetchSpy = stubFetch(async () => json({ persona: stored }, 201))
    render(<PersonaLibrary initialPersonas={[PRAGMATIST]} />)

    fill({
      name: '  The Skeptic  ',
      role: SKEPTIC.role,
      charter: SKEPTIC.charter,
      color: '#dc2626',
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create persona' }))

    await screen.findByText('The Skeptic (stored)')

    const [url, init] = fetchSpy.mock.calls[0]
    expect(url).toBe('/api/personas')
    expect(init?.method).toBe('POST')
    expect(JSON.parse(String(init?.body))).toEqual({
      name: 'The Skeptic',
      role: SKEPTIC.role,
      charter: SKEPTIC.charter,
      color: '#dc2626',
    })
    expect(swatchColor(SKEPTIC.id)).toBe('rgb(220, 38, 38)')
    // The form is back in create mode with empty fields.
    expect(field('Name').value).toBe('')
  })

  it.each([
    ['an empty name', { name: '   ', role: 'r', charter: 'c' }, /name is required/i],
    ['an empty charter', { name: 'n', role: 'r', charter: '  ' }, /charter is required/i],
  ])('refuses %s before reaching the server', async (_label, values, expected) => {
    const fetchSpy = stubFetch(async () => json({ persona: SKEPTIC }, 201))
    render(<PersonaLibrary initialPersonas={[PRAGMATIST]} />)

    fill(values)
    fireEvent.click(screen.getByRole('button', { name: 'Create persona' }))

    expect((await screen.findByRole('alert')).textContent).toMatch(expected)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('surfaces a server 400 with its zod issues and leaves the library untouched', async () => {
    stubFetch(async () =>
      json({ error: 'Invalid request body.', issues: [{ message: 'Name is required.' }] }, 400),
    )
    render(<PersonaLibrary initialPersonas={[PRAGMATIST]} />)

    fill({ name: 'x', role: 'r', charter: 'c' })
    fireEvent.click(screen.getByRole('button', { name: 'Create persona' }))

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toBe('Invalid request body. Name is required.')
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    expect(screen.queryByText('x')).toBeNull()
  })
})

describe('editing a persona', () => {
  it('round-trips: the form pre-fills, PUTs the four fields, and shows the stored values', async () => {
    const stored = { ...PRAGMATIST, name: 'The Pragmatist II', charter: 'Revised charter.' }
    const fetchSpy = stubFetch(async () => json({ persona: stored }))
    render(<PersonaLibrary initialPersonas={SEEDED} />)

    fireEvent.click(screen.getByRole('button', { name: 'Edit The Pragmatist' }))

    expect(field('Name').value).toBe(PRAGMATIST.name)
    expect(field('Role').value).toBe(PRAGMATIST.role)
    expect(field('Charter').value).toBe(PRAGMATIST.charter)
    expect((field('Color') as HTMLInputElement).value).toBe(PRAGMATIST.color)

    fill({ charter: 'Revised charter.' })
    fireEvent.click(screen.getByRole('button', { name: 'Save persona' }))

    await screen.findByText('The Pragmatist II')

    const [url, init] = fetchSpy.mock.calls[0]
    expect(url).toBe(`/api/personas/${PRAGMATIST.id}`)
    expect(init?.method).toBe('PUT')
    expect(JSON.parse(String(init?.body))).toEqual({
      name: PRAGMATIST.name,
      role: PRAGMATIST.role,
      charter: 'Revised charter.',
      color: PRAGMATIST.color,
    })
    // Replaced in place, not appended: still two cards.
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.queryByText('The Pragmatist')).toBeNull()
  })
})

describe('deleting a persona', () => {
  it('reports that a referenced persona was archived, and says old sessions are unaffected', async () => {
    const fetchSpy = stubFetch(async () => json({ archived: true }))
    render(<PersonaLibrary initialPersonas={SEEDED} />)

    fireEvent.click(screen.getByRole('button', { name: 'Delete The Skeptic' }))

    const status = await screen.findByRole('status')
    expect(status.textContent).toMatch(/archived rather than deleted/i)
    expect(status.textContent).toMatch(/existing sessions are unaffected/i)

    expect(fetchSpy.mock.calls[0][0]).toBe(`/api/personas/${SKEPTIC.id}`)
    expect(fetchSpy.mock.calls[0][1]?.method).toBe('DELETE')
    // Archived personas are hidden from the library by default.
    expect(screen.queryByText('The Skeptic')).toBeNull()
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
  })

  it('reports a plain delete when nothing referenced the persona', async () => {
    stubFetch(async () => json({ archived: false }))
    render(<PersonaLibrary initialPersonas={SEEDED} />)

    fireEvent.click(screen.getByRole('button', { name: 'Delete The Skeptic' }))

    const status = await screen.findByRole('status')
    expect(status.textContent).toBe('The Skeptic was deleted.')
    expect(screen.queryByText('The Skeptic')).toBeNull()
  })

  it('surfaces a failed delete and keeps the card', async () => {
    stubFetch(async () => json({ error: 'DATABASE_URL is not set.' }, 500))
    render(<PersonaLibrary initialPersonas={SEEDED} />)

    fireEvent.click(screen.getByRole('button', { name: 'Delete The Skeptic' }))

    expect((await screen.findByRole('alert')).textContent).toBe('DATABASE_URL is not set.')
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(2))
  })
})
