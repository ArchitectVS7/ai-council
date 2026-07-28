// @vitest-environment jsdom
/**
 * The sessions list on `/` (T-014).
 *
 * The fixture is the shape `app/page.tsx` hands down, so nothing here needs a
 * database or a network.
 */
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import type { SessionListRow } from '@/lib/home/types'

import SessionList from './session-list'

const FIRST_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301'
const SECOND_ID = '9c858901-8a57-4791-81fe-4c455b099bc9'

const SESSIONS: SessionListRow[] = [
  {
    id: FIRST_ID,
    topic: 'Should we ship on Friday?',
    councilName: 'Decision Panel',
    status: 'active',
    updatedAt: '2026-07-28T14:03:07.000Z',
  },
  {
    id: SECOND_ID,
    topic: 'Where does the pricing model break?',
    councilName: 'Red Team',
    status: 'completed',
    updatedAt: '2026-07-27T09:15:00.000Z',
  },
]

afterEach(cleanup)

describe('sessions list', () => {
  it('renders topic, council name, status, and last activity for every row', () => {
    render(<SessionList sessions={SESSIONS} />)

    expect(within(screen.getByRole('list', { name: 'Sessions' })).getAllByRole('listitem')).toHaveLength(2)

    const first = within(screen.getByTestId(`session-${FIRST_ID}`))
    expect(first.getByText('Should we ship on Friday?')).toBeTruthy()
    expect(first.getByText('Decision Panel')).toBeTruthy()
    expect(first.getByText('active')).toBeTruthy()
    expect(first.getByText('2026-07-28 14:03 UTC')).toBeTruthy()

    const second = within(screen.getByTestId(`session-${SECOND_ID}`))
    expect(second.getByText('Where does the pricing model break?')).toBeTruthy()
    expect(second.getByText('Red Team')).toBeTruthy()
    expect(second.getByText('completed')).toBeTruthy()
    expect(second.getByText('2026-07-27 09:15 UTC')).toBeTruthy()
  })

  it('links each topic to its chamber', () => {
    render(<SessionList sessions={SESSIONS} />)

    expect(screen.getByRole('link', { name: 'Should we ship on Friday?' }).getAttribute('href')).toBe(
      `/sessions/${FIRST_ID}`,
    )
    expect(
      screen.getByRole('link', { name: 'Where does the pricing model break?' }).getAttribute('href'),
    ).toBe(`/sessions/${SECOND_ID}`)
  })

  it('renders the timestamp in UTC, not the runner locale', () => {
    // A locale-dependent rendering would differ between the server pass and the
    // browser pass and show up as a hydration error on the home page.
    render(<SessionList sessions={[SESSIONS[0]]} />)

    const time = screen.getByText('2026-07-28 14:03 UTC')
    expect(time.tagName).toBe('TIME')
    expect(time.getAttribute('datetime')).toBe('2026-07-28T14:03:07.000Z')
  })

  it('says so plainly when there are no sessions, rather than inventing rows', () => {
    render(<SessionList sessions={[]} />)

    expect(screen.queryAllByRole('listitem')).toHaveLength(0)
    expect(screen.getByText(/no sessions yet/i)).toBeTruthy()
  })
})
