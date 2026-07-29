// @vitest-environment jsdom
/**
 * The councils list and builder on `/councils` (T-023).
 *
 * `fetch` is stubbed, so this exercises the real requests the editor makes and
 * the real list it renders afterwards without a database or a network. Every
 * assertion about what ends up on screen is an assertion about the *server's*
 * response, not about what was typed — and reordering is asserted twice: on
 * screen, and in the positions that go over the wire.
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import CouncilBuilder from './council-builder'

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
  charter: 'You want to know how anyone could tell if the claim were false.',
  color: '#dc2626',
}

const ECONOMIST = {
  id: '1b4e28ba-2fa1-11d2-883f-0016d3cca427',
  name: 'The Economist',
  role: 'Incentives and trade-offs',
  charter: 'You follow the money and the second-order effects.',
  color: '#059669',
}

const PERSONAS = [PRAGMATIST, SKEPTIC, ECONOMIST]

/** Ten personas, so the 8-seat ceiling can be reached from the library. */
const MANY = Array.from({ length: 10 }, (_, index) => ({
  id: `3f8b6c1e-8f2a-4b7d-9c31-2a1f4e9b7c${String(index).padStart(2, '0')}`,
  name: `Persona ${index}`,
  role: 'Role',
  charter: 'Charter',
  color: '#2563eb',
}))

const PANEL = {
  id: '7d8e2f10-3c4b-4a5d-8e6f-9a0b1c2d3e4f',
  name: 'Decision Panel',
  description: 'General-purpose judgement.',
  // A3: null here, so the "pre-fills an empty box" path is covered too.
  directive: null,
  defaultRounds: 2,
  members: [
    { personaId: PRAGMATIST.id, position: 0, name: PRAGMATIST.name, color: PRAGMATIST.color },
    { personaId: SKEPTIC.id, position: 1, name: SKEPTIC.name, color: SKEPTIC.color },
  ],
}

const RED_TEAM = {
  id: '2c3d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e6f',
  name: 'Red Team',
  description: null,
  directive: 'Argue adversarially. Do not converge until the evidence forces it.',
  defaultRounds: 3,
  members: [
    { personaId: SKEPTIC.id, position: 0, name: SKEPTIC.name, color: SKEPTIC.color },
    { personaId: ECONOMIST.id, position: 1, name: ECONOMIST.name, color: ECONOMIST.color },
  ],
}

const SEEDED = [PANEL, RED_TEAM]

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

function field(label: string): HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
  return screen.getByLabelText(label) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
}

function click(name: string) {
  fireEvent.click(screen.getByRole('button', { name }))
}

/** The seat names of the editor's speaking order, top to bottom. */
function seatNames(): string[] {
  return Array.from(
    screen.getByRole('list', { name: 'Speaking order' }).querySelectorAll('li'),
  ).map((item) => item.querySelector('span:nth-of-type(3)')?.textContent ?? '')
}

