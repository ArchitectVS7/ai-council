// @vitest-environment jsdom
/**
 * The shared application header (T-032, convener finding at the T-024 gate).
 *
 * Two things are asserted here: what the header renders (wordmark, hrefs,
 * current-page marking on every route it has to cover), and that it is rendered
 * by the root layout alone — the part that actually fixes the finding, since a
 * header duplicated per page is exactly what went stale before.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import AppHeader from './app-header'

/** Reassigned per test; the mock reads it at render time. */
let pathname = '/'
vi.mock('next/navigation', () => ({ usePathname: () => pathname }))

const SESSION_PATH = '/sessions/3f2504e0-4f89-41d3-9a0c-0305e82c3301'

function link(name: string): HTMLAnchorElement {
  return screen.getByRole('link', { name }) as HTMLAnchorElement
}

afterEach(() => {
  cleanup()
  pathname = '/'
})

describe('app header', () => {
  it('renders the wordmark linking home and the three nav links', () => {
    render(<AppHeader />)

    // The finding, literally: there is always a way home.
    expect(link('AI Council').getAttribute('href')).toBe('/')

    const nav = screen.getByRole('navigation', { name: 'Main' })
    const hrefs = Array.from(nav.querySelectorAll('a')).map((entry) => ({
      label: entry.textContent,
      href: entry.getAttribute('href'),
    }))
    expect(hrefs).toEqual([
      { label: 'Sessions', href: '/' },
      { label: 'Personas', href: '/personas' },
      { label: 'Councils', href: '/councils' },
    ])
  })

  const cases: Array<[string, string]> = [
    ['/', 'Sessions'],
    // A session is a session: Sessions stays marked inside the chamber.
    [SESSION_PATH, 'Sessions'],
    ['/personas', 'Personas'],
    ['/councils', 'Councils'],
  ]

  for (const [path, expected] of cases) {
    it(`marks ${expected} as the current page on ${path}`, () => {
      pathname = path
      render(<AppHeader />)

      const nav = screen.getByRole('navigation', { name: 'Main' })
      const marked = Array.from(nav.querySelectorAll('a'))
        .filter((entry) => entry.getAttribute('aria-current') === 'page')
        .map((entry) => entry.textContent)
      expect(marked).toEqual([expected])
    })
  }

  it('marks nothing when the pathname matches no entry', () => {
    pathname = '/somewhere-else'
    render(<AppHeader />)

    const nav = screen.getByRole('navigation', { name: 'Main' })
    expect(nav.querySelectorAll('[aria-current="page"]')).toHaveLength(0)
  })
})

/**
 * The layout wraps all four routes by construction, so "rendered by the layout
 * and by nothing else" is the whole acceptance claim: one header everywhere,
 * and no page keeping its own link row alongside it.
 */
describe('app header ownership of navigation', () => {
  function source(relative: string): string {
    return readFileSync(fileURLToPath(new URL(relative, import.meta.url)), 'utf8')
  }

  it('is imported and rendered by the root layout', () => {
    const layout = source('../app/layout.tsx')

    expect(layout.includes("from '@/components/app-header'")).toBe(true)
    expect(layout.includes('<AppHeader />')).toBe(true)
  })

  const pages = [
    '../app/(home)/page.tsx',
    '../app/personas/page.tsx',
    '../app/councils/page.tsx',
    '../app/sessions/[id]/page.tsx',
  ]

  for (const page of pages) {
    it(`does not compete with a link row in ${page.replace('../', '')}`, () => {
      // `<header>` is deliberately not asserted against: the chamber's topic
      // banner is a header of its own and has nothing to do with navigation.
      expect(source(page).includes('<nav')).toBe(false)
    })
  }
})
