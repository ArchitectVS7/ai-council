// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import Home from './page'

describe('placeholder home page', () => {
  it('renders the AI Council heading', () => {
    render(<Home />)
    expect(screen.getByRole('heading', { name: /ai council/i })).toBeTruthy()
  })
})
