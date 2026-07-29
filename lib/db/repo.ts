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
 * The functions that name `councils` are the library reads and writes behind
 * `/councils` plus `findCouncilWithMembers`, which feeds snapshot *creation*.
 * None of them reads a session row, and `lib/db/repo.test.ts` checks that
 * statically over every exported function in this file.
 */
import { asc, count, desc, eq, inArray, sql } from 'drizzle-orm'

import type { CouncilSnapshot } from '@/lib/council/types'
import type { SnapshotSource } from '@/lib/council/snapshot'
import type { CouncilMemberInput } from '@/lib/councils/members'
import type { CouncilDetail } from '@/lib/councils/types'
import { getDb } from '@/lib/db'
import { councilMembers, councils, personas, sessions, turns } from '@/lib/db/schema'
import type { PersonaSummary } from '@/lib/personas/types'

export type SessionRow = typeof sessions.$inferSelect
export type TurnRow = typeof turns.$inferSelect
export type PersonaRow = typeof personas.$inferSelect

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
    .select({
      name: councils.name,
      defaultRounds: councils.defaultRounds,
      // A3: the only place the council directive enters a session — copied into
      // the snapshot at creation and never re-read from the row afterwards.
      directive: councils.directive,
    })
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

  return {
    name: council.name,
    defaultRounds: council.defaultRounds,
    directive: council.directive,
    members,
  }
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
 * The council library with each council's speaking order, for the builder on
 * `/councils`. Archived councils are omitted for the same reason as above.
 *
 * Two queries rather than one grouped read: nothing here is on a render path,
 * and a flat member list is cheaper to reason about than a grouped join. The
 * member rows carry the persona's name and color so a seat can be labelled even
 * when the persona behind it has since been archived.
 */
export async function listCouncilsWithMembers(): Promise<CouncilDetail[]> {
  const db = getDb()

  const rows = await db
    .select({
      id: councils.id,
      name: councils.name,
      description: councils.description,
      directive: councils.directive,
      defaultRounds: councils.defaultRounds,
    })
    .from(councils)
    .where(eq(councils.archived, false))
    .orderBy(asc(councils.name))

  if (rows.length === 0) return []

  const seats = await db
    .select({
      councilId: councilMembers.councilId,
      personaId: councilMembers.personaId,
      position: councilMembers.position,
      name: personas.name,
      color: personas.color,
    })
    .from(councilMembers)
    .innerJoin(personas, eq(councilMembers.personaId, personas.id))
    .where(
      inArray(
        councilMembers.councilId,
        rows.map((row) => row.id),
      ),
    )
    .orderBy(asc(councilMembers.position))

  return rows.map((row) => ({
    ...row,
    members: seats
      .filter((seat) => seat.councilId === row.id)
      .map((seat) => ({
        personaId: seat.personaId,
        position: seat.position,
        name: seat.name,
        color: seat.color,
      })),
  }))
}

/**
 * One council and its speaking order, archived or not, or null when the id is
 * unknown. Every write answers with this so the builder re-renders from what was
 * stored rather than from what was typed.
 */
export async function findCouncilDetail(councilId: string): Promise<CouncilDetail | null> {
  const db = getDb()

  const [council] = await db
    .select({
      id: councils.id,
      name: councils.name,
      description: councils.description,
      directive: councils.directive,
      defaultRounds: councils.defaultRounds,
    })
    .from(councils)
    .where(eq(councils.id, councilId))
    .limit(1)
  if (!council) return null

  const members = await db
    .select({
      personaId: councilMembers.personaId,
      position: councilMembers.position,
      name: personas.name,
      color: personas.color,
    })
    .from(councilMembers)
    .innerJoin(personas, eq(councilMembers.personaId, personas.id))
    .where(eq(councilMembers.councilId, councilId))
    .orderBy(asc(councilMembers.position))

  return { ...council, members }
}

