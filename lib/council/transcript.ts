/**
 * Transcript rendering and the deterministic context budget (PRD §5.2, §5.4).
 *
 * "Include the topic, all Round-1 openings, all interjections and syntheses, and
 * the most recent turns up to a fixed character budget (default 24,000 chars).
 * If over budget, drop middle-round persona turns oldest-first. No LLM
 * summarization in v2 — deterministic truncation only."
 */
import type { TranscriptTurn } from './types'

/** PRD §5.2 default context budget, in characters, over topic + transcript. */
export const TRANSCRIPT_CHAR_BUDGET = 24_000

/** The label a user-authored interjection speaks under; the user is the convener. */
export const CONVENER_LABEL = 'Convener'

/** Blank line between rendered turns; counted against the budget per turn. */
const TURN_SEPARATOR = '\n\n'

export type BudgetedTranscript = {
  /** Included turns, ascending by `seq`. */
  turns: TranscriptTurn[]
  /** Seqs dropped to fit the budget. Failed turns are excluded, not "dropped". */
  droppedSeqs: number[]
  /** Characters accounted for: the topic plus every included rendered turn. */
  chars: number
}

/**
 * The single definition of a turn's rendered form, so budget accounting and the
 * prompt text can never disagree.
 */
export function formatTurn(turn: TranscriptTurn): string {
  const prefix = `[Round ${turn.round}]`
  if (turn.kind === 'interjection') {
    return `${prefix} ${CONVENER_LABEL} (interjection): ${turn.content}`
  }
  if (turn.speakerName === null || turn.speakerName === '') {
    throw new Error(`Turn ${turn.seq} of kind "${turn.kind}" has no speaker name.`)
  }
  if (turn.kind === 'synthesis') {
    return `${prefix} ${turn.speakerName} (synthesis): ${turn.content}`
  }
  return `${prefix} ${turn.speakerName}: ${turn.content}`
}

/** Protected turns are never dropped: openings, interjections and syntheses. */
function isProtected(turn: TranscriptTurn): boolean {
  return turn.kind !== 'persona' || turn.round === 1
}

function accountedChars(topic: string, turns: TranscriptTurn[]): number {
  return turns.reduce(
    (total, turn) => total + formatTurn(turn).length + TURN_SEPARATOR.length,
    topic.length,
  )
}

export function budgetTranscript(input: {
  topic: string
  turns: TranscriptTurn[]
  charBudget?: number
}): BudgetedTranscript {
  const budget = input.charBudget ?? TRANSCRIPT_CHAR_BUDGET

  // PRD §5.4: a failed turn is excluded from transcript context entirely. It was
  // never in the budget, so it is not reported as dropped.
  const included = input.turns
    .filter((turn) => turn.status !== 'failed')
    .slice()
    .sort((a, b) => a.seq - b.seq)

  // Oldest-first among middle-round persona turns, exactly as PRD §5.2 specifies.
  const droppable = included.filter((turn) => !isProtected(turn)).map((turn) => turn.seq)

  const dropped = new Set<number>()
  let chars = accountedChars(input.topic, included)

  for (const seq of droppable) {
    if (chars <= budget) break
    dropped.add(seq)
    chars = accountedChars(
      input.topic,
      included.filter((turn) => !dropped.has(turn.seq)),
    )
  }

  // Protected turns are kept even when they alone exceed the budget ("always
  // keep"). The over-budget `chars` is reported honestly rather than silently
  // mutilating content (R4).
  return {
    turns: included.filter((turn) => !dropped.has(turn.seq)),
    droppedSeqs: droppable.filter((seq) => dropped.has(seq)),
    chars,
  }
}
