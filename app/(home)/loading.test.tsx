// @vitest-environment jsdom
/**
 * The `/` loading state (T-032).
 *
 * A skeleton is only useful if assistive tech can find it and if it is shaped
 * like the page it stands in for, so both are asserted rather than assumed.
 */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import Loading from './loading'

afterEach(cleanup)

describe('sessions loading state', () => {
  it('exposes a labelled busy region', () => {
    render(<Loading />)

    expect(screen.getByRole('status', { name: /loading sessions/i })).toBeTruthy()
    expect(screen.getByTestId('sessions-skeleton')).toBeTruthy()
  })

  it('renders the placeholder bars for the title, the form, and the list', () => {
    const { container } = render(<Loading />)

    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThanOrEqual(3)
  })
})