/** Just enough of a council row for `DELETE` to decide archive-versus-delete. */
export async function findCouncil(
  councilId: string,
): Promise<{ id: string; name: string; archived: boolean } | null> {
  const [council] = await getDb()
    .select({ id: councils.id, name: councils.name, archived: councils.archived })
    .from(councils)
    .where(eq(councils.id, councilId))
    .limit(1)

  return council ?? null
}

/** The four editable council fields of PRD §6 screen 3; create and replace both send all of them. */
type CouncilInput = {
  name: string
  description: string | null
  /** PRD Amendment A3 — display-only `description`'s behavioural counterpart. */
  directive: string | null
  defaultRounds: number
}

/** Create a council. `archived` and the timestamps come from the column defaults. */
export async function insertCouncil(input: CouncilInput): Promise<{ id: string }> {
  const [council] = await getDb().insert(councils).values(input).returning({ id: councils.id })

  if (!council) {
    throw new Error('Council insert returned no row.')
  }
  return council
}

/**
 * Replace a council's four editable fields. Null when the id matched no row, so
 * the caller can answer 404 rather than pretending the write happened.
 */
export async function updateCouncil(
  councilId: string,
  patch: CouncilInput,
): Promise<{ id: string } | null> {
  const [council] = await getDb()
    .update(councils)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(councils.id, councilId))
    .returning({ id: councils.id })

  return council ?? null
}

/** Retire a council from the library without removing the row. */
export async function archiveCouncil(councilId: string): Promise<{ id: string } | null> {
  const [council] = await getDb()
    .update(councils)
    .set({ archived: true, updatedAt: new Date() })
    .where(eq(councils.id, councilId))
    .returning({ id: councils.id })

  return council ?? null
}

/** Remove a council outright. Only safe once `countCouncilReferences` returns 0. */
export async function deleteCouncil(councilId: string): Promise<void> {
  await getDb().delete(councils).where(eq(councils.id, councilId))
}

/**
 * Replace a council's whole speaking order.
 *
 * The composite primary key is `(council_id, position)`, so a partial update
 * cannot express a reorder — the same reason `scripts/seed.ts` writes membership
 * this way. `members` must already be normalized to contiguous `0..n-1`
 * positions; `normalizeCouncilMembers` is what the routes call to guarantee it.
 *
 * Not wrapped in a transaction: this is a single-convener app, the same
 * rationale PRD §8 gives for the in-memory rate limiter.
 */
export async function replaceCouncilMembers(
  councilId: string,
  members: CouncilMemberInput[],
): Promise<void> {
  const db = getDb()

  await db.delete(councilMembers).where(eq(councilMembers.councilId, councilId))
  if (members.length === 0) return

  await db.insert(councilMembers).values(
    members.map((member) => ({
      councilId,
      personaId: member.personaId,
      position: member.position,
    })),
  )
}

/**
 * Create a session. `councilId` is stored as provenance only (nullable FK); the
 * snapshot is what the session will be rendered from for the rest of its life.
 * `status`, `turn_cursor`, and the timestamps come from the column defaults.
 *
 * `model` is the convener's per-session override (PRD Amendment A1); null — the
 * default — means every turn resolves the app default from the environment.
 */
export async function insertSession(input: {
  topic: string
  councilId: string
  model?: string | null
  snapshot: CouncilSnapshot
}): Promise<SessionRow> {
  const [session] = await getDb()
    .insert(sessions)
    .values({
      topic: input.topic,
      councilId: input.councilId,
      model: input.model ?? null,
      councilSnapshot: input.snapshot,
    })
    .returning()

  if (!session) {
    throw new Error('Session insert returned no row.')
  }
  return session
}

/**
 * A validated session document (T-031), as `lib/transfer/schema.ts` produces it.
 *
 * Structural, not an import of that module: the repo stays the layer that knows
 * about columns, and the document format stays the layer that knows about JSON.
 * Timestamps arrive as ISO strings and are converted to `Date` here, because
 * this is the only module that knows drizzle's `timestamp` columns want one.
 */