function bodyOf(init: RequestInit | undefined): Record<string, unknown> {
  return JSON.parse(String(init?.body)) as Record<string, unknown>
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('the councils list', () => {
  it('renders the seeded councils with their speaking order and default rounds', () => {
    render(<CouncilBuilder initialCouncils={SEEDED} personas={PERSONAS} />)

    expect(screen.getByText('Decision Panel')).toBeTruthy()
    expect(screen.getByText('General-purpose judgement.')).toBeTruthy()
    expect(screen.getByTestId(`order-${PANEL.id}`).textContent).toBe(
      'The Pragmatist → The Skeptic',
    )
    expect(screen.getByTestId(`order-${RED_TEAM.id}`).textContent).toBe(
      'The Skeptic → The Economist',
    )
    expect(screen.getByText('2 default rounds · 2 personas')).toBeTruthy()
    expect(screen.getByText('3 default rounds · 2 personas')).toBeTruthy()
  })

  it('says so plainly when there are no councils instead of inventing one', () => {
    render(<CouncilBuilder initialCouncils={[]} personas={PERSONAS} />)

    expect(screen.getByText(/no councils yet/i)).toBeTruthy()
    expect(screen.queryByRole('list', { name: 'Councils' })).toBeNull()
  })
})

describe('building the speaking order', () => {
  it('adds and removes seats without touching the server', () => {
    const fetchSpy = stubFetch(async () => json({}))
    render(<CouncilBuilder initialCouncils={[]} personas={PERSONAS} />)

    click('Add')
    expect(seatNames()).toEqual(['The Pragmatist'])

    fireEvent.change(field('Add persona'), { target: { value: ECONOMIST.id } })
    click('Add')
    expect(seatNames()).toEqual(['The Pragmatist', 'The Economist'])

    fireEvent.click(screen.getByRole('button', { name: 'Remove The Pragmatist' }))
    expect(seatNames()).toEqual(['The Economist'])
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('reorders with the up and down buttons — no drag-and-drop', () => {
    render(<CouncilBuilder initialCouncils={SEEDED} personas={PERSONAS} />)

    click('Edit Decision Panel')
    expect(seatNames()).toEqual(['The Pragmatist', 'The Skeptic'])

    fireEvent.click(screen.getByRole('button', { name: 'Move The Skeptic up' }))
    expect(seatNames()).toEqual(['The Skeptic', 'The Pragmatist'])

    fireEvent.click(screen.getByRole('button', { name: 'Move The Skeptic down' }))
    expect(seatNames()).toEqual(['The Pragmatist', 'The Skeptic'])
  })

  it('disables Move up on the first seat and Move down on the last', () => {
    render(<CouncilBuilder initialCouncils={SEEDED} personas={PERSONAS} />)

    click('Edit Decision Panel')

    const firstUp = screen.getByRole('button', { name: 'Move The Pragmatist up' })
    const lastDown = screen.getByRole('button', { name: 'Move The Skeptic down' })
    expect((firstUp as HTMLButtonElement).disabled).toBe(true)
    expect((lastDown as HTMLButtonElement).disabled).toBe(true)
    expect(
      (screen.getByRole('button', { name: 'Move The Skeptic up' }) as HTMLButtonElement).disabled,
    ).toBe(false)
  })

  it('stops adding at eight personas', () => {
    render(<CouncilBuilder initialCouncils={[]} personas={MANY} />)

    for (let index = 0; index < 8; index += 1) click('Add')

    expect(seatNames()).toHaveLength(8)
    expect((screen.getByRole('button', { name: 'Add' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText(/at most 8 personas/i)).toBeTruthy()
  })

  it('blocks the save below two personas and says why', () => {
    render(<CouncilBuilder initialCouncils={[]} personas={PERSONAS} />)

    const submit = screen.getByRole('button', { name: 'Create council' }) as HTMLButtonElement
    expect(submit.disabled).toBe(true)
    expect(screen.getByText(/seat at least 2 personas before saving/i)).toBeTruthy()

    click('Add')
    expect((screen.getByRole('button', { name: 'Create council' }) as HTMLButtonElement).disabled).toBe(
      true,
    )

    fireEvent.change(field('Add persona'), { target: { value: SKEPTIC.id } })
    click('Add')
    expect((screen.getByRole('button', { name: 'Create council' }) as HTMLButtonElement).disabled).toBe(
      false,
    )
  })
})

describe('creating a council', () => {
  it('posts the fields plus contiguous positions and renders the council the server stored', async () => {
    // A different name than typed, so passing this test requires rendering the
    // response rather than the form input.
    const stored = { ...RED_TEAM, name: 'Red Team (stored)' }
    const fetchSpy = stubFetch(async () => json({ council: stored }, 201))
    render(<CouncilBuilder initialCouncils={[PANEL]} personas={PERSONAS} />)

    fireEvent.change(field('Name'), { target: { value: '  Red Team  ' } })
    fireEvent.change(field('Description'), { target: { value: '  Adversarial review.  ' } })
    fireEvent.change(field('Directive'), { target: { value: '  Argue adversarially.  ' } })
    fireEvent.change(field('Default rounds'), { target: { value: '3' } })
    fireEvent.change(field('Add persona'), { target: { value: SKEPTIC.id } })
    click('Add')
    fireEvent.change(field('Add persona'), { target: { value: ECONOMIST.id } })
    click('Add')
    click('Create council')

    await screen.findByText('Red Team (stored)')

    const [url, init] = fetchSpy.mock.calls[0]
    expect(url).toBe('/api/councils')
    expect(init?.method).toBe('POST')
    expect(bodyOf(init)).toEqual({
      name: 'Red Team',
      description: 'Adversarial review.',
      directive: 'Argue adversarially.',
      defaultRounds: 3,
      members: [
        { personaId: SKEPTIC.id, position: 0 },
        { personaId: ECONOMIST.id, position: 1 },
      ],
    })
    // The form is back in create mode.
    expect((field('Name') as HTMLInputElement).value).toBe('')
    expect((field('Directive') as HTMLTextAreaElement).value).toBe('')
  })

  it('sends a null description when the box is left blank', async () => {
    const fetchSpy = stubFetch(async () => json({ council: RED_TEAM }, 201))
    render(<CouncilBuilder initialCouncils={[]} personas={PERSONAS} />)

    fireEvent.change(field('Name'), { target: { value: 'Red Team' } })
    click('Add')
    fireEvent.change(field('Add persona'), { target: { value: SKEPTIC.id } })
    click('Add')
    click('Create council')

    await screen.findByText('Red Team')
    expect(bodyOf(fetchSpy.mock.calls[0][1]).description).toBeNull()
  })

  it('sends a null directive when the box is left blank (A3)', async () => {
    const fetchSpy = stubFetch(async () => json({ council: RED_TEAM }, 201))
    render(<CouncilBuilder initialCouncils={[]} personas={PERSONAS} />)

    fireEvent.change(field('Name'), { target: { value: 'Red Team' } })
    click('Add')
    fireEvent.change(field('Add persona'), { target: { value: SKEPTIC.id } })
    click('Add')
    click('Create council')

    await screen.findByText('Red Team')
    expect(bodyOf(fetchSpy.mock.calls[0][1]).directive).toBeNull()
  })

  it('refuses an empty name before reaching the server', async () => {
    const fetchSpy = stubFetch(async () => json({ council: RED_TEAM }, 201))
    render(<CouncilBuilder initialCouncils={[]} personas={PERSONAS} />)

    click('Add')
    fireEvent.change(field('Add persona'), { target: { value: SKEPTIC.id } })
    click('Add')
    click('Create council')

    expect((await screen.findByRole('alert')).textContent).toMatch(/name is required/i)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('refuses a default-rounds value outside 1–5 before reaching the server', async () => {
    const fetchSpy = stubFetch(async () => json({ council: RED_TEAM }, 201))
    render(<CouncilBuilder initialCouncils={[]} personas={PERSONAS} />)

    fireEvent.change(field('Name'), { target: { value: 'Red Team' } })
    // Cleared rather than over-max: the input carries min/max, so the browser
    // blocks a submit with 9 in it and the field would never reach this check.
    fireEvent.change(field('Default rounds'), { target: { value: '' } })
    click('Add')
    fireEvent.change(field('Add persona'), { target: { value: SKEPTIC.id } })
    click('Add')
    click('Create council')

    expect((await screen.findByRole('alert')).textContent).toMatch(
      /default rounds must be a whole number between 1 and 5/i,
    )
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('surfaces a server 400 with its zod issues and leaves the list untouched', async () => {
    stubFetch(async () =>
      json(
        {
          error: 'Invalid request body.',
          issues: [{ message: 'A council needs at least 2 personas.' }],
        },
        400,
      ),
    )
    render(<CouncilBuilder initialCouncils={[PANEL]} personas={PERSONAS} />)

    fireEvent.change(field('Name'), { target: { value: 'Red Team' } })
    click('Add')
    fireEvent.change(field('Add persona'), { target: { value: SKEPTIC.id } })
    click('Add')
    click('Create council')

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toBe('Invalid request body. A council needs at least 2 personas.')
    expect(screen.getByRole('list', { name: 'Councils' }).querySelectorAll('li')).toHaveLength(1)
    expect(screen.queryByText('Red Team')).toBeNull()
  })
})

describe('editing a council', () => {
  it('round-trips: the form pre-fills, PUTs the reordered seats, and shows the stored council', async () => {
    const stored = {
      ...PANEL,
      name: 'Decision Panel II',
      members: [
        { personaId: SKEPTIC.id, position: 0, name: SKEPTIC.name, color: SKEPTIC.color },
        { personaId: PRAGMATIST.id, position: 1, name: PRAGMATIST.name, color: PRAGMATIST.color },
      ],
    }
    const fetchSpy = stubFetch(async () => json({ council: stored }))
    render(<CouncilBuilder initialCouncils={SEEDED} personas={PERSONAS} />)

    click('Edit Decision Panel')

    expect((field('Name') as HTMLInputElement).value).toBe('Decision Panel')
    expect((field('Description') as HTMLTextAreaElement).value).toBe('General-purpose judgement.')
    expect((field('Default rounds') as HTMLInputElement).value).toBe('2')
    expect(seatNames()).toEqual(['The Pragmatist', 'The Skeptic'])

    fireEvent.click(screen.getByRole('button', { name: 'Move The Skeptic up' }))
    click('Save council')

    await screen.findByText('Decision Panel II')

    const [url, init] = fetchSpy.mock.calls[0]
    expect(url).toBe(`/api/councils/${PANEL.id}`)
    expect(init?.method).toBe('PUT')
    expect(bodyOf(init)).toEqual({
      name: 'Decision Panel',
      description: 'General-purpose judgement.',
      directive: null,
      defaultRounds: 2,
      members: [
        { personaId: SKEPTIC.id, position: 0 },
        { personaId: PRAGMATIST.id, position: 1 },
      ],
    })
    // Replaced in place, not appended: still two councils, in the stored order.
    expect(screen.getByRole('list', { name: 'Councils' }).querySelectorAll('li')).toHaveLength(2)
    expect(screen.getByTestId(`order-${PANEL.id}`).textContent).toBe(
      'The Skeptic → The Pragmatist',
    )
  })

  it('pre-fills a null description as an empty box', () => {
    render(<CouncilBuilder initialCouncils={SEEDED} personas={PERSONAS} />)

    click('Edit Red Team')

    expect((field('Description') as HTMLTextAreaElement).value).toBe('')
  })
})

describe('the council directive (PRD Amendment A3)', () => {
  const HELPER =
    'Fed to every member on every turn — use it to set the mode (adversarial, cooperative, hybrid-seeking). Description is display-only.'

  it('renders the Directive textarea with the helper text that distinguishes it from the description', () => {
    render(<CouncilBuilder initialCouncils={SEEDED} personas={PERSONAS} />)

    const textarea = field('Directive')
    expect(textarea.tagName).toBe('TEXTAREA')

    const help = screen.getByText(/Fed to every member on every turn/)
    expect(help.textContent).toBe(HELPER)
    // The helper is wired to the field, not merely nearby.
    expect(textarea.getAttribute('aria-describedby')).toBe(help.id)
  })

  it('pre-fills the stored directive when editing, and an empty box when there is none', () => {
    render(<CouncilBuilder initialCouncils={SEEDED} personas={PERSONAS} />)

    click('Edit Red Team')
    expect((field('Directive') as HTMLTextAreaElement).value).toBe(RED_TEAM.directive)

    click('Edit Decision Panel')
    expect((field('Directive') as HTMLTextAreaElement).value).toBe('')
  })

  it('round-trips an edited directive: PUTs it and re-renders from the server response', async () => {
    const stored = { ...PANEL, directive: 'Seek a hybrid position, not a winner.' }
    const fetchSpy = stubFetch(async () => json({ council: stored }))
    render(<CouncilBuilder initialCouncils={SEEDED} personas={PERSONAS} />)

    click('Edit Decision Panel')
    fireEvent.change(field('Directive'), {
      target: { value: '  Seek a hybrid position, not a winner.  ' },
    })
    click('Save council')

    await screen.findByRole('status')

    const [url, init] = fetchSpy.mock.calls[0]
    expect(url).toBe(`/api/councils/${PANEL.id}`)
    expect(init?.method).toBe('PUT')
    expect(bodyOf(init).directive).toBe('Seek a hybrid position, not a winner.')

    // The list now holds what the server stored; re-opening the editor shows it.
    click('Edit Decision Panel')
    expect((field('Directive') as HTMLTextAreaElement).value).toBe(stored.directive)
  })

  it('clears a directive by emptying the box, sending null rather than an empty string', async () => {
    const fetchSpy = stubFetch(async () => json({ council: { ...RED_TEAM, directive: null } }))
    render(<CouncilBuilder initialCouncils={SEEDED} personas={PERSONAS} />)

    click('Edit Red Team')
    fireEvent.change(field('Directive'), { target: { value: '   ' } })
    click('Save council')

    await screen.findByRole('status')
    expect(bodyOf(fetchSpy.mock.calls[0][1]).directive).toBeNull()
  })
})

describe('deleting a council', () => {
  it('reports that a referenced council was archived, and says old sessions are unaffected', async () => {
    const fetchSpy = stubFetch(async () => json({ archived: true }))
    render(<CouncilBuilder initialCouncils={SEEDED} personas={PERSONAS} />)

    click('Delete Red Team')

    const status = await screen.findByRole('status')
    expect(status.textContent).toMatch(/archived rather than deleted/i)
    expect(status.textContent).toMatch(/existing sessions are unaffected/i)

    expect(fetchSpy.mock.calls[0][0]).toBe(`/api/councils/${RED_TEAM.id}`)
    expect(fetchSpy.mock.calls[0][1]?.method).toBe('DELETE')
    expect(screen.queryByText('Red Team')).toBeNull()
    expect(screen.getByRole('list', { name: 'Councils' }).querySelectorAll('li')).toHaveLength(1)
  })

  it('reports a plain delete when no session referenced the council', async () => {
    stubFetch(async () => json({ archived: false }))
    render(<CouncilBuilder initialCouncils={SEEDED} personas={PERSONAS} />)

    click('Delete Red Team')

    const status = await screen.findByRole('status')
    expect(status.textContent).toBe('Red Team was deleted.')
    expect(screen.queryByText('Red Team')).toBeNull()
  })

  it('surfaces a failed delete and keeps the council', async () => {
    stubFetch(async () => json({ error: 'DATABASE_URL is not set.' }, 500))
    render(<CouncilBuilder initialCouncils={SEEDED} personas={PERSONAS} />)

    click('Delete Red Team')

    expect((await screen.findByRole('alert')).textContent).toBe('DATABASE_URL is not set.')
    await waitFor(() =>
      expect(screen.getByRole('list', { name: 'Councils' }).querySelectorAll('li')).toHaveLength(2),
    )
  })
})
