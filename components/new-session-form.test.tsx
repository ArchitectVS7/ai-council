// @vitest-environment jsdom
/**
 * The "New session" form on `/` (T-014).
 *
 * `fetch` is stubbed and the router is mocked, so this exercises the real
 * request the form makes and the real navigation it performs without a
 * database, a provider, or a network.
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ProviderName } from '@/lib/models'

import NewSessionForm from './new-session-form'

const push = vi.hoisted(() => vi.fn())
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

const DECISION_PANEL = '3f2504e0-4f89-41d3-9a0c-0305e82c3301'
const RED_TEAM = '9c858901-8a57-4791-81fe-4c455b099bc9'
const SESSION_ID = 'b1f0c2d4-5e6a-47b8-9c0d-1e2f3a4b5c6d'

const COUNCILS = [
  { id: DECISION_PANEL, name: 'Decision Panel', description: 'General-purpose judgement.', defaultRounds: 2 },
  { id: RED_TEAM, name: 'Red Team', description: null, defaultRounds: 3 },
]

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

/** The default: councils load, and the create call is whatever the test says. */
function stubHappyCouncils(onCreate: () => Response) {
  return stubFetch(async (url) =>
    url === '/api/councils' ? json({ councils: COUNCILS }) : onCreate(),
  )
}

function topicField(): HTMLTextAreaElement {
  return screen.getByLabelText('Topic') as HTMLTextAreaElement
}

function roundsField(): HTMLInputElement {
  return screen.getByLabelText('Rounds') as HTMLInputElement
}

function submitButton(): HTMLButtonElement {
  return screen.getByRole('button', { name: 'Create session' }) as HTMLButtonElement
}

/** The provider is a server-supplied prop; anthropic unless a case says otherwise. */
function renderForm(provider: ProviderName = 'anthropic') {
  return render(<NewSessionForm provider={provider} />)
}

/** Renders and waits for the on-mount council read to settle. */
async function renderLoaded(provider: ProviderName = 'anthropic') {
  renderForm(provider)
  await screen.findByLabelText('Council')
}

function modelSelect(): HTMLSelectElement {
  return screen.getByLabelText('Model') as HTMLSelectElement
}

function optionValues(select: HTMLSelectElement): string[] {
  return [...select.options].map((option) => option.value)
}

