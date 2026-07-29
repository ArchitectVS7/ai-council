/**
 * The session document — a session and its whole transcript as portable JSON
 * (T-031, PRD §6 "Export").
 *
 * Pure and client-safe: the chamber imports this module to build a download, so
 * it deliberately holds **no zod import**. The validator in `./schema.ts` reads
 * the type and the version constant from here; the dependency never runs the
 * other way, which keeps the parser out of the browser bundle.
 *
 * Snapshot rule (PRD §7): the document carries `councilSnapshot` and no council
 * id. A council is provenance, not content, and an imported session has no
 * provenance in the database it lands in.
 *
 * The document is a pure function of stored state — nothing clock- or
 * environment-derived appears in it (no export timestamp, no app version, no
 * provider name), because anything of that kind would break the round trip.
 * Deliberately excluded for the same reason: `session.id`, `session.councilId`,
 * `session.updatedAt`, `turn.id`, and `turn.sessionId`, all of which belong to
 * the row rather than to the session.
 */
import { sessionBasename } from '@/lib/council/export-md'
import type { CouncilSnapshot } from '@/lib/council/types'

/**
 * The document format version.
 *
 * Policy: adding an *optional* field does not need a bump — an older document
 * still parses and a newer reader still understands it. Removing a field,
 * retyping one, or making an optional field required does.
 */
export const SESSION_DOCUMENT_VERSION = 1

/** One transcript row as it travels: every persisted column except the two ids. */
type SessionDocumentTurn = {
  seq: number
  kind: 'persona' | 'interjection' | 'synthesis'
  /** From the snapshot; null for an interjection. */
  speakerName: string | null
  round: number
  content: string
  status: 'complete' | 'failed'
  /** The provider's message, verbatim, when `status` is `failed` (R4). */
  error: string | null
  model: string | null
  promptTokens: number | null
  completionTokens: number | null
  /** ISO-8601 UTC. */
  createdAt: string
}

/** The session's own configuration and lifecycle, minus everything row-local. */
type SessionDocumentSession = {
  topic: string
  model: string | null
  status: 'active' | 'completed' | 'abandoned'
  turnCursor: number
  /** ISO-8601 UTC. */
  createdAt: string
  /** ISO-8601 UTC; null while the session is not completed. */
  completedAt: string | null
  councilSnapshot: CouncilSnapshot
}

/** The whole exchange format. `schemaVersion` is the first key, always. */
export type SessionDocument = {
  schemaVersion: number
  session: SessionDocumentSession
  turns: SessionDocumentTurn[]
}

/**
 * What the exporter needs. A structural subset, so both the client `ChamberView`
 * and the server `SessionView` satisfy it without a cast; timestamps are a union
 * for the usual reason (`Date` on a server render, ISO string after a refetch).
 */
type SessionDocumentSource = {
  topic: string
  model: string | null
  status: SessionDocumentSession['status']
  turnCursor: number
  createdAt: string | Date
  completedAt: string | Date | null
  councilSnapshot: CouncilSnapshot
  turns: readonly {
    seq: number
    kind: SessionDocumentTurn['kind']
    speakerName: string | null
    round: number
    content: string
    status: SessionDocumentTurn['status']
    error: string | null
    model: string | null
    promptTokens: number | null
    completionTokens: number | null
    createdAt: string | Date
  }[]
}

/**
 * A timestamp as ISO-8601 UTC.
 *
 * R4: an unreadable value throws rather than becoming `null`. Silently emitting
 * a hole would produce a document that imports "successfully" as a different
 * session, which is exactly the failure this format exists to prevent.
 */
function isoTimestamp(value: string | Date, field: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Session has an unreadable ${field}: ${String(value)}`)
  }
  return date.toISOString()
}

/**
 * Build the document.
 *
 * Every object is rebuilt as a fresh literal in a fixed key order rather than
 * passed through by reference. That is what makes the round trip byte-stable:
 * a jsonb read is ordered however it happened to be stored, while a parsed
 * document is ordered by the schema, and `JSON.stringify` preserves insertion
 * order. Rebuilding puts both on the same footing.
 *
 * Failed turns are kept, unlike the Markdown export: this is an archive of the
 * session, not a document for a reader.
 */
export function toSessionDocument(source: SessionDocumentSource): SessionDocument {
  const snapshot = source.councilSnapshot

  return {
    schemaVersion: SESSION_DOCUMENT_VERSION,
    session: {
      topic: source.topic,
      model: source.model,
      status: source.status,
      turnCursor: source.turnCursor,
      createdAt: isoTimestamp(source.createdAt, 'createdAt'),
      completedAt:
        source.completedAt === null ? null : isoTimestamp(source.completedAt, 'completedAt'),
      councilSnapshot: {
        name: snapshot.name,
        rounds: snapshot.rounds,
        members: snapshot.members.map((member) => ({
          name: member.name,
          role: member.role,
          charter: member.charter,
          color: member.color,
        })),
      },
    },
    // A copy before sorting: the caller's array is the rendered transcript and
    // must not be reordered underneath it.
    turns: source.turns
      .slice()
      .sort((a, b) => a.seq - b.seq)
      .map((turn) => ({
        seq: turn.seq,
        kind: turn.kind,
        speakerName: turn.speakerName,
        round: turn.round,
        content: turn.content,
        status: turn.status,
        error: turn.error,
        model: turn.model,
        promptTokens: turn.promptTokens,
        completionTokens: turn.completionTokens,
        createdAt: isoTimestamp(turn.createdAt, `turn ${turn.seq} createdAt`),
      })),
  }
}

/** Deterministic download name: `council-session-<topic-slug>-<YYYY-MM-DD>.json`. */
export function sessionJsonFilename(session: { topic: string; createdAt: string | Date }): string {
  return `${sessionBasename(session)}.json`
}
