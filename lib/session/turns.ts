import 'server-only'

/**
 * The session loop — advance, synthesize, retry-last, interject,
 * regenerate-last, reopen (PRD §5.1, §5.3, §8).
 *
 * This is the only place the three pieces meet: the pure scheduler/prompt
 * builder in `lib/council/`, the provider in `lib/llm.ts`, and the writes in
 * `lib/db/repo.ts`. Route handlers call these functions and do nothing but map
 * the typed result onto a status code, which keeps the loop unit-testable
 * without HTTP and keeps `lib/council/` free of database and provider imports.
 *
 * Server-authoritative (PRD §5.1): every one of these entry points takes a
 * session id and nothing else. Who speaks, in which round, into which
 * transcript slot is derived here from persisted state — the client is never
 * asked and is never believed.
 *
 * Snapshot rule (PRD §7): the roster comes from `session.councilSnapshot`.
 * Nothing here reads `councils` or `personas`.
 *
 * One invariant ties the six entry points together: **every generation requires
 * an active session, and a failed turn is always the most recent turn.** That is
 * why regenerate-last refuses a completed session (reopen it first — one call)
 * rather than quietly reactivating it: a regeneration that failed on a completed
 * session would leave a `failed` last turn that `retryLastTurn` then refuses with
 * `not-active`, wedging the session. It is also why an interjection is refused
 * while a failed turn is pending, even though an interjection generates nothing.
 */
import type { RoundType } from '@/lib/council/prompt'
import { buildTurnPrompt } from '@/lib/council/prompt'
import { canGenerate, currentRound, nextSpeaker, nextTurnSeq } from '@/lib/council/scheduler'
import type { CouncilSnapshotMember, SessionState } from '@/lib/council/types'
import type { NewTurnInput, SessionRow, TurnPatch, TurnRow } from '@/lib/db/repo'
import {
  bumpTurnCursor,
  findSessionWithTurns,
  insertTurn,
  markSessionCompleted,
  reopenSession as reopenSessionRow,
  touchSession,
  updateTurnInPlace,
} from '@/lib/db/repo'
import { generate, getModel } from '@/lib/llm'
import { CHAIR_PERSONA } from '@/lib/seed-data'

import { withSessionLock } from './lock'

/**
 * Why a session action was refused. Each value maps to exactly one status code
 * in `lib/api/http.ts`; the accompanying message is surfaced verbatim. The name
 * predates reopen, which produces no turn but shares the same refusal
 * vocabulary — renaming it would churn `lib/api/http.ts` and two suites for no
 * behavioural gain.
 */
export type TurnFailureReason =
  | 'invalid-session'
  | 'locked'
  | 'not-active'
  | 'awaiting-retry'
  | 'nothing-to-retry'
  | 'nothing-to-synthesize'
  | 'nothing-to-regenerate'
  | 'not-completed'
  | 'cap-reached'

export type TurnResult =
  | {
      ok: true
      turn: TurnRow
      session: SessionRow
      /** Set by `advanceSession`: the session has run every round its snapshot planned. */
      plannedRoundsComplete?: boolean
    }
  | { ok: false; reason: TurnFailureReason; message: string }

/**
 * The result of an action that changes a session without writing a turn — only
 * `reopenSession` today. Module-local until a caller names it (R2 / knip); the
 * route infers it from the function's return type.
 */
type SessionActionResult =
  | { ok: true; session: SessionRow }
  | { ok: false; reason: TurnFailureReason; message: string }

/** The provider's result, already shaped for a `turns` row. */
type GeneratedFields = Pick<
  NewTurnInput,
  'content' | 'status' | 'error' | 'model' | 'promptTokens' | 'completionTokens'
>

const LOCKED: TurnResult = {
  ok: false,
  reason: 'locked',
  message: 'A turn is already being generated for this session. Wait for it to finish.',
}

/** The scheduler's refusal reasons, renamed to this module's vocabulary. */
function refusal(check: {
  reason: 'session-not-active' | 'awaiting-retry' | 'cap-reached'
  message: string
}): TurnResult {
  const reason =
    check.reason === 'session-not-active'
      ? 'not-active'
      : check.reason === 'awaiting-retry'
        ? 'awaiting-retry'
        : 'cap-reached'
  // The message is the scheduler's, unedited — it already names the 60-turn cap
  // and the session's actual status.
  return { ok: false, reason, message: check.message }
}

type LoadedSession = { session: SessionRow; turns: TurnRow[]; state: SessionState }

