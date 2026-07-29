/**
 * The wire shape the chamber renders from (T-013).
 *
 * These are deliberate structural *subsets* of the drizzle rows in
 * `lib/db/repo.ts`, so a `SessionView` produced on the server is assignable to
 * `ChamberView` without a cast, while the client never has to reason about the
 * columns it does not read — timestamps in particular, which are `Date` when the
 * server component passes them down and ISO strings after a client refetch.
 *
 * Client-safe by construction: nothing here imports a server module.
 */
import type { CouncilSnapshot } from '@/lib/council/types'

export type ChamberTurn = {
  id: string
  seq: number
  kind: 'persona' | 'interjection' | 'synthesis'
  /** From the snapshot; null for an interjection. */
  speakerName: string | null
  round: number
  content: string
  status: 'complete' | 'failed'
  /** The provider's message, verbatim, when `status` is `failed` (PRD §5.4). */
  error: string | null
  /**
   * The four fields below are carried for the JSON session document (T-031) and
   * are never rendered. They are on the wire already — every one is a `turns`
   * column that `GET /api/sessions/[id]` returns — so naming them here costs
   * nothing and lets the export be a lossless archive rather than a summary.
   * `createdAt` is a `Date` on the server render and an ISO string after a
   * client refetch, per the note at the top of this file.
   */
  model: string | null
  promptTokens: number | null
  completionTokens: number | null
  createdAt: string | Date
}

/** Module-local until a caller names it (R2 / knip); surfaced via `ChamberView`. */
type ChamberSession = {
  id: string
  topic: string
  status: 'active' | 'completed' | 'abandoned'
  /** Server-authoritative count of generation attempts, against the PRD §5.3 cap. */
  turnCursor: number
  /**
   * The session's own model (PRD Amendment A1), chosen at creation and fixed
   * for the session's life. Null means it follows the app default, which the
   * payload carries as `defaultModel`.
   */
  model: string | null
  /**
   * When the session was convened; carried for the Markdown export header.
   * `Date` on the server render, ISO string after a client refetch — see the
   * note at the top of this file.
   */
  createdAt: string | Date
  /**
   * When the synthesis landed, or null while the session is not completed.
   * Carried for the JSON session document (T-031), not rendered.
   */
  completedAt: string | Date | null
  /**
   * Snapshot rule (PRD §7): the council is rendered from this frozen copy alone.
   * `councilId` is provenance and is deliberately absent from this type so the
   * chamber cannot be tempted to resolve it.
   */
  councilSnapshot: CouncilSnapshot
}

export type ChamberView = {
  session: ChamberSession
  turns: ChamberTurn[]
  mockMode: boolean
  /** True under `LLM_PROVIDER=local` — the neutral LOCAL indicator, not a warning. */
  localMode: boolean
  /** The app default, used when the session set no model of its own. */
  defaultModel: string
}
