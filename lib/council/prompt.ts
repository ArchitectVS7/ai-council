/**
 * Prompt construction for a generated turn (PRD §5.2).
 *
 * Pure: data in, strings out. No provider or database imports — the built object
 * is *structurally* assignable to `lib/llm`'s `GenerateOptions`, and drift is
 * caught by typecheck at the T-012 call site rather than by an import here.
 *
 * Glossary note (PRD §3): `ROUND_INSTRUCTIONS` reproduces PRD §5.2's in-prompt
 * copy verbatim, which is ordinary prose addressed to the model, not a code, UI
 * or DB noun for an entity. `lib/council/purity.test.ts` pins that exemption to
 * those literals alone. Everywhere else this module says council / session /
 * turn / round / interjection / synthesis / the Chair.
 */
import type { CouncilSnapshot, CouncilSnapshotMember, TranscriptTurn } from './types'

import { budgetTranscript, formatTurn } from './transcript'

/** PRD §5.2 defaults. */
export const MAX_WORDS_PER_TURN = 300
export const PERSONA_MAX_TOKENS = 700
export const SYNTHESIS_MAX_TOKENS = 1200
export const DEFAULT_TEMPERATURE = 0.7

export type RoundType = 'opening' | 'rebuttal' | 'synthesis'

/** PRD §5.2's round-specific instructions, verbatim. */
export const ROUND_INSTRUCTIONS: Readonly<Record<RoundType, string>> = Object.freeze({
  opening: 'Give your opening position on the topic.',
  rebuttal:
    'Respond to the debate so far: rebut, concede, or build. Do not restate your opening.',
  synthesis:
    'Synthesize the debate: (1) points of agreement, (2) unresolved disagreements with the strongest argument on each side, (3) a concrete recommendation.',
})

const EMPTY_TRANSCRIPT_PLACEHOLDER = '(No turns yet. You speak first.)'

/**
 * Heading of the block that quotes the convener's pending interjection.
 * Exported so callers and tests assert against the constant rather than a
 * substring that could drift.
 */
export const CONVENER_NOTE_HEADING = "CONVENER'S LATEST NOTE"

/**
 * Heading of the council-level directive block (PRD §5.2, Amendment A3).
 * Exported for the same reason as `CONVENER_NOTE_HEADING`.
 */
export const COUNCIL_DIRECTIVE_HEADING = 'COUNCIL DIRECTIVE:'

/**
 * PRD §5.2: "Address the most recent interjection if one exists since your last
 * turn." The system prompt states that rule generically for every turn; this is
 * the explicit, text-referencing form added only when there is a note to address.
 */
export const ADDRESS_INTERJECTION_INSTRUCTION =
  "Address the convener's latest note above directly: acknowledge it explicitly and let it shape this response."

/**
 * The interjection this speaker has not answered yet, or null.
 *
 * "Since your last turn" (PRD §5.2) is read off the transcript: the newest
 * usable interjection with a `seq` above the speaker's own newest *complete*
 * turn. A speaker who has never spoken has no floor, so every interjection so
 * far is pending and the newest one wins. The Chair resolves the same way — its
 * previous syntheses carry its name in `speakerName`.
 *
 * Module-local: the prompt is the only thing that needs this, and an export
 * without a caller would be dead code (R2 / knip).
 */
function pendingInterjection(
  turns: TranscriptTurn[],
  speakerName: string,
): TranscriptTurn | null {
  let lastOwnSeq = -1
  for (const turn of turns) {
    if (turn.speakerName === speakerName && turn.status === 'complete' && turn.seq > lastOwnSeq) {
      lastOwnSeq = turn.seq
    }
  }

  let pending: TranscriptTurn | null = null
  for (const turn of turns) {
    if (turn.kind !== 'interjection' || turn.status === 'failed') continue
    if (turn.seq <= lastOwnSeq) continue
    if (pending === null || turn.seq > pending.seq) pending = turn
  }
  return pending
}

export type BuiltPrompt = {
  system: string
  prompt: string
  maxTokens: number
  temperature: number
  /** Seqs the budgeter dropped, so callers can log what the speaker did not see. */
  droppedSeqs: number[]
}

export type TurnPromptInput = {
  topic: string
  snapshot: CouncilSnapshot
  turns: TranscriptTurn[]
  /**
   * The member speaking. For `kind: 'synthesis'` the caller supplies the Chair —
   * this module never reaches for seed data.
   */
  speaker: CouncilSnapshotMember
  round: number
  kind: RoundType
  charBudget?: number
}