/** The free-text model control the `local` provider renders instead (A2). */
function modelInput(): HTMLInputElement {
  return screen.getByLabelText('Model') as HTMLInputElement
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('council picker', () => {
  it('is fed by GET /api/councils and defaults rounds to the council default_rounds', async () => {
    const fetchSpy = stubHappyCouncils(() => json({}, 500))
    await renderLoaded()

    expect(fetchSpy.mock.calls[0][0]).toBe('/api/councils')
    expect(screen.getByRole('option', { name: 'Decision Panel' })).toBeTruthy()
    expect(screen.getByRole('option', { name: 'Red Team' })).toBeTruthy()
    expect(roundsField().value).toBe('2')
  })

  it('resets the rounds override to the newly chosen council default', async () => {
    stubHappyCouncils(() => json({}, 500))
    await renderLoaded()

    fireEvent.change(screen.getByLabelText('Council'), { target: { value: RED_TEAM } })

    expect(roundsField().value).toBe('3')
  })

  it('bounds the rounds override to 1–5', async () => {
    stubHappyCouncils(() => json({}, 500))
    await renderLoaded()

    expect(roundsField().getAttribute('min')).toBe('1')
    expect(roundsField().getAttribute('max')).toBe('5')
  })

  it('surfaces a failed council read and refuses to offer a fabricated picker', async () => {
    stubFetch(async () => json({ error: 'DATABASE_URL is not set.' }, 500))
    renderForm()

    expect((await screen.findByRole('alert')).textContent).toBe('DATABASE_URL is not set.')
    expect(screen.queryByLabelText('Council')).toBeNull()
    expect(submitButton().disabled).toBe(true)
  })

  it('says so plainly when the library is empty instead of inventing a council', async () => {
    stubFetch(async () => json({ councils: [] }))
    renderForm()

    expect(await screen.findByText(/no councils are available/i)).toBeTruthy()
    expect(submitButton().disabled).toBe(true)
  })
})

describe('model picker (PRD Amendment A1)', () => {
  it("offers the anthropic list with 'Provider default' first", async () => {
    stubHappyCouncils(() => json({}, 500))
    await renderLoaded('anthropic')

    expect(optionValues(modelSelect())).toEqual([
      '',
      'claude-opus-5',
      'claude-sonnet-5',
      'claude-haiku-4-5-20251001',
    ])
    expect(modelSelect().options[0].textContent).toBe('Provider default')
    // Nothing is preselected but the default, so an untouched form sends no model.
    expect(modelSelect().value).toBe('')
  })

  it('offers the openai list under the openai provider', async () => {
    stubHappyCouncils(() => json({}, 500))
    await renderLoaded('openai')

    expect(optionValues(modelSelect())).toEqual(['', 'gpt-4o', 'gpt-4o-mini'])
  })

  it('is absent under the mock provider rather than shown and ignored', async () => {
    stubHappyCouncils(() => json({}, 500))
    await renderLoaded('mock')

    expect(screen.queryByLabelText('Model')).toBeNull()
  })

  it("sends no model key at all when 'Provider default' is left selected", async () => {
    const fetchSpy = stubHappyCouncils(() => json({ session: { id: SESSION_ID } }, 201))
    await renderLoaded('anthropic')

    fireEvent.change(topicField(), { target: { value: 'Should we ship on Friday?' } })
    fireEvent.click(submitButton())

    await waitFor(() => expect(push).toHaveBeenCalled())
    const body = JSON.parse(String(fetchSpy.mock.calls[1][1]?.body)) as Record<string, unknown>
    expect('model' in body).toBe(false)
  })

  it('sends the chosen model', async () => {
    const fetchSpy = stubHappyCouncils(() => json({ session: { id: SESSION_ID } }, 201))
    await renderLoaded('openai')

    fireEvent.change(topicField(), { target: { value: 'Should we ship on Friday?' } })
    fireEvent.change(modelSelect(), { target: { value: 'gpt-4o' } })
    fireEvent.click(submitButton())

    await waitFor(() => expect(push).toHaveBeenCalled())
    expect(JSON.parse(String(fetchSpy.mock.calls[1][1]?.body)).model).toBe('gpt-4o')
  })
})

describe('model picker under the local provider (PRD Amendment A2)', () => {
  it('is free text, not a closed list — installed models vary by machine', async () => {
    stubHappyCouncils(() => json({}, 500))
    const { container } = renderForm('local')
    await screen.findByLabelText('Council')

    const field = modelInput()
    expect(field.tagName).toBe('INPUT')
    expect(field.value).toBe('')
    // No curated select survives alongside it.
    expect(container.querySelector('select#model')).toBeNull()
  })

  it('suggests the common local models through a linked datalist', async () => {
    stubHappyCouncils(() => json({}, 500))
    const { container } = renderForm('local')
    await screen.findByLabelText('Council')

    const listId = modelInput().getAttribute('list')
    expect(listId).toBe('model-suggestions')
    const datalist = container.querySelector(`datalist#${listId}`)
    expect(datalist).not.toBeNull()
    expect([...datalist!.querySelectorAll('option')].map((option) => option.value)).toEqual([
      'llama3.3',
      'qwen2.5',
      'mistral',
    ])
  })

  it('sends whatever model was typed, including ids no list knows', async () => {
    const fetchSpy = stubHappyCouncils(() => json({ session: { id: SESSION_ID } }, 201))
    await renderLoaded('local')

    fireEvent.change(topicField(), { target: { value: 'Should we ship on Friday?' } })
    fireEvent.change(modelInput(), { target: { value: 'phi4' } })
    fireEvent.click(submitButton())

    await waitFor(() => expect(push).toHaveBeenCalled())
    expect(JSON.parse(String(fetchSpy.mock.calls[1][1]?.body)).model).toBe('phi4')
  })

  it('sends no model key when the field is blank or whitespace', async () => {
    const fetchSpy = stubHappyCouncils(() => json({ session: { id: SESSION_ID } }, 201))
    await renderLoaded('local')

    fireEvent.change(topicField(), { target: { value: 'Should we ship on Friday?' } })
    fireEvent.change(modelInput(), { target: { value: '   ' } })
    fireEvent.click(submitButton())

    await waitFor(() => expect(push).toHaveBeenCalled())
    const body = JSON.parse(String(fetchSpy.mock.calls[1][1]?.body)) as Record<string, unknown>
    expect('model' in body).toBe(false)
  })
})

describe('creating a session', () => {
  it('rejects an empty topic client-side and never reaches the server', async () => {
    const fetchSpy = stubHappyCouncils(() => json({ session: { id: SESSION_ID } }, 201))
    await renderLoaded()

    fireEvent.change(topicField(), { target: { value: '   ' } })
    fireEvent.click(submitButton())

    expect((await screen.findByRole('alert')).textContent).toMatch(/topic is required/i)
    // Only the on-mount council read happened: no POST was issued.
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(push).not.toHaveBeenCalled()
  })

  it('posts exactly {topic, councilId, rounds} and pushes to the chamber the server created', async () => {
    const fetchSpy = stubHappyCouncils(() => json({ session: { id: SESSION_ID } }, 201))
    await renderLoaded()

    fireEvent.change(topicField(), { target: { value: '  Should we ship on Friday?  ' } })
    fireEvent.click(submitButton())

    await waitFor(() => expect(push).toHaveBeenCalledWith(`/sessions/${SESSION_ID}`))

    const [url, init] = fetchSpy.mock.calls[1]
    expect(url).toBe('/api/sessions')
    expect(init?.method).toBe('POST')
    expect(JSON.parse(String(init?.body))).toEqual({
      topic: 'Should we ship on Friday?',
      councilId: DECISION_PANEL,
      rounds: 2,
    })
  })

  it('sends the overridden rounds when the convener changes them', async () => {
    const fetchSpy = stubHappyCouncils(() => json({ session: { id: SESSION_ID } }, 201))
    await renderLoaded()

    fireEvent.change(topicField(), { target: { value: 'Where does pricing break?' } })
    fireEvent.change(roundsField(), { target: { value: '5' } })
    fireEvent.click(submitButton())

    await waitFor(() => expect(push).toHaveBeenCalled())
    expect(JSON.parse(String(fetchSpy.mock.calls[1][1]?.body)).rounds).toBe(5)
  })

  it('refuses a rounds override outside 1–5 before posting', async () => {
    const fetchSpy = stubHappyCouncils(() => json({ session: { id: SESSION_ID } }, 201))
    await renderLoaded()

    fireEvent.change(topicField(), { target: { value: 'Should we ship on Friday?' } })
    // Cleared rather than over-large: `max=5` makes the browser (and jsdom)
    // block the submit natively, so the value that actually reaches the guard is
    // the one native validation lets through.
    fireEvent.change(roundsField(), { target: { value: '' } })
    fireEvent.click(submitButton())

    expect((await screen.findByRole('alert')).textContent).toMatch(/between 1 and 5/i)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(push).not.toHaveBeenCalled()
  })

  it('never posts a rounds override the field itself rejects', async () => {
    const fetchSpy = stubHappyCouncils(() => json({ session: { id: SESSION_ID } }, 201))
    await renderLoaded()

    fireEvent.change(topicField(), { target: { value: 'Should we ship on Friday?' } })
    fireEvent.change(roundsField(), { target: { value: '9' } })
    fireEvent.click(submitButton())

    // `max=5` stops the submit before any handler runs; only the on-mount
    // council read has been issued.
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(push).not.toHaveBeenCalled()
  })

  it('surfaces a server 400 with its zod issues and does not navigate', async () => {
    stubHappyCouncils(() =>
      json({ error: 'Invalid request body.', issues: [{ message: 'Topic is required.' }] }, 400),
    )
    await renderLoaded()

    fireEvent.change(topicField(), { target: { value: 'Should we ship on Friday?' } })
    fireEvent.click(submitButton())

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toBe('Invalid request body. Topic is required.')
    expect(push).not.toHaveBeenCalled()
  })

  it('surfaces a 422 refusal verbatim', async () => {
    const refusal = 'Council "Red Team" has 1 members; it must have between 2 and 8.'
    stubHappyCouncils(() => json({ error: refusal }, 422))
    await renderLoaded()

    fireEvent.change(topicField(), { target: { value: 'Should we ship on Friday?' } })
    fireEvent.click(submitButton())

    expect((await screen.findByRole('alert')).textContent).toBe(refusal)
    expect(push).not.toHaveBeenCalled()
  })
})
