import 'server-only'

/**
 * Turn generation — advance, synthesize, retry-last (PRD §5.1, §5.3, §8).
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
  updateTurnInPlace,
} from '@/lib/db/repo'
import { generate, getModel } from '@/lib/llm'
import { CHAIR_PERSONA } from '@/lib/seed-data'

import { withSessionLock } from './lock'

/**
 * Why a generated turn was refused. Each value maps to exactly one status code
 * in `lib/api/http.ts`; the accompanying message is surfaced verbatim.
 */
export type TurnFailureReason =
  | 'invalid-session'
  | 'locked'
  | 'not-active'
  | 'awaiting-retry'
  | 'nothing-to-retry'
  | 'nothing-to-synthesize'
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
 * Retry the latest turn, in place, when — and only when — it failed.
 *
 * Replacing a *complete* turn is regenerate-last (T-020), a different endpoint
 * with different rules, so it is refused here rather than quietly allowed.
 */
export async function retryLastTurn(sessionId: string): Promise<TurnResult> {
  const outcome = await withSessionLock(sessionId, async (): Promise<TurnResult> => {
    const loaded = await loadSession(sessionId)
    if (!loaded) return notFoundResult(sessionId)

    const last = loaded.turns.reduce<TurnRow | null>(
      (acc, turn) => (acc === null || turn.seq > acc.seq ? turn : acc),
      null,
    )
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

    // The failed turn is excluded from the budgeted transcript by construction,
    // so the retry never sees its own empty slot.
    const built = buildTurnPrompt({
      topic: loaded.session.topic,
      snapshot: loaded.state.snapshot,
      turns: loaded.state.turns,
      speaker,
      round: last.round,
      kind,
    })

    // A retry is another generation attempt and counts toward the cap (PRD §5.3).
    const session = await bumpTurnCursor(sessionId)
    const generated: TurnPatch = await runProvider(built)
    const turn = await updateTurnInPlace(last.id, generated)

    if (turn.kind !== 'synthesis' || generated.status !== 'complete') {
      return { ok: true, turn, session }
    }
    return { ok: true, turn, session: await markSessionCompleted(sessionId) }
  })

  return outcome.locked ? LOCKED : outcome.value
}
