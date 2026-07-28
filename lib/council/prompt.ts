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
 * Charter first, then the fixed rules of PRD §5.2. The engage-by-name rule is
 * omitted in round 1 (there is nothing to engage yet) and for the synthesis,
 * which addresses every member at once.
 */
export function buildSystemPrompt(input: {
  charter: string
  speakerName: string
  role: string
  round: number
  isSynthesis?: boolean
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

  return [input.charter.trim(), '', 'COUNCIL RULES:', ...rules.map((r) => `- ${r}`)].join('\n')
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
    `YOUR TASK (Round ${input.round}):`,
    ROUND_INSTRUCTIONS[input.kind],
  ].join('\n')

  return {
    system: buildSystemPrompt({
      charter: input.speaker.charter,
      speakerName: input.speaker.name,
      role: input.speaker.role,
      round: input.round,
      isSynthesis: input.kind === 'synthesis',
    }),
    prompt,
    maxTokens: input.kind === 'synthesis' ? SYNTHESIS_MAX_TOKENS : PERSONA_MAX_TOKENS,
    temperature: DEFAULT_TEMPERATURE,
    droppedSeqs: budgeted.droppedSeqs,
  }
}
