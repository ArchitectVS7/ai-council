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
}

/** Module-local until a caller names it (R2 / knip); surfaced via `ChamberView`. */
type ChamberSession = {
  id: string
  topic: string
  status: 'active' | 'completed' | 'abandoned'
  /** Server-authoritative count of generation attempts, against the PRD §5.3 cap. */
  turnCursor: number
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
}
