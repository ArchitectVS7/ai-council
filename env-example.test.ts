import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * The environment contract (CLAUDE.md, PRD Amendment A2).
 *
 * `.env.example` is the only list of what this app reads, so it is checked here
 * rather than trusted: exactly six variables, no more — a seventh needs a PRD
 * amendment, and this test is what makes that rule bite.
 */
const ENV_PATH = fileURLToPath(new URL('./.env.example', import.meta.url))

const EXPECTED = [
  'ANTHROPIC_API_KEY',
  'DATABASE_URL',
  'LLM_BASE_URL',
  'LLM_MODEL',
  'LLM_PROVIDER',
  'OPENAI_API_KEY',
]

const source = readFileSync(ENV_PATH, 'utf8')

/** Every `KEY=` assignment, comments and blank lines ignored. */
const keys = source
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line.length > 0 && !line.startsWith('#'))
  .map((line) => line.slice(0, line.indexOf('=')))

describe('.env.example', () => {
  it('lists exactly the six variables the app reads', () => {
    expect([...keys].sort()).toEqual(EXPECTED)
    expect(keys).toHaveLength(6)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('documents the provider values, local included', () => {
    expect(source).toMatch(/#.*\blocal\b/)
    expect(source).toMatch(/LLM_PROVIDER=/)
  })

  it('documents the local base URL default and that it needs no key', () => {
    expect(source).toMatch(/http:\/\/localhost:11434\/v1/)
    expect(source).toMatch(/#.*LLM_PROVIDER=local/)
    expect(source).toMatch(/no key is sent/)
  })

  it('carries no key material of its own', () => {
    expect(source).not.toMatch(/=\s*sk-/)
    expect(source).toMatch(/^ANTHROPIC_API_KEY=$/m)
    expect(source).toMatch(/^OPENAI_API_KEY=$/m)
  })
})
