import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'

const CI_PATH = fileURLToPath(new URL('./.github/workflows/ci.yml', import.meta.url))
const PACKAGE_PATH = fileURLToPath(new URL('./package.json', import.meta.url))

/** The gate, verbatim, in order. */
const GATE_COMMANDS = ['npm ci', 'npm run check', 'npm run build']

type Step = { uses?: string; run?: string; with?: Record<string, unknown> }

const source = readFileSync(CI_PATH, 'utf8')
const doc = parse(source) as Record<string, unknown>

/**
 * YAML 1.1 parsers coerce a bare `on:` key to boolean true ("the Norway problem").
 * The `yaml` package uses the YAML 1.2 core schema, so `on` stays a string —
 * but read both spellings so a parser-version change cannot silently void this test.
 */
const triggers = (doc.on ?? (doc as Record<string, unknown>)[String(true)]) as
  | Record<string, { branches?: string[] }>
  | undefined

const jobs = doc.jobs as Record<string, { steps?: Step[] }>
const jobNames = Object.keys(jobs ?? {})
const steps = jobs?.[jobNames[0]]?.steps ?? []

describe('CI workflow', () => {
  it('is present and parses as YAML', () => {
    expect(source.length).toBeGreaterThan(0)
    expect(doc).toBeTypeOf('object')
    expect(doc).not.toBeNull()
    expect(jobNames).toHaveLength(1)
  })

  it('runs on push and pull_request to v2 and main', () => {
    expect(triggers).toBeDefined()
    expect([...(triggers?.push?.branches ?? [])].sort()).toEqual(['main', 'v2'])
    expect([...(triggers?.pull_request?.branches ?? [])].sort()).toEqual(['main', 'v2'])
  })

  it('uses Node 22', () => {
    const setupNode = steps.find((step) => step.uses?.startsWith('actions/setup-node@'))
    expect(setupNode).toBeDefined()
    expect(String(setupNode?.with?.['node-version'])).toMatch(/^22/)
  })

  it('checks out the repo before installing', () => {
    const checkoutIndex = steps.findIndex((step) => step.uses?.startsWith('actions/checkout@'))
    const installIndex = steps.findIndex((step) => step.run?.trim() === 'npm ci')
    expect(checkoutIndex).toBeGreaterThanOrEqual(0)
    expect(installIndex).toBeGreaterThan(checkoutIndex)
  })

  it('has exactly the gate commands as its run steps', () => {
    const runs = steps.filter((step) => step.run !== undefined).map((step) => step.run!.trim())
    expect(runs).toEqual(GATE_COMMANDS)
    expect(steps.every((step) => step.run === undefined || !('continue-on-error' in step))).toBe(true)
  })

  it('only invokes npm scripts that package.json defines', () => {
    const scripts = (JSON.parse(readFileSync(PACKAGE_PATH, 'utf8')) as { scripts: Record<string, string> })
      .scripts
    expect(scripts.check).toBeTruthy()
    expect(scripts.build).toBeTruthy()
  })

  it('uses no secrets and no database', () => {
    expect(source).not.toMatch(/secrets\./)
    expect(source).not.toMatch(/\bservices:/)
    expect(source).not.toMatch(/\benv:/)
    expect(source).not.toMatch(/DATABASE_URL|POSTGRES_URL|_API_KEY/)
  })
})
