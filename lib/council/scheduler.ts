/**
 * Speaker scheduling — server-authoritative (PRD §5.1, §5.3).
 *
 * The next speaker is derived from the council snapshot plus the persisted
 * transcript and generated-turn count. Nothing here is client-supplied, and
 * nothing here touches the database or a provider.
 */
import type { SessionState, TranscriptTurn } from './types'

/** PRD §5.3: "Hard cap: 60 generated turns per session (including regenerations)." */
export const MAX_GENERATED_TURNS = 60

/** Module-local until a caller names it (R2 / knip); surfaced via the unions below. */
type RefusalReason = 'session-not-active' | 'awaiting-retry' | 'cap-reached'

export type GenerationCheck =
  | { ok: true }
  | { ok: false; reason: RefusalReason; message: string }

export type SpeakerDecision =
  | { ok: false; reason: RefusalReason; message: string }
  | {
      ok: true
      speakerName: string
      memberIndex: number
      round: number
      seq: number
      roundType: 'opening' | 'rebuttal'
      /** True when this speaker opens a round (first member of the order). */
      atRoundStart: boolean
      /** True when the session has already run every round its snapshot planned. */
      plannedRoundsComplete: boolean
    }

/**
 * Only completed persona turns consume a speaking slot. Interjections and
 * syntheses occupy a transcript `seq` but no persona's turn (PRD §5.1), and a
 * failed turn is retried in place rather than skipped (PRD §5.4).
 */
function completedPersonaTurns(turns: TranscriptTurn[]): number {
  return turns.filter((t) => t.kind === 'persona' && t.status === 'complete').length
}

function memberCount(state: SessionState): number {
  const count = state.snapshot.members.length
  if (count === 0) {
    throw new Error('Council snapshot has no members; cannot schedule a speaker.')
  }
  return count
}

/**
 * The round the next generated turn belongs to, and the round to stamp on an
 * interjection or synthesis. One-based.
 */
export function currentRound(state: SessionState): number {
  return Math.floor(completedPersonaTurns(state.turns) / memberCount(state)) + 1
}

/** The next free transcript slot. Sequences are dense and start at 0. */
export function nextTurnSeq(turns: TranscriptTurn[]): number {
  if (turns.length === 0) return 0
  return Math.max(...turns.map((t) => t.seq)) + 1
}

/**
 * The guard shared by every generating endpoint (advance, synthesize, retry,
 * regenerate). Refusal reasons are typed and carry the user-facing message that
 * T-012 returns verbatim in the 4xx/409 body — nothing is guessed or silently
 * degraded (R4).
 */
export function canGenerate(state: SessionState): GenerationCheck {
  if (state.status !== 'active') {
    return {
      ok: false,
      reason: 'session-not-active',
      message: `Session is ${state.status}; only active sessions can generate turns.`,
    }
  }
  if (state.generatedTurns >= MAX_GENERATED_TURNS) {
    return {
      ok: false,
      reason: 'cap-reached',
      message: `Session turn cap reached (${MAX_GENERATED_TURNS} generated turns).`,
    }
  }
  // A failed turn is always the most recent one, because generation is blocked
  // until it is retried in place. That invariant keeps the slot accounting above
  // unambiguous: there is never a stale failed turn mid-transcript.
  const last = state.turns.reduce<TranscriptTurn | null>(
    (acc, t) => (acc === null || t.seq > acc.seq ? t : acc),
    null,
  )
  if (last !== null && last.status === 'failed') {
    return {
      ok: false,
      reason: 'awaiting-retry',
      message: 'The most recent turn failed; retry it before generating another turn.',
    }
  }
  return { ok: true }
}

/**
 * Derive who speaks next, in which round, and into which transcript slot.
 *
 * Running past `snapshot.rounds` is deliberately allowed rather than refused:
 * PRD §5.1 offers "run next round | synthesize | abandon" at every boundary and
 * reopen explicitly permits further rounds. The boundary is reported via
 * `plannedRoundsComplete` so the UI can prompt; the only hard stops are session
 * status, a pending failed turn, and the 60-turn cap.
 */
export function nextSpeaker(state: SessionState): SpeakerDecision {
  const check = canGenerate(state)
  if (!check.ok) return check

  const members = memberCount(state)
  const spoken = completedPersonaTurns(state.turns)
  const memberIndex = spoken % members
  const round = Math.floor(spoken / members) + 1

  return {
    ok: true,
    speakerName: state.snapshot.members[memberIndex].name,
    memberIndex,
    round,
    seq: nextTurnSeq(state.turns),
    roundType: round === 1 ? 'opening' : 'rebuttal',
    atRoundStart: memberIndex === 0,
    plannedRoundsComplete: round > state.snapshot.rounds,
  }
}
