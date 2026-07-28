/**
 * Architectural guard for T-011: route handlers reach the database only through
 * `lib/db/repo.ts`, and the session read paths never join `councils` (PRD §7
 * snapshot rule). Both are static properties of the source, so they are checked
 * by reading it — no database required, which keeps the gate DB-free.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const REPO_FILE = fileURLToPath(new URL('./repo.ts', import.meta.url))
const API_DIR = fileURLToPath(new URL('../../app/api', import.meta.url))

function findRouteFiles(dir: string): string[] {
  const found: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) found.push(...findRouteFiles(path))
    else if (entry.name === 'route.ts' || entry.name === 'route.tsx') found.push(path)
  }
  return found
}

const ROUTE_FILES = findRouteFiles(API_DIR).sort()

function posixRelative(path: string): string {
  return relative(API_DIR, path).split(sep).join('/')
}

/** Every module specifier a file imports from, as written in source. */
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

/** The source of one top-level `export ... function <name>` declaration. */
function functionBody(source: string, name: string): string {
  const start = source.indexOf(`export async function ${name}`)
  expect(start, `repo.ts has no exported function "${name}"`).toBeGreaterThanOrEqual(0)
  const rest = source.slice(start + 1)
  const end = rest.indexOf('\nexport ')
  return end === -1 ? rest : rest.slice(0, end)
}

const REPO_SOURCE = readFileSync(REPO_FILE, 'utf8')

describe('route handlers reach the database only through lib/db/repo.ts', () => {
  it('scans every route file under app/api', () => {
    expect(ROUTE_FILES.map(posixRelative)).toEqual([
      'councils/route.ts',
      'personas/[id]/route.ts',
      'personas/route.ts',
      'sessions/[id]/advance/route.ts',
      'sessions/[id]/interject/route.ts',
      'sessions/[id]/regenerate-last/route.ts',
      'sessions/[id]/reopen/route.ts',
      'sessions/[id]/retry-last/route.ts',
      'sessions/[id]/route.ts',
      'sessions/[id]/synthesize/route.ts',
      'sessions/route.ts',
    ])
  })

  it('imports no database machinery directly', () => {
    // `@/lib/db/repo` is the single permitted door; `@/lib/db` (the drizzle
    // handle), `@/lib/db/schema`, drizzle itself, and the driver are all closed.
    const forbidden = /^(drizzle-orm|@neondatabase)|(^|\/)lib\/db($|\/(?!repo$))/

    for (const file of ROUTE_FILES) {
      for (const specifier of importSpecifiers(readFileSync(file, 'utf8'))) {
        expect(
          specifier,
          `${posixRelative(file)} imports "${specifier}"; route handlers may only use @/lib/db/repo`,
        ).not.toMatch(forbidden)
      }
    }
  })

  it('imports only the repo, the session services, the pure snapshot builder, and the request/response helpers', () => {
    // `@/lib/llm` and `@/lib/db/*` are deliberately absent: a generating route
    // reaches the provider and the database only through `@/lib/session/turns`,
    // and the GET route learns the provider name only through the server-only
    // `@/lib/session/view`, which assembles its payload (T-013).
    // `@/lib/personas/types` is the client-safe wire shape plus its pure
    // projection (T-022) — no database and no HTTP knowledge.
    const allowed = new Set([
      '@/lib/api/http',
      '@/lib/api/schemas',
      '@/lib/council/snapshot',
      '@/lib/db/repo',
      '@/lib/personas/types',
      '@/lib/session/turns',
      '@/lib/session/view',
    ])
    for (const file of ROUTE_FILES) {
      for (const specifier of importSpecifiers(readFileSync(file, 'utf8'))) {
        expect(allowed.has(specifier), `${posixRelative(file)} imports "${specifier}"`).toBe(true)
      }
    }
  })

  it('no session route names the councils table (PRD §7 snapshot rule)', () => {
    // Scoped to the session routes on purpose. `councils/route.ts` is the
    // council-*library* read behind the picker on `/`; it touches no session
    // row, so naming the table there cannot leak a live council into a
    // transcript. Every route that renders or mutates a session is checked.
    const sessionRoutes = ROUTE_FILES.filter((file) => posixRelative(file).startsWith('sessions/'))
    expect(sessionRoutes.length).toBeGreaterThan(0)

    for (const file of sessionRoutes) {
      expect(readFileSync(file, 'utf8'), posixRelative(file)).not.toMatch(/\bcouncils\b/)
    }
  })
})

describe('lib/db/repo.ts', () => {
  it('stays HTTP-agnostic — no Response construction, no status codes', () => {
    expect(REPO_SOURCE).not.toMatch(/\bNextResponse\b/)
    expect(REPO_SOURCE).not.toMatch(/\bResponse\.json\b/)
    expect(REPO_SOURCE).not.toMatch(/next\/server/)
  })

  it.each(['listSessions', 'findSessionWithTurns'])(
    '%s renders from council_snapshot and never joins councils (PRD §7)',
    (name) => {
      const body = functionBody(REPO_SOURCE, name)
      expect(body).not.toMatch(/\bcouncils\b/)
      expect(body).not.toMatch(/\binnerJoin\b|\bleftJoin\b/)
    },
  )

  it('only the council-library reads name the councils table; session reads never do', () => {
    expect(functionBody(REPO_SOURCE, 'findCouncilWithMembers')).toMatch(/\bcouncils\b/)
    expect(functionBody(REPO_SOURCE, 'listCouncils')).toMatch(/\bcouncils\b/)
    // Every exported function in the module, so the guard cannot be outgrown.
    const namers = [
      'listSessions',
      'findSessionWithTurns',
      'insertSession',
      'findCouncilWithMembers',
      'listCouncils',
      'insertTurn',
      'updateTurnInPlace',
      'bumpTurnCursor',
      'touchSession',
      'reopenSession',
      'markSessionCompleted',
      'listPersonas',
      'findPersona',
      'insertPersona',
      'updatePersona',
      'archivePersona',
      'deletePersona',
      'countPersonaReferences',
    ].filter((name) => /\bcouncils\b/.test(functionBody(REPO_SOURCE, name)))
    // `findCouncilWithMembers` feeds snapshot *creation*; `listCouncils` feeds
    // the picker for a session that does not exist yet. Neither reads a session.
    expect(namers).toEqual(['findCouncilWithMembers', 'listCouncils'])
    for (const name of namers) {
      expect(functionBody(REPO_SOURCE, name)).not.toMatch(/\bsessions\b/)
    }
    // The council library is a flat read — no join to members or personas.
    expect(functionBody(REPO_SOURCE, 'listCouncils')).not.toMatch(/\binnerJoin\b|\bleftJoin\b/)
  })

  it('covers every exported function of the module', () => {
    const exported = [...REPO_SOURCE.matchAll(/^export async function (\w+)/gm)].map((m) => m[1])
    expect(exported.sort()).toEqual([
      'archivePersona',
      'bumpTurnCursor',
      'countPersonaReferences',
      'deletePersona',
      'findCouncilWithMembers',
      'findPersona',
      'findSessionWithTurns',
      'insertPersona',
      'insertSession',
      'insertTurn',
      'listCouncils',
      'listPersonas',
      'listSessions',
      'markSessionCompleted',
      'reopenSession',
      'touchSession',
      'updatePersona',
      'updateTurnInPlace',
    ])
  })

  it('stores council_id as provenance on insert without reading it back for rendering', () => {
    const body = functionBody(REPO_SOURCE, 'insertSession')
    expect(body).toMatch(/councilId: input\.councilId/)
    expect(body).toMatch(/councilSnapshot: input\.snapshot/)
  })
})
