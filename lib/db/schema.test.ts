import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { getTableColumns, getTableName, is } from 'drizzle-orm'
import { PgTable } from 'drizzle-orm/pg-core'
import { describe, expect, it } from 'vitest'

import * as schema from './schema'

/**
 * PRD §7 (`design-docs/02-PRD-Rebuild.md`) transcribed literally. If a change to
 * `schema.ts` breaks this test, the PRD must be amended first (R1) — do not edit
 * this map to match the code.
 */
const PRD_TABLES: Record<string, string[]> = {
  personas: ['id', 'name', 'role', 'charter', 'color', 'archived', 'created_at', 'updated_at'],
  councils: [
    'id',
    'name',
    'description',
    'default_rounds',
    'archived',
    'created_at',
    'updated_at',
  ],
  council_members: ['council_id', 'persona_id', 'position'],
  sessions: [
    'id',
    'topic',
    'council_id',
    // Amendment A1: per-session model override, null = the env default.
    'model',
    'council_snapshot',
    'status',
    'turn_cursor',
    'created_at',
    'updated_at',
    'completed_at',
  ],
  turns: [
    'id',
    'session_id',
    'seq',
    'kind',
    'speaker_name',
    'round',
    'content',
    'status',
    'error',
    'model',
    'prompt_tokens',
    'completion_tokens',
    'created_at',
  ],
}

const exportedTables = (Object.values(schema) as unknown[]).filter((value): value is PgTable =>
  is(value, PgTable),
)

describe('schema tables', () => {
  it('defines exactly the five tables of PRD §7 and no others', () => {
    expect(exportedTables.map(getTableName).sort()).toEqual(Object.keys(PRD_TABLES).sort())
  })

  it.each(Object.entries(PRD_TABLES))('%s has exactly the PRD §7 columns', (name, columns) => {
    const table = exportedTables.find((t) => getTableName(t) === name)
    expect(table, `table ${name} is not exported from schema.ts`).toBeDefined()
    const actual = Object.values(getTableColumns(table!)).map((c) => c.name)
    expect(actual.slice().sort()).toEqual(columns.slice().sort())
  })
})

describe('schema enums', () => {
  it('session_status is active|completed|abandoned', () => {
    expect(schema.sessionStatus.enumName).toBe('session_status')
    expect(schema.sessionStatus.enumValues).toEqual(['active', 'completed', 'abandoned'])
  })

  it('turn_kind is persona|interjection|synthesis', () => {
    expect(schema.turnKind.enumName).toBe('turn_kind')
    expect(schema.turnKind.enumValues).toEqual(['persona', 'interjection', 'synthesis'])
  })

  it('turn_status is complete|failed', () => {
    expect(schema.turnStatus.enumName).toBe('turn_status')
    expect(schema.turnStatus.enumValues).toEqual(['complete', 'failed'])
  })
})

describe('nullability and defaults the PRD calls out', () => {
  it('council_snapshot is NOT NULL — sessions always render from the snapshot', () => {
    expect(schema.sessions.councilSnapshot.notNull).toBe(true)
  })

  it('turn_cursor is NOT NULL default 0 — server-authoritative position', () => {
    expect(schema.sessions.turnCursor.notNull).toBe(true)
    expect(schema.sessions.turnCursor.default).toBe(0)
  })

  it('council_id is nullable — provenance only', () => {
    expect(schema.sessions.councilId.notNull).toBe(false)
  })

  it('completed_at is nullable', () => {
    expect(schema.sessions.completedAt.notNull).toBe(false)
  })

  it('sessions.model is nullable — null means the env default (Amendment A1)', () => {
    expect(schema.sessions.model.notNull).toBe(false)
    expect(schema.sessions.model.hasDefault).toBe(false)
  })

  it('turns.speaker_name is nullable (null for interjections) and error is nullable', () => {
    expect(schema.turns.speakerName.notNull).toBe(false)
    expect(schema.turns.error.notNull).toBe(false)
  })
})

describe('generated migration SQL', () => {
  const dir = join(process.cwd(), 'drizzle')
  const files = readdirSync(dir).filter((f) => f.endsWith('.sql'))
  // Collapse whitespace so assertions are not brittle about drizzle-kit formatting.
  const sql = files.map((f) => readFileSync(join(dir, f), 'utf8')).join('\n').replace(/\s+/g, ' ')

  it('has at least one committed migration', () => {
    expect(files.length).toBeGreaterThan(0)
  })

  it.each(Object.keys(PRD_TABLES))('creates table %s', (name) => {
    expect(sql).toContain(`CREATE TABLE "${name}"`)
  })

  it.each(['session_status', 'turn_kind', 'turn_status'])('creates enum type %s', (name) => {
    expect(sql).toContain(`CREATE TYPE "public"."${name}" AS ENUM`)
  })

  it('constrains UNIQUE(session_id, seq)', () => {
    expect(sql).toContain('UNIQUE("session_id","seq")')
  })

  it('uses a composite primary key of (council_id, position) on council_members', () => {
    expect(sql).toContain('PRIMARY KEY("council_id","position")')
  })

  it('creates no tables beyond PRD §7', () => {
    const created = [...sql.matchAll(/CREATE TABLE "([^"]+)"/g)].map((m) => m[1])
    expect(created.sort()).toEqual(Object.keys(PRD_TABLES).sort())
  })

  it('adds sessions.model as a nullable column (Amendment A1)', () => {
    expect(sql).toContain('ALTER TABLE "sessions" ADD COLUMN "model" text')
    // Nullable: no NOT NULL, and no default that would rewrite existing rows.
    expect(sql).not.toMatch(/ADD COLUMN "model" text[^;]*NOT NULL/)
  })

  it('alters no table other than sessions — a column, not a schema change', () => {
    const altered = [...sql.matchAll(/ALTER TABLE "([^"]+)"/g)].map((m) => m[1])
    // `0000` constrains the five tables it creates; only A1 alters anything, and
    // only `sessions`. Anything else here is drift from PRD §7.
    const outsideCreate = [...sql.matchAll(/ALTER TABLE "([^"]+)" ADD (?!CONSTRAINT)/g)].map(
      (m) => m[1],
    )
    expect(new Set(outsideCreate)).toEqual(new Set(['sessions']))
    expect(altered.every((name) => name in PRD_TABLES)).toBe(true)
  })
})
