import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * The documentation contract (PRD R7 — docs follow code, T-033).
 *
 * T-033's acceptance criteria were a grep: every command in the README must
 * exist in `package.json`, every route it lists must exist under `app/`, and
 * neither guide may carry a banned glossary word or a v1 path. A grep run once
 * proves only that the docs were true the day they were written. Keeping it
 * executable means the next drift fails the gate instead of passing silently.
 *
 * Scope is deliberately the two Markdown guides a reader is told to trust —
 * `README.md` and `CLAUDE.md`. `design-docs/` is not scanned: those are
 * specifications and historical v1 records, and the PRD is where the banned
 * vocabulary is legitimately named.
 */
const ROOT = new URL('./', import.meta.url)

const DOCS = ['README.md', 'CLAUDE.md'] as const

const sources = DOCS.map((name) => ({
  name,
  text: readFileSync(fileURLToPath(new URL(name, ROOT)), 'utf8'),
}))

const scripts = (
  JSON.parse(readFileSync(fileURLToPath(new URL('package.json', ROOT)), 'utf8')) as {
    scripts: Record<string, string>
  }
).scripts

/** npm subcommands a doc may name that are not package scripts. */
const NPM_BUILTINS = new Set(['install', 'ci'])

/**
 * Every route the app actually serves, derived from the filesystem rather than
 * from a list someone has to remember to update. A directory containing a
 * `page.tsx` or a `route.ts` is a route; `(group)` segments are organisational
 * and contribute no URL segment.
 */
function collectRoutes(dir: URL, segments: string[], found: Set<string>): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const next = entry.name.startsWith('(') && entry.name.endsWith(')') ? segments : [...segments, entry.name]
      collectRoutes(new URL(`${entry.name}/`, dir), next, found)
    } else if (entry.name === 'page.tsx' || entry.name === 'route.ts') {
      found.add(`/${segments.join('/')}`)
    }
  }
}

const actualRoutes = new Set<string>()
collectRoutes(new URL('app/', ROOT), [], actualRoutes)

/** `[id]` and `:id` are the same route; a trailing slash is not a distinction. */
function normalizeRoute(route: string): string {
  const wildcarded = route.replace(/\[[^\]]+\]/g, '*').replace(/:[a-zA-Z0-9_]+/g, '*')
  return wildcarded.length > 1 ? wildcarded.replace(/\/+$/, '') : wildcarded
}

const normalizedActual = new Set([...actualRoutes].map(normalizeRoute))

describe('docs: npm commands', () => {
  it('names only commands that exist', () => {
    const offenders: string[] = []

    for (const { name, text } of sources) {
      for (const match of text.matchAll(/\bnpm(\s+run)?\s+([a-z][a-z0-9:-]*)/g)) {
        const isRun = Boolean(match[1])
        const command = match[2]
        if (!isRun && NPM_BUILTINS.has(command)) continue
        if (!(command in scripts)) {
          offenders.push(`${name}: npm ${isRun ? 'run ' : ''}${command}`)
        }
      }
    }

    expect(offenders).toEqual([])
  })

  it('reads the scripts it is checking against', () => {
    expect(Object.keys(scripts).length).toBeGreaterThan(0)
    expect(scripts).toHaveProperty('check')
  })
})

