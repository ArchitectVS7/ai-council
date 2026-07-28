/**
 * Drizzle schema — the five tables of PRD §7 (`design-docs/02-PRD-Rebuild.md`).
 *
 * This file is normative-by-copy: it must match PRD §7 exactly. Adding a table
 * requires amending the PRD first (R1). `lib/db/schema.test.ts` guards the drift.
 */
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'

/** One member of a council as frozen into `sessions.council_snapshot`. */
export type CouncilSnapshotMember = {
  name: string
  role: string
  charter: string
  color: string
}

/**
 * The immutable copy of a council taken when a session is created. Sessions
 * render exclusively from this; `sessions.council_id` is provenance only and is
 * never joined for rendering (PRD §7).
 */
export type CouncilSnapshot = {
  name: string
  rounds: number
  members: CouncilSnapshotMember[]
}

export const sessionStatus = pgEnum('session_status', ['active', 'completed', 'abandoned'])
export const turnKind = pgEnum('turn_kind', ['persona', 'interjection', 'synthesis'])
export const turnStatus = pgEnum('turn_status', ['complete', 'failed'])

export const personas = pgTable('personas', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  role: text('role').notNull(),
  charter: text('charter').notNull(),
  color: text('color').notNull(),
  archived: boolean('archived').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const councils = pgTable('councils', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  defaultRounds: integer('default_rounds').notNull().default(2),
  archived: boolean('archived').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const councilMembers = pgTable(
  'council_members',
  {
    councilId: uuid('council_id')
      .notNull()
      .references(() => councils.id, { onDelete: 'cascade' }),
    personaId: uuid('persona_id')
      .notNull()
      .references(() => personas.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
  },
  (t) => [primaryKey({ columns: [t.councilId, t.position] })],
)

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  topic: text('topic').notNull(),
  /** Provenance pointer only — nullable, never joined for rendering (PRD §7). */
  councilId: uuid('council_id').references(() => councils.id, { onDelete: 'set null' }),
  councilSnapshot: jsonb('council_snapshot').$type<CouncilSnapshot>().notNull(),
  status: sessionStatus('status').notNull().default('active'),
  /** Server-authoritative position in the speaking order. */
  turnCursor: integer('turn_cursor').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
})

export const turns = pgTable(
  'turns',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    /** Transcript order, unique per session. */
    seq: integer('seq').notNull(),
    kind: turnKind('kind').notNull(),
    /** Copied from the snapshot; null for an interjection. */
    speakerName: text('speaker_name'),
    round: integer('round').notNull(),
    content: text('content').notNull(),
    status: turnStatus('status').notNull(),
    error: text('error'),
    model: text('model'),
    promptTokens: integer('prompt_tokens'),
    completionTokens: integer('completion_tokens'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('turns_session_id_seq_unique').on(t.sessionId, t.seq)],
)
