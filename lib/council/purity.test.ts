import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { ROUND_INSTRUCTIONS } from './prompt'

const DIR = fileURLToPath(new URL('.', import.meta.url))

const SOURCE_FILES = readdirSync(DIR)
  .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
  .sort()

function read(file: string): string {
  return readFileSync(join(DIR, file), 'utf8')
}

/** Every module specifier this directory imports from, as written in source. */
function importSpecifiers(source: string): string[] {
  const specifiers: string[] = []
  const patterns = [
    /\bfrom\s+['"]([^'"]+)['"]/g,
    /\bimport\s+['"]([^'"]+)['"]/g,
    /\brequire\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g,
  ]
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) specifiers.push(match[1])
  }
  return specifiers
}

function countOccurrences(haystack: string, needle: RegExp): number {
  return haystack.match(needle)?.length ?? 0
}

describe('lib/council purity', () => {
  it('scans every non-test module in the directory', () => {
    expect(SOURCE_FILES).toEqual([
      'prompt.ts',
      'scheduler.ts',
      'snapshot.ts',
      'transcript.ts',
      'types.ts',
    ])
  })

  it('imports neither lib/db nor lib/llm nor any other outside module', () => {
    for (const file of SOURCE_FILES) {
      const specifiers = importSpecifiers(read(file))
      for (const specifier of specifiers) {
        expect(
          specifier,
          `${file} imports "${specifier}"; lib/council must stay pure`,
        ).toMatch(/^\.\/[a-z-]+$/)
      }
      expect(specifiers.join(' ')).not.toMatch(
        /lib\/db|lib\/llm|drizzle|@neondatabase|server-only|^next|\/next/,
      )
    }
  })

  it('uses no banned glossary noun (PRD §3)', () => {
    // `debate` is exempt below: PRD §5.2's round instructions are reproduced
    // verbatim as prompt copy addressed to the model, not as an entity noun.
    const banned = /\b(workflows?|flows?|templates?|discussions?|agents?|panelists?)\b/i
    for (const file of SOURCE_FILES) {
      expect(read(file), `${file} uses a banned glossary noun`).not.toMatch(banned)
    }
  })

  it('confines the exempt word to the verbatim round-instruction copy', () => {
    const pattern = /\bdebates?\b/gi
    const inInstructions = countOccurrences(Object.values(ROUND_INSTRUCTIONS).join('\n'), pattern)
    expect(inInstructions).toBeGreaterThan(0)

    for (const file of SOURCE_FILES) {
      const expected = file === 'prompt.ts' ? inInstructions : 0
      expect(countOccurrences(read(file), pattern), `${file}`).toBe(expected)
    }
  })
})