type ImportedSession = {
  session: {
    topic: string
    model: string | null
    status: SessionRow['status']
    turnCursor: number
    createdAt: string
    completedAt: string | null
    councilSnapshot: CouncilSnapshot
  }
  /** Every persisted turn column except the two ids, which this write assigns. */
  turns: (Omit<NewTurnInput, 'sessionId'> & { createdAt: string })[]
}

/**
 * Write an imported session and its whole transcript.
 *
 * `councilId` is null on purpose: PRD §7 makes it provenance only, and a
 * document imported from elsewhere has no provenance in *this* database. The
 * session still renders entirely from its `councilSnapshot`, which is exactly
 * what the snapshot rule is for. `updatedAt` is left to the column default so a
 * freshly imported session sorts to the top of `/`.
 *
 * Not wrapped in a transaction — neon-http offers none here, the same
 * single-convener rationale as `replaceCouncilMembers` — so a failed transcript
 * write deletes the session row it just made and rethrows. A half-imported
 * session would be silent corruption, which R4 forbids outright.
 */
export async function insertImportedSession(input: ImportedSession): Promise<SessionRow> {
  const db = getDb()

  const [session] = await db
    .insert(sessions)
    .values({
      topic: input.session.topic,
      councilId: null,
      model: input.session.model,
      councilSnapshot: input.session.councilSnapshot,
      status: input.session.status,
      turnCursor: input.session.turnCursor,
      createdAt: new Date(input.session.createdAt),
      completedAt:
        input.session.completedAt === null ? null : new Date(input.session.completedAt),
    })
    .returning()

  if (!session) {
    throw new Error('Imported session insert returned no row.')
  }

  if (input.turns.length === 0) return session

  try {
    await db
      .insert(turns)
      .values(
        input.turns.map((turn) => ({ ...turn, sessionId: session.id, createdAt: new Date(turn.createdAt) })),
      )
  } catch (error) {
    await db.delete(sessions).where(eq(sessions.id, session.id))
    throw error
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

/**
 * Mark activity on a session without counting a generation.
 *
 * An interjection is convener-authored, so it must not move `turn_cursor`
 * (PRD §5.3 caps *generated* turns) — but it is activity, and the sessions list
 * orders by `updated_at`.
 */
export async function touchSession(sessionId: string): Promise<SessionRow> {
  const [session] = await getDb()
    .update(sessions)
    .set({ updatedAt: new Date() })
    .where(eq(sessions.id, sessionId))
    .returning()

  if (!session) {
    throw new Error(`Session ${sessionId} not found; its activity time was not updated.`)
  }
  return session
}

/**
 * Reopen a completed session (PRD §5.1's "iterate" mechanic).
 *
 * `completed_at` is cleared because the session is no longer completed; a later
 * synthesis re-stamps it through `markSessionCompleted`. No turn is removed —
 * the prior synthesis stays in the transcript.
 */
export async function reopenSession(sessionId: string): Promise<SessionRow> {
  const [session] = await getDb()
    .update(sessions)
    .set({ status: 'active', completedAt: null, updatedAt: new Date() })
    .where(eq(sessions.id, sessionId))
    .returning()

  if (!session) {
    throw new Error(`Session ${sessionId} not found; its status was not changed.`)
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

/** The four editable fields of PRD §6 screen 4; both create and replace send all of them. */
export type PersonaInput = {
  name: string
  role: string
  charter: string
  color: string
}

/**
 * The persona library, for the grid on `/personas` and the member pickers.
 *
 * Archived personas are omitted: they may not join a new speaking order, while
 * every session that already ran keeps rendering from its own snapshot. This is
 * a library read — no session row is touched and no join is made.
 */
export async function listPersonas(): Promise<PersonaSummary[]> {
  return getDb()
    .select({
      id: personas.id,
      name: personas.name,
      role: personas.role,
      charter: personas.charter,
      color: personas.color,
    })
    .from(personas)
    .where(eq(personas.archived, false))
    .orderBy(asc(personas.name))
}

/** One persona by id, archived or not, or null when the id is unknown. */
export async function findPersona(personaId: string): Promise<PersonaRow | null> {
  const [persona] = await getDb()
    .select()
    .from(personas)
    .where(eq(personas.id, personaId))
    .limit(1)

  return persona ?? null
}

/**
 * Which of the given persona ids actually exist — an existence check, nothing
 * more, so the council write routes can answer a 400 that names the unknown id
 * instead of letting a foreign-key violation surface as a 500 (R4).
 *
 * Archived personas count as existing: a council may already seat one, and
 * saving an unrelated edit to that council must not silently drop the seat.
 */
export async function findPersonasByIds(personaIds: string[]): Promise<{ id: string }[]> {
  if (personaIds.length === 0) return []

  return getDb().select({ id: personas.id }).from(personas).where(inArray(personas.id, personaIds))
}

/** Create a persona. `archived` and the timestamps come from the column defaults. */
export async function insertPersona(input: PersonaInput): Promise<PersonaRow> {
  const [persona] = await getDb().insert(personas).values(input).returning()

  if (!persona) {
    throw new Error('Persona insert returned no row.')
  }
  return persona
}

/**
 * Replace a persona's four editable fields. Null when the id matched no row, so
 * the caller can answer 404 rather than pretending the write happened.
 */
export async function updatePersona(
  personaId: string,
  patch: PersonaInput,
): Promise<PersonaRow | null> {
  const [persona] = await getDb()
    .update(personas)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(personas.id, personaId))
    .returning()

  return persona ?? null
}

/** Retire a persona from the library without removing the row. */
export async function archivePersona(personaId: string): Promise<PersonaRow | null> {
  const [persona] = await getDb()
    .update(personas)
    .set({ archived: true, updatedAt: new Date() })
    .where(eq(personas.id, personaId))
    .returning()

  return persona ?? null
}

/** Remove a persona outright. Only safe once `countPersonaReferences` returns 0. */
export async function deletePersona(personaId: string): Promise<void> {
  await getDb().delete(personas).where(eq(personas.id, personaId))
}

/**
 * How many places still refer to this persona — "referenced by any council or
 * exists in history" (PRD §6 screen 4). Non-zero means `DELETE` must archive.
 *
 * The two halves are counted differently *because of* the snapshot rule:
 *
 * - Membership is counted by id, exactly, over `council_members`.
 * - History is counted by **name**, over the frozen snapshots. A snapshot member
 *   stores `{name, role, charter, color}` and no persona id (PRD §7), so
 *   identity genuinely cannot be recovered — and that is the point: the copy is
 *   what makes a past transcript immune to a later delete. Name matching can
 *   therefore only produce a *false positive*, which archives instead of
 *   deleting. That is the conservative direction, so it is the right error.
 *
 * Two small counts rather than one join: nothing here is on a render path.
 */
export async function countPersonaReferences(persona: {
  id: string
  name: string
}): Promise<number> {
  const db = getDb()

  const [membership] = await db
    .select({ value: count() })
    .from(councilMembers)
    .where(eq(councilMembers.personaId, persona.id))

  const [history] = await db
    .select({ value: count() })
    .from(sessions)
    .where(
      sql`exists (select 1 from jsonb_array_elements(${sessions.councilSnapshot} -> 'members') as member where member ->> 'name' = ${persona.name})`,
    )

  return (membership?.value ?? 0) + (history?.value ?? 0)
}

/**
 * How many sessions still point at this council. Non-zero means `DELETE` must
 * archive rather than remove the row.
 *
 * This is a provenance count, not a render and not a join: it reads only
 * `sessions.council_id`, never `council_snapshot`, and no transcript content is
 * touched. The snapshot rule is exactly why archiving matters here — the FK is
 * `on delete set null`, so a hard delete would erase which council a past run
 * came from while leaving every one of its turns intact and unchanged (PRD §7).
 */
export async function countCouncilReferences(councilId: string): Promise<number> {
  const [referenced] = await getDb()
    .select({ value: count() })
    .from(sessions)
    .where(eq(sessions.councilId, councilId))

  return referenced?.value ?? 0
}
