/**
 * What the chamber's controls may promise (T-021).
 *
 * These predicates are the client's mirror of the server's refusal rules in
 * `lib/session/turns.ts`, kept out of the component so they can be asserted
 * directly against fixtures. Pure by construction: no React, no `fetch`, no
 * server import.
 *
 * They are a courtesy, not an authority. The server still decides — every
 * refusal it returns is surfaced verbatim (R4), and nothing here is allowed to
 * enable something the API would deny.
 */
import { MAX_GENERATED_TURNS } from '@/lib/council/scheduler'

import type { ChamberTurn, ChamberView } from './types'

/**
 * The most recent turn by `seq` rather than by array position, mirroring
 * `latestTurn` in `lib/session/turns.ts`. The API returns turns seq-ordered;
 * deriving it is defensive, not speculative — the refusal rules below are only
 * correct if "latest" means the same thing on both sides.
 */
function latestTurn(turns: ChamberTurn[]): ChamberTurn | null {
  return turns.reduce<ChamberTurn | null>(
    (latest, turn) => (latest === null || turn.seq > latest.seq ? turn : latest),
    null,
  )
}

/**
 * Which controls are live for this view. `busy` is the component's in-flight
 * flag: nothing may be pressed twice while a round trip is outstanding.
 */
export function controlState(
  view: ChamberView,
  busy: boolean,
): {
  canGenerate: boolean
  canRegenerate: boolean
  canInterject: boolean
  showReopen: boolean
  canReopen: boolean
} {
  const active = view.session.status === 'active'
  const atCap = view.session.turnCursor >= MAX_GENERATED_TURNS
  const last = latestTurn(view.turns)

  // Step / Run round / Synthesize / Retry — the scheduler's `canGenerate`.
  const canGenerate = !busy && active && !atCap

  return {
    canGenerate,
    // `regenerateLastTurn`: a completed session must be reopened first, a
    // regeneration is a generation attempt so the cap stands, and only a
    // complete persona or synthesis turn can be replaced — an interjection was
    // never generated, and a failed turn is Retry's job.
    canRegenerate:
      canGenerate && last !== null && last.kind !== 'interjection' && last.status === 'complete',
    // `addInterjection`. Deliberately *not* gated on the cap: a note generates
    // nothing, and PRD §5.3 caps generated turns only. Do not "fix" this into
    // `canGenerate` — the server would still accept the note.
    canInterject: !busy && active && (last === null || last.status !== 'failed'),
    // `reopenSession` refuses anything that is not completed, and the PRD shows
    // the control only where it applies rather than permanently greyed out.
    showReopen: view.session.status === 'completed',
    canReopen: view.session.status === 'completed' && !busy,
  }
}

/**
 * The `seq` of the turn that carries the "Result" label, or null when the
 * session has no synthesis yet.
 *
 * A session may hold several syntheses and the latest is the session's result
 * (PRD §5.1). Failed syntheses are skipped, matching `exportSessionMarkdown`,
 * which drops failed turns before labelling the last one `### Result` — the
 * chamber and the export must agree on which turn is the result.
 */
export function resultSeq(turns: ChamberTurn[]): number | null {
  return turns.reduce<number | null>(
    (result, turn) =>
      turn.kind === 'synthesis' && turn.status === 'complete' && (result === null || turn.seq > result)
        ? turn.seq
        : result,
    null,
  )
}