/**
 * Charter first, then the council directive when the session's snapshot carries
 * one (PRD §5.2, Amendment A3), then the fixed rules of PRD §5.2. The
 * engage-by-name rule is omitted in round 1 (there is nothing to engage yet) and
 * for the synthesis, which addresses every member at once.
 *
 * The directive block is omitted entirely — not emitted empty — when the council
 * has none, so a directive-less prompt is byte-identical to a pre-A3 one.
 */
export function buildSystemPrompt(input: {
  charter: string
  speakerName: string
  role: string
  round: number
  isSynthesis?: boolean
  /** From `council_snapshot.directive`; absent or null means no directive. */
  directive?: string | null
}): string {
  const isSynthesis = input.isSynthesis === true
  const rules: string[] = [
    `You are ${input.speakerName}, ${input.role}, a member of this council.`,
    'Stay in persona at all times. Never break character and never refer to the mechanics of this council or to being a language model.',
  ]

  if (!isSynthesis && input.round >= 2) {
    rules.push(
      'Engage at least one prior argument by persona name: name the council member you are responding to and quote or paraphrase their point before answering it.',
    )
  }
  if (isSynthesis) {
    rules.push(
      'Speak for the whole council: represent each member’s strongest argument fairly, naming them.',
    )
  }

  rules.push(
    'If the convener has interjected since your last turn, address that interjection directly.',
    `Be concise. Keep your response under ${MAX_WORDS_PER_TURN} words.`,
  )

  const directive = input.directive?.trim() ?? ''

  return [
    input.charter.trim(),
    ...(directive.length === 0 ? [] : ['', COUNCIL_DIRECTIVE_HEADING, directive]),
    '',
    'COUNCIL RULES:',
    ...rules.map((r) => `- ${r}`),
  ].join('\n')
}

function renderRoster(snapshot: CouncilSnapshot): string {
  return snapshot.members.map((m) => `- ${m.name} — ${m.role}`).join('\n')
}

/**
 * Build the system + user prompt for one generated turn.
 *
 * The roster block is deliberately outside the character budget: it is bounded
 * at eight short lines (PRD §5.3 caps a council at 8 personas) and it is what
 * makes the engage-by-name rule answerable. PRD §5.2 scopes the 24,000-char
 * budget to the topic plus the transcript.
 *
 * The convener's pending note is repeated verbatim between the transcript and
 * the task, immediately before the instruction to address it. That text is
 * already inside the transcript (the budgeter protects interjections from ever
 * being dropped), so the repetition is purely for salience, and like the roster
 * block it sits outside the 24,000-char budget — it is one short convener-
 * authored note, bounded by the same input validation as the topic.
 */
export function buildTurnPrompt(input: TurnPromptInput): BuiltPrompt {
  const budgeted = budgetTranscript({
    topic: input.topic,
    turns: input.turns,
    charBudget: input.charBudget,
  })

  const transcript =
    budgeted.turns.length === 0
      ? EMPTY_TRANSCRIPT_PLACEHOLDER
      : budgeted.turns.map(formatTurn).join('\n\n')

  const note = pendingInterjection(input.turns, input.speaker.name)

  const prompt = [
    'TOPIC:',
    input.topic,
    '',
    'COUNCIL (speaking order):',
    renderRoster(input.snapshot),
    '',
    'TRANSCRIPT:',
    transcript,
    '',
    ...(note === null ? [] : [`${CONVENER_NOTE_HEADING} (Round ${note.round}):`, note.content, '']),
    `YOUR TASK (Round ${input.round}):`,
    ROUND_INSTRUCTIONS[input.kind],
    ...(note === null ? [] : [ADDRESS_INTERJECTION_INSTRUCTION]),
  ].join('\n')

  return {
    system: buildSystemPrompt({
      charter: input.speaker.charter,
      speakerName: input.speaker.name,
      role: input.speaker.role,
      round: input.round,
      isSynthesis: input.kind === 'synthesis',
      // A3: the directive reaches every member, the Chair included — the Chair's
      // charter comes from the caller, the directive from the session snapshot.
      directive: input.snapshot.directive,
    }),
    prompt,
    maxTokens: input.kind === 'synthesis' ? SYNTHESIS_MAX_TOKENS : PERSONA_MAX_TOKENS,
    temperature: DEFAULT_TEMPERATURE,
    droppedSeqs: budgeted.droppedSeqs,
  }
}
