/**
 * Pure domain types for the council loop (PRD §5, §7 of `design-docs/02-PRD-Rebuild.md`).
 *
 * Zero imports by design: `lib/db/schema.ts` consumes `CouncilSnapshot` from here,
 * never the reverse. Nothing in `lib/council/` may import `lib/db` or `lib/llm`
 * (guarded by `lib/council/purity.test.ts`).
 */

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
  /**
   * Council-level instruction fed to every member, the Chair included, on every
   * turn (PRD Amendment A3). Absent on every snapshot frozen before A3 shipped,
   * and absent whenever the council has none — both behave as "no directive".
   * Typed tolerantly on read so an old row carrying an explicit `null` still
   * fits; `buildCouncilSnapshot` only ever emits the key or omits it.
   */
  directive?: string | null
  members: CouncilSnapshotMember[]
}

/**
 * The three literal sets below are the paired definitions of the pg enums in
 * `lib/db/schema.ts` (`turn_kind`, `turn_status`, `session_status`). Changing one
 * requires changing the other; `lib/db/schema.test.ts` guards the column shape.
 * They stay module-local until a caller needs them by name (R2 / knip).
 */
type TurnKind = 'persona' | 'interjection' | 'synthesis'
type TurnStatus = 'complete' | 'failed'
type SessionStatus = 'active' | 'completed' | 'abandoned'

/**
 * The structural subset of a `turns` row that the domain logic reads. A full
 * drizzle row is assignable to this, so callers pass rows straight through.
 */
export type TranscriptTurn = {
  seq: number
  kind: TurnKind
  /** From the snapshot; null for an interjection. */
  speakerName: string | null
  round: number
  content: string
  status: TurnStatus
}

/**
 * Everything the scheduler needs, all of it server-side state.
 *
 * `generatedTurns` is the persisted count of LLM generation attempts
 * (`sessions.turn_cursor`), passed in rather than derived: PRD §5.3 counts
 * regenerations toward the 60-turn cap, and a regeneration replaces a row in
 * place (same `seq`), so the count is not recoverable from the transcript rows.
 * T-012/T-020 increment it on every persisted generated turn (advance,
 * synthesize, retry, regenerate); interjections never increment it.
 */
export type SessionState = {
  status: SessionStatus
  snapshot: CouncilSnapshot
  turns: TranscriptTurn[]
  generatedTurns: number
}