async function loadSession(sessionId: string): Promise<LoadedSession | null> {
  const found = await findSessionWithTurns(sessionId)
  if (!found) return null

  return {
    session: found.session,
    turns: found.turns,
    state: {
      status: found.session.status,
      snapshot: found.session.councilSnapshot,
      turns: found.turns,
      // PRD §5.3 counts every generation attempt, including regenerations, so
      // this is the persisted counter rather than a count of transcript rows.
      generatedTurns: found.session.turnCursor,
    },
  }
}

function notFoundResult(sessionId: string): TurnResult {
  return { ok: false, reason: 'invalid-session', message: `Session ${sessionId} not found.` }
}

/** The highest-`seq` turn, or null on an empty transcript. */
function latestTurn(turns: TurnRow[]): TurnRow | null {
  return turns.reduce<TurnRow | null>(
    (acc, turn) => (acc === null || turn.seq > acc.seq ? turn : acc),
    null,
  )
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * One provider call, converted into the columns of a `turns` row.
 *
 * A provider failure is *data*, not an exception: PRD §5.4 requires the error
 * text to reach the transcript so the convener can read it next to a Retry
 * button. This is not a silent fallback (R4) — nothing is retried here, no
 * substitute text is invented, and the verbatim provider message is stored and
 * returned. `getModel()` is called outside the try on purpose: an unreadable
 * `LLM_PROVIDER` is operator misconfiguration, not a turn failure, and must
 * surface as a 500 rather than be recorded against a persona.
 */
async function runProvider(built: {
  system: string
  prompt: string
  maxTokens: number
  temperature: number
}): Promise<GeneratedFields> {
  const model = getModel()
  try {
    const result = await generate(built)
    return {
      content: result.text,
      status: 'complete',
      error: null,
      model,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
    }
  } catch (error) {
    return {
      content: '',
      status: 'failed',
      error: messageOf(error),
      model,
      promptTokens: null,
      completionTokens: null,
    }
  }
}

/**
 * Generate the next persona turn.
 *
 * The lock is taken before the read so two concurrent calls cannot derive the
 * same `seq`; the second caller gets `locked` and never touches the database.
 */
export async function advanceSession(sessionId: string): Promise<TurnResult> {
  const outcome = await withSessionLock(sessionId, async (): Promise<TurnResult> => {
    const loaded = await loadSession(sessionId)
    if (!loaded) return notFoundResult(sessionId)

    const decision = nextSpeaker(loaded.state)
    if (!decision.ok) return refusal(decision)

    const speaker = loaded.state.snapshot.members[decision.memberIndex]
    const built = buildTurnPrompt({
      topic: loaded.session.topic,
      snapshot: loaded.state.snapshot,
      turns: loaded.state.turns,
      speaker,
      round: decision.round,
      kind: decision.roundType,
    })

    // Reserve the cap slot before spending it. The neon-http driver has no
    // interactive transactions, so these writes are sequential; counting first
    // means a crash between them can only under-count the transcript, never let
    // a session slip past the 60-turn cap.
    const session = await bumpTurnCursor(sessionId)
    const generated = await runProvider(built)
    const turn = await insertTurn({
      sessionId,
      seq: decision.seq,
      kind: 'persona',
      speakerName: decision.speakerName,
      round: decision.round,
      ...generated,
    })

    return { ok: true, turn, session, plannedRoundsComplete: decision.plannedRoundsComplete }
  })

  return outcome.locked ? LOCKED : outcome.value
}

/**
 * The Chair produces the synthesis and the session is marked completed.
 *
 * The Chair is in no council's speaking order and therefore in no snapshot, so
 * its charter comes from the built-in constant (PRD §3) rather than a live
 * `personas` row — the snapshot rule forbids a session's output depending on an
 * editable table.
 */
export async function synthesizeSession(sessionId: string): Promise<TurnResult> {
  const outcome = await withSessionLock(sessionId, async (): Promise<TurnResult> => {
    const loaded = await loadSession(sessionId)
    if (!loaded) return notFoundResult(sessionId)

    const check = canGenerate(loaded.state)
    if (!check.ok) return refusal(check)

    const hasSpoken = loaded.state.turns.some((t) => t.kind === 'persona' && t.status === 'complete')
    if (!hasSpoken) {
      return {
        ok: false,
        reason: 'nothing-to-synthesize',
        message: 'No persona has spoken yet; advance the session before synthesizing.',
      }
    }

    const round = currentRound(loaded.state)
    const built = buildTurnPrompt({
      topic: loaded.session.topic,
      snapshot: loaded.state.snapshot,
      turns: loaded.state.turns,
      speaker: CHAIR_PERSONA,
      round,
      kind: 'synthesis',
    })

    const session = await bumpTurnCursor(sessionId)
    const generated = await runProvider(built)
    const turn = await insertTurn({
      sessionId,
      seq: nextTurnSeq(loaded.state.turns),
      kind: 'synthesis',
      speakerName: CHAIR_PERSONA.name,
      round,
      ...generated,
    })

    // A synthesis that failed leaves the session active on purpose: retry-last
    // is the way back, and a session must never be sealed on an error turn.
    if (generated.status !== 'complete') return { ok: true, turn, session }

    return { ok: true, turn, session: await markSessionCompleted(sessionId) }
  })

  return outcome.locked ? LOCKED : outcome.value
}

/**
 * Rewrite one already-persisted turn from a fresh provider call.
 *
 * Shared by retry-last (the turn failed) and regenerate-last (the turn is fine
 * but the convener wants another take). Everything below the eligibility rules
 * is identical, and duplicating it would let the two endpoints drift on the
 * things that matter most: the slot never moves (`updateTurnInPlace` on the same
 * row id, so `seq`, `kind`, `round` and `speaker_name` are untouched), the
 * attempt counts toward the PRD §5.3 cap, and a successful synthesis re-seals
 * the session.
 */
async function regenerateTurnInPlace(loaded: LoadedSession, last: TurnRow): Promise<TurnResult> {
  const sessionId = loaded.session.id

  let speaker: CouncilSnapshotMember
  let kind: RoundType
  if (last.kind === 'synthesis') {
    speaker = CHAIR_PERSONA
    kind = 'synthesis'
  } else {
    const member = loaded.state.snapshot.members.find((m) => m.name === last.speakerName)
    if (!member) {
      // Impossible under the snapshot rule: the speaker was read out of this
      // same frozen roster when the turn was created. Fail loudly (R4) rather
      // than substitute a different persona.
      throw new Error(
        `Turn ${last.seq} of session ${sessionId} names speaker "${last.speakerName}", ` +
          'which is not in the session council snapshot.',
      )
    }
    speaker = member
    kind = last.round === 1 ? 'opening' : 'rebuttal'
  }

  // The turn being replaced is excluded from its own context. A failed turn is
  // already dropped by the budgeter, so this changes nothing for retry; for a
  // regeneration it stops the speaker being shown the very text it is being
  // asked to replace. Dropping it also re-exposes any interjection that landed
  // before it, which is exactly the note this new attempt must address.
  const built = buildTurnPrompt({
    topic: loaded.session.topic,
    snapshot: loaded.state.snapshot,
    turns: loaded.state.turns.filter((turn) => turn.seq !== last.seq),
    speaker,
    round: last.round,
    kind,
  })

  // Another generation attempt, so it counts toward the cap (PRD §5.3).
  const session = await bumpTurnCursor(sessionId)
  const generated: TurnPatch = await runProvider(built)
  const turn = await updateTurnInPlace(last.id, generated)

  if (turn.kind !== 'synthesis' || generated.status !== 'complete') {
    return { ok: true, turn, session }
  }
  return { ok: true, turn, session: await markSessionCompleted(sessionId) }
}

/**
 * Retry the latest turn, in place, when — and only when — it failed.
 *
 * Replacing a *complete* turn is `regenerateLastTurn`, a different endpoint with
 * different rules, so it is refused here rather than quietly allowed.
 */
export async function retryLastTurn(sessionId: string): Promise<TurnResult> {
  const outcome = await withSessionLock(sessionId, async (): Promise<TurnResult> => {
    const loaded = await loadSession(sessionId)
    if (!loaded) return notFoundResult(sessionId)

    const last = latestTurn(loaded.turns)
    if (!last) {
      return {
        ok: false,
        reason: 'nothing-to-retry',
        message: 'This session has no turns yet; there is nothing to retry.',
      }
    }
    if (last.status !== 'failed') {
      return {
        ok: false,
        reason: 'nothing-to-retry',
        message: 'The most recent turn did not fail; there is nothing to retry.',
      }
    }
    if (last.kind === 'interjection') {
      return {
        ok: false,
        reason: 'nothing-to-retry',
        message: 'The most recent turn is an interjection; it was not generated and cannot be retried.',
      }
    }

    // `awaiting-retry` is precisely the state this call repairs; every other
    // refusal (inactive session, cap reached) still stands, and its message is
    // the scheduler's so the 60-turn wording is never duplicated here.
    const check = canGenerate(loaded.state)
    if (!check.ok && check.reason !== 'awaiting-retry') return refusal(check)

    return regenerateTurnInPlace(loaded, last)
  })

  return outcome.locked ? LOCKED : outcome.value
}

/**
 * Record a convener-authored interjection (PRD §5.1, §5.2).
 *
 * It occupies a transcript slot but consumes no persona's turn — the scheduler
 * counts only completed persona turns, so whoever was due to speak still is.
 * The lock is taken so a note cannot be written into the `seq` an in-flight
 * generation has already claimed.
 */
export async function addInterjection(sessionId: string, content: string): Promise<TurnResult> {
  const outcome = await withSessionLock(sessionId, async (): Promise<TurnResult> => {
    const loaded = await loadSession(sessionId)
    if (!loaded) return notFoundResult(sessionId)

    // Deliberately *not* `canGenerate`: an interjection generates nothing, so
    // the 60-turn cap must never block one (PRD §5.3 caps generated turns). The
    // two checks that do apply are hand-rolled for that reason.
    if (loaded.session.status !== 'active') {
      return {
        ok: false,
        reason: 'not-active',
        message: `Session is ${loaded.session.status}; only active sessions can be interjected into.`,
      }
    }

    // A failed turn must stay the most recent turn — the scheduler and
    // retry-last both rely on it — so the note waits until it is repaired.
    const last = latestTurn(loaded.turns)
    if (last !== null && last.status === 'failed') {
      return {
        ok: false,
        reason: 'awaiting-retry',
        message: 'The most recent turn failed; retry it before adding an interjection.',
      }
    }

    const turn = await insertTurn({
      sessionId,
      seq: nextTurnSeq(loaded.state.turns),
      kind: 'interjection',
      // The convener is not in the roster; `formatTurn` labels the turn.
      speakerName: null,
      round: currentRound(loaded.state),
      content,
      status: 'complete',
      error: null,
      model: null,
      promptTokens: null,
      completionTokens: null,
    })

    // No `bumpTurnCursor`: nothing was generated. The session is still touched
    // so the sessions list, which orders by `updated_at`, stays honest.
    return { ok: true, turn, session: await touchSession(sessionId) }
  })

  return outcome.locked ? LOCKED : outcome.value
}

/**
 * Replace the latest *complete* persona or synthesis turn with a fresh
 * generation, keeping its transcript slot (PRD §5.1).
 *
 * Only the latest turn may be regenerated, and the discarded text is not
 * retained in v2. A completed session must be reopened first — see the
 * module-level invariant.
 */
export async function regenerateLastTurn(sessionId: string): Promise<TurnResult> {
  const outcome = await withSessionLock(sessionId, async (): Promise<TurnResult> => {
    const loaded = await loadSession(sessionId)
    if (!loaded) return notFoundResult(sessionId)

    const last = latestTurn(loaded.turns)
    if (!last) {
      return {
        ok: false,
        reason: 'nothing-to-regenerate',
        message: 'This session has no turns yet; there is nothing to regenerate.',
      }
    }
    if (last.kind === 'interjection') {
      return {
        ok: false,
        reason: 'nothing-to-regenerate',
        message:
          'The most recent turn is an interjection; it is convener-authored and was never generated.',
      }
    }
    if (last.status !== 'complete') {
      return {
        ok: false,
        reason: 'nothing-to-regenerate',
        message: 'The most recent turn failed; retry it instead of regenerating it.',
      }
    }

    // The full guard, with no exemption: the last turn is complete by
    // construction, so `awaiting-retry` cannot fire, and both `not-active` and
    // `cap-reached` stand. The scheduler's wording (which names the 60-turn cap)
    // is passed through rather than restated here.
    const check = canGenerate(loaded.state)
    if (!check.ok) return refusal(check)

    return regenerateTurnInPlace(loaded, last)
  })

  return outcome.locked ? LOCKED : outcome.value
}

/**
 * Reopen a completed session (PRD §5.1's "iterate" mechanic).
 *
 * The prior synthesis stays in the transcript — a session may hold several, and
 * the latest is the session's result. No turn is written and nothing is counted
 * against the cap; the session simply becomes advanceable again, including past
 * the round count its snapshot planned.
 *
 * Locked like the generating entry points so a reopen cannot land in the middle
 * of the synthesis that is still sealing the session.
 */
export async function reopenSession(sessionId: string): Promise<SessionActionResult> {
  const outcome = await withSessionLock(sessionId, async (): Promise<SessionActionResult> => {
    const loaded = await loadSession(sessionId)
    if (!loaded) return notFoundResult(sessionId)

    if (loaded.session.status !== 'completed') {
      return {
        ok: false,
        reason: 'not-completed',
        message: `Session is ${loaded.session.status}; only a completed session can be reopened.`,
      }
    }

    return { ok: true, session: await reopenSessionRow(sessionId) }
  })

  return outcome.locked ? LOCKED : outcome.value
}
