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
 * `councils` is joined in exactly one place — `findCouncilWithMembers`, which
 * feeds snapshot *creation*, not rendering.
 */
import { asc, desc, eq } from 'drizzle-orm'

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
