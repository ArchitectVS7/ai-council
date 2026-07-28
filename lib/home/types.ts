/**
 * The wire shapes the sessions home screen renders from (T-014).
 *
 * Deliberate structural *subsets* of the drizzle-derived rows in
 * `lib/db/repo.ts`, so a payload produced on the server is assignable without a
 * cast while the client never has to reason about the columns it does not read.
 *
 * Client-safe by construction: nothing here imports a server module.
 */

export type SessionListRow = {
  id: string
  topic: string
  /**
   * Snapshot rule (PRD §7): this is `council_snapshot.name`, copied at creation.
   * The council id is deliberately absent from this type so the list cannot be
   * tempted to resolve it.
   */
  councilName: string
  status: 'active' | 'completed' | 'abandoned'
  /** ISO-8601, so the server render and a client render agree exactly. */
  updatedAt: string
}

/** One entry of `GET /api/councils`, as the picker consumes it. */
export type CouncilOption = {
  id: string
  name: string
  description: string | null
  defaultRounds: number
}
