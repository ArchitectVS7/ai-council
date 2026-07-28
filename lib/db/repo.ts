import 'server-only'

/**
 * The only module a route handler uses to reach the database.
 *
 * Route files import from here and never from `drizzle-orm`, `lib/db/schema`,
 * or `lib/db` directly — `lib/db/repo.test.ts` enforces that statically. Each
 * function is a thin read or write with no business logic: validation lives in
 * `lib/api/schemas.ts`, and snapshot construction in `lib/council/snapshot.ts`.
 *
 * Snapshot rule (PRD §7): the session read paths below never join `councils`.
 * A session's council name comes from `council_snapshot.name`, so renaming,
 * reordering, or archiving a council cannot alter a session that already ran.
 * `councils` is named in exactly two places, neither of which renders a session:
 * `findCouncilWithMembers`, which feeds snapshot *creation*, and `listCouncils`,
 * which reads the council library for the picker on `/`.
 */
import { asc, desc, eq, sql } from 'drizzle-orm'

import type { CouncilSnapshot } from '@/lib/council/types'
import type { SnapshotSource } from '@/lib/council/snapshot'
import { getDb } from '@/lib/db'
import { councilMembers, councils, personas, sessions, turns } from '@/lib/db/schema'

export type SessionRow = typeof sessions.$inferSelect
export type TurnRow = typeof turns.$inferSelect

/** One row of the sessions list on `/` (PRD §6: topic, council name, status, last activity). */
export type SessionListItem = {
  id: string
  topic: string
  councilName: string
  status: SessionRow['status']
  createdAt: Date
  updatedAt: Date
}

/** Most recently active first. */
export async function listSessions(): Promise<SessionListItem[]> {
  const rows = await getDb()
    .select({
      id: sessions.id,
      topic: sessions.topic,
      councilSnapshot: sessions.councilSnapshot,
      status: sessions.status,
      createdAt: sessions.createdAt,
      updatedAt: sessions.updatedAt,
    })
    .from(sessions)
    .orderBy(desc(sessions.updatedAt))

  return rows.map(({ councilSnapshot, ...row }) => ({
    ...row,
    // Snapshot rule: the name comes from the frozen copy, not from a live row.
    councilName: councilSnapshot.name,
  }))
}

/** A session plus its transcript in `seq` order, or null when the id is unknown. */
export async function findSessionWithTurns(
  sessionId: string,
): Promise<{ session: SessionRow; turns: TurnRow[] } | null> {
  const db = getDb()

  const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1)
  if (!session) return null

  const transcript = await db
    .select()
    .from(turns)
    .where(eq(turns.sessionId, sessionId))
    .orderBy(asc(turns.seq))

  return { session, turns: transcript }
}

/**
 * A council and its members joined to their personas, ordered by speaking
 * position — the raw material for `buildCouncilSnapshot`.
 */
export async function findCouncilWithMembers(councilId: string): Promise<SnapshotSource | null> {
  const db = getDb()

  const [council] = await db
    .select({ name: councils.name, defaultRounds: councils.defaultRounds })
    .from(councils)
    .where(eq(councils.id, councilId))
    .limit(1)
  if (!council) return null

  const members = await db
    .select({
      name: personas.name,
      role: personas.role,
      charter: personas.charter,
      color: personas.color,
      position: councilMembers.position,
    })
    .from(councilMembers)
    .innerJoin(personas, eq(councilMembers.personaId, personas.id))
    .where(eq(councilMembers.councilId, councilId))
    .orderBy(asc(councilMembers.position))

  return { name: council.name, defaultRounds: council.defaultRounds, members }
}

/** One option in the council picker on `/` (PRD §6). */
export type CouncilListItem = {
  id: string
  name: string
  description: string | null
  defaultRounds: number
}

/**
 * The council library, for choosing what a *new* session will snapshot.
 *
 * Archived councils are omitted: they may not start new sessions, while the
 * sessions they already started keep rendering from their own snapshots.
 * This is a library read, not a session render — no session row is touched.
 */
export async function listCouncils(): Promise<CouncilListItem[]> {
  return getDb()
    .select({
      id: councils.id,
      name: councils.name,
      description: councils.description,
      defaultRounds: councils.defaultRounds,
    })
    .from(councils)
    .where(eq(councils.archived, false))
    .orderBy(asc(councils.name))
}

/**
 * Create a session. `councilId` is stored as provenance only (nullable FK); the
 * snapshot is what the session will be rendered from for the rest of its life.
 * `status`, `turn_cursor`, and the timestamps come from the column defaults.
 */
export async function insertSession(input: {
  topic: string
  councilId: string
  snapshot: CouncilSnapshot
}): Promise<SessionRow> {
  const [session] = await getDb()
    .insert(sessions)
    .values({
      topic: input.topic,
      councilId: input.councilId,
      councilSnapshot: input.snapshot,
    })
    .returning()

  if (!session) {
    throw new Error('Session insert returned no row.')
  }
  return session
}

/** A generated or convener-authored transcript row, exactly as it is persisted. */
export type NewTurnInput = {
  sessionId: string
  seq: number
  kind: TurnRow['kind']
  /** From the snapshot; null for an interjection. */
  speakerName: string | null
  round: number
  content: string
  status: TurnRow['status']
  /** The provider's message, verbatim, when `status` is `failed` (R4). */
  error: string | null
  model: string | null
  promptTokens: number | null
  completionTokens: number | null
}

/** Append a turn. `UNIQUE(session_id, seq)` makes a duplicate slot a loud error. */
export async function insertTurn(input: NewTurnInput): Promise<TurnRow> {
  const [turn] = await getDb().insert(turns).values(input).returning()

  if (!turn) {
    throw new Error('Turn insert returned no row.')
  }
  return turn
}

/** The fields a retry or regeneration rewrites; `seq`, `kind`, and `round` never move. */
export type TurnPatch = {
  content: string
  status: TurnRow['status']
  error: string | null
  model: string | null
  promptTokens: number | null
  completionTokens: number | null
}

/** Rewrite one turn in place, keeping its id and its transcript slot. */
export async function updateTurnInPlace(turnId: string, patch: TurnPatch): Promise<TurnRow> {
  const [turn] = await getDb().update(turns).set(patch).where(eq(turns.id, turnId)).returning()

  if (!turn) {
    throw new Error(`Turn ${turnId} not found; nothing was updated.`)
  }
  return turn
}

/**
 * Count one more generation attempt against the PRD §5.3 cap.
 *
 * Incremented in SQL rather than read-modify-write so two concurrent attempts
 * cannot both write the same value.
 */
export async function bumpTurnCursor(sessionId: string): Promise<SessionRow> {
  const [session] = await getDb()
    .update(sessions)
    .set({ turnCursor: sql`${sessions.turnCursor} + 1`, updatedAt: new Date() })
    .where(eq(sessions.id, sessionId))
    .returning()

  if (!session) {
    throw new Error(`Session ${sessionId} not found; the turn cursor was not advanced.`)
  }
  return session
}

/** Flip a session to `completed` once its synthesis lands (PRD §5.1). */
export async function markSessionCompleted(sessionId: string): Promise<SessionRow> {
  const now = new Date()
  const [session] = await getDb()
    .update(sessions)
    .set({ status: 'completed', completedAt: now, updatedAt: now })
    .where(eq(sessions.id, sessionId))
    .returning()

  if (!session) {
    throw new Error(`Session ${sessionId} not found; its status was not changed.`)
  }
  return session
}