describe('docs: routes', () => {
  it('derives a non-empty route set from app/', () => {
    // Guards the check below from passing vacuously on a broken walk.
    expect(actualRoutes.size).toBeGreaterThan(0)
    expect(actualRoutes.has('/')).toBe(true)
  })

  it('lists only routes that exist under app/', () => {
    const offenders: string[] = []

    for (const { name, text } of sources) {
      for (const match of text.matchAll(/(^|[\s`|(])(\/(?!\/)[a-z0-9[\]:_\-/]*)/gm)) {
        const candidate = match[2]
        // File paths and URLs are excluded by construction: both contain a dot.
        if (candidate.includes('.')) continue
        if (!normalizedActual.has(normalizeRoute(candidate))) {
          offenders.push(`${name}: ${candidate}`)
        }
      }
    }

    expect(offenders).toEqual([])
  })
})

/**
 * Both guides describe the root-level tests, and that description is itself a
 * fact about the repo that drifts: adding this file made "Two live at the repo
 * root" false the moment it was written. Deriving the set from the filesystem
 * means the next root test fails the gate until both guides name it.
 */
const rootTests = readdirSync(fileURLToPath(ROOT), { withFileTypes: true })
  .filter((entry) => entry.isFile() && /\.test\.tsx?$/.test(entry.name))
  .map((entry) => entry.name)
  .sort()

const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']

describe('docs: root tests', () => {
  it('finds the root tests it is checking against', () => {
    expect(rootTests).toContain('docs.test.ts')
    expect(rootTests.length).toBeGreaterThan(1)
  })

  it('names every root test in both guides', () => {
    const offenders: string[] = []

    for (const { name, text } of sources) {
      for (const test of rootTests) {
        if (!text.includes(test)) offenders.push(`${name}: does not name ${test}`)
      }
    }

    expect(offenders).toEqual([])
  })

  it('states the right number of root tests in both guides', () => {
    const expected = NUMBER_WORDS[rootTests.length]
    const offenders: string[] = []

    for (const { name, text } of sources) {
      // The count word in the sentence that talks about the repo root.
      const stated = text.match(/\b([a-z]+)\b(?=[^.]*\bat the repo\s+root\b)/i)
      if (!stated) {
        offenders.push(`${name}: says nothing about tests at the repo root`)
      } else if (stated[1].toLowerCase() !== expected) {
        offenders.push(`${name}: says "${stated[1]}", but ${rootTests.length} tests live at the repo root`)
      }
    }

    expect(offenders).toEqual([])
  })
})

/**
 * The ban is on vocabulary, not on the names of real files. `ci-workflow.test.ts`
 * is a file in this repo — a guide that names it is being accurate, and GitHub,
 * not this project, chose the word `.github/workflows`. So a backticked token
 * that resolves to a path on disk is exempt; prose is not, and a made-up path
 * does not exist and stays caught.
 */
function maskRealPaths(line: string): string {
  return line.replace(/`([^`]+)`/g, (whole, inner: string) => {
    const candidate = inner.trim()
    if (!/^[\w@][\w./-]*$/.test(candidate)) return whole
    return existsSync(fileURLToPath(new URL(candidate, ROOT))) ? ' '.repeat(whole.length) : whole
  })
}

describe('docs: vocabulary', () => {
  it('exempts real paths but not prose', () => {
    // Guards the check below from being blanked out by an over-broad mask.
    expect(maskRealPaths('the `ci-workflow.test.ts` file').includes('workflow')).toBe(false)
    expect(maskRealPaths('the ci-workflow.test.ts file')).toBe('the ci-workflow.test.ts file')
    expect(maskRealPaths('a `workflow.test.ts` file')).toBe('a `workflow.test.ts` file')
  })

  it('uses no banned glossary word', () => {
    const banned = /\b(flows?|workflows?|templates?|debates?|discussions?|agents?)\b/gi
    const offenders: string[] = []

    for (const { name, text } of sources) {
      text.split(/\r?\n/).forEach((line, index) => {
        for (const match of maskRealPaths(line).matchAll(banned)) {
          offenders.push(`${name}:${index + 1}: ${match[0]}`)
        }
      })
    }

    expect(offenders).toEqual([])
  })

  it('carries no v1 path or v1 tooling reference', () => {
    const v1: Array<[string, RegExp]> = [
      ['pnpm', /\bpnpm\b/i],
      ['workflow-templates route', /workflow-templates/i],
      ['v1 schema path', /(?<!lib\/)\bdb\/schema\.ts/],
      ['vercel/examples repository', /vercel\/examples/i],
      ['v1 completion proxy', /app\/api\/complete/i],
      ['v1 state machine', /stateMachine/i],
      ['v1 arena component', /debate-arena/i],
      ['v1 starter route', /\/starter\b/i],
    ]
    const offenders: string[] = []

    for (const { name, text } of sources) {
      for (const [label, pattern] of v1) {
        if (pattern.test(text)) offenders.push(`${name}: ${label}`)
      }
    }

    expect(offenders).toEqual([])
  })
})
