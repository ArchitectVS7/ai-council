/**
 * The client-side round runner (T-013).
 *
 * "Run round" is nothing more than repeated Step, so the stopping rules are
 * pulled out here as a pure function: no React, no `fetch`, no timers. The
 * caller supplies one `step` that performs a real server round trip and one
 * `shouldStop` predicate; every decision about *when to stop* lives below and is
 * unit-tested directly.
 *
 * The server stays authoritative (PRD §5.1): nothing here decides who speaks or
 * what round it is. `atRoundBoundary` only reads back the transcript the server
 * just returned in order to know when a round has finished.
 */
import type { ChamberTurn } from './types'

/** The result of one Step, as the caller observed it. */
export type StepOutcome =
  /** The server stored a turn — `failed: true` when the provider errored (PRD §5.4). */
  | { kind: 'turn'; failed: boolean; atRoundBoundary: boolean }
  /** The server refused (409/422/404); `message` is its text, verbatim. */
  | { kind: 'refused'; message: string }
  /**
   * The convener aborted the stream mid-turn (T-030). The server recorded a
   * `failed` turn with the abort as its reason, so there is nothing to say — the
   * run simply stops, exactly as a Pause between steps would.
   */
  | { kind: 'aborted' }

/**
 * Why the run stopped. `step-limit` is the belt-and-braces case: `maxSteps` is
 * the council's member count, so a round cannot need more steps than that, and
 * the loop can never run away even if the transcript is unexpectedly shaped.
 */
type RunStop = 'round-boundary' | 'failure' | 'pause' | 'refused' | 'step-limit'

export type RunRoundResult = {
  steps: number
  stoppedBy: RunStop
  /** Present only for `refused`: the server's message, passed through unedited. */
  message?: string
}

export async function runRound(deps: {
  step: () => Promise<StepOutcome>
  shouldStop: () => boolean
  maxSteps: number
}): Promise<RunRoundResult> {
  let steps = 0

  while (steps < deps.maxSteps) {
    // Checked *before* every step, including the first, so a Pause pressed while
    // a generation is in flight is honoured the moment that generation lands
    // rather than one turn later.
    if (deps.shouldStop()) return { steps, stoppedBy: 'pause' }

    const outcome = await deps.step()
    if (outcome.kind === 'refused') {
      return { steps, stoppedBy: 'refused', message: outcome.message }
    }
    // An aborted step stored a failed turn rather than a usable one, so it does
    // not count toward the round — and it is a Pause by another name.
    if (outcome.kind === 'aborted') return { steps, stoppedBy: 'pause' }

    steps += 1
    // Halt immediately on a failure: the convener retries that turn before the
    // session can move on, and the server would refuse the next step anyway.
    if (outcome.failed) return { steps, stoppedBy: 'failure' }
    if (outcome.atRoundBoundary) return { steps, stoppedBy: 'round-boundary' }
  }

  return { steps, stoppedBy: 'step-limit' }
}

/**
 * True when every member of the council has spoken an equal number of times —
 * i.e. the transcript sits exactly on a round boundary.
 *
 * Only completed persona turns count. Interjections and syntheses occupy a
 * transcript slot but consume no persona turn (PRD §5.1), and a failed turn is
 * retried in place rather than skipped (PRD §5.4). This mirrors
 * `completedPersonaTurns` in `lib/council/scheduler.ts`, which is what the
 * server uses to pick the next speaker.
 */
export function atRoundBoundary(turns: ChamberTurn[], memberCount: number): boolean {
  if (memberCount <= 0) {
    throw new Error('Council snapshot has no members; a round boundary is undefined.')
  }
  const spoken = turns.filter((t) => t.kind === 'persona' && t.status === 'complete').length
  return spoken > 0 && spoken % memberCount === 0
}
