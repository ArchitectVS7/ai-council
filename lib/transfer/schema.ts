/**
 * The validator for an imported session document (T-031).
 *
 * Separate from `./document.ts` so the exporter stays free of zod: the chamber
 * imports the builder, only the server imports this. Every object is strict, so
 * an unknown key is *reported* rather than dropped — a silently discarded field
 * is exactly the kind of lossy import R4 forbids.
 *
 * The bounds are imported from the modules that own them (snapshot limits,
 * scheduler cap, model length) rather than restated, so this file cannot drift
 * away from what the rest of the app considers a legal session.
 *
 * Version policy (see `SESSION_DOCUMENT_VERSION`): an additive *optional* field
 * needs no bump; a removed or retyped field does.
 */
import { z } from 'zod'

import { MAX_GENERATED_TURNS } from '@/lib/council/scheduler'
import {
  MAX_COUNCIL_MEMBERS,
  MAX_DIRECTIVE_LENGTH,
  MAX_ROUNDS,
  MIN_COUNCIL_MEMBERS,
  MIN_ROUNDS,
} from '@/lib/council/snapshot'
import { MAX_MODEL_LENGTH } from '@/lib/models'

import { SESSION_DOCUMENT_VERSION } from './document'
import type { SessionDocument } from './document'

/**
 * A bounded archive. The 60-generated-turn cap plus convener interjections and
 * repeated syntheses cannot approach this, so it is a sanity bound on a hostile
 * file rather than a rule about sessions.
 */
const MAX_DOCUMENT_TURNS = 500

/** Long enough for any single turn; short enough that a file cannot be a payload. */
const MAX_TURN_CONTENT = 100_000

/**
 * A required, non-blank, bounded string.
 *
 * Checked with a refinement rather than zod's `.trim()`, which is a *transform*:
 * rewriting a value during import would make the round trip lossy for anything
 * whose whitespace happens to be meaningful. The parser's job here is to accept
 * or refuse, never to edit.
 */
function nonBlank(max: number, message: string) {
  return z
    .string()
    .max(max)
    .refine((value) => value.trim().length > 0, message)
}

const nullableModel = nonBlank(MAX_MODEL_LENGTH, 'Model must not be blank.').nullable()

const snapshotMemberSchema = z.strictObject({
  name: nonBlank(80, 'Each council member needs a name.'),
  role: nonBlank(200, 'Each council member needs a role.'),
  charter: nonBlank(5_000, 'Each council member needs a charter.'),
  color: z.string().regex(/^#[0-9a-f]{6}$/i, 'Color must be a hex value like #2563eb.'),
})

const snapshotSchema = z.strictObject({
  name: nonBlank(80, 'The council snapshot needs a name.'),
  rounds: z
    .int()
    .min(MIN_ROUNDS, `Rounds must be between ${MIN_ROUNDS} and ${MAX_ROUNDS}.`)
    .max(MAX_ROUNDS, `Rounds must be between ${MIN_ROUNDS} and ${MAX_ROUNDS}.`),
  // A3: optional because every snapshot frozen before the amendment omits it,
  // and because a directive-less council omits it too. Nullable as well, so a
  // hand-written document that spells the absence out still imports.
  directive: nonBlank(MAX_DIRECTIVE_LENGTH, 'A council directive must not be blank.')
    .nullable()
    .optional(),
  members: z
    .array(snapshotMemberSchema)
    .min(MIN_COUNCIL_MEMBERS, `A council needs at least ${MIN_COUNCIL_MEMBERS} personas.`)
    .max(MAX_COUNCIL_MEMBERS, `A council may seat at most ${MAX_COUNCIL_MEMBERS} personas.`),
})

const turnSchema = z.strictObject({
  seq: z.int().min(0, 'Turn seq must not be negative.'),
  kind: z.enum(['persona', 'interjection', 'synthesis']),
  speakerName: nonBlank(80, 'A speaker name must not be blank.').nullable(),
  // Deliberately not bounded by `snapshot.rounds`: a reopened session keeps
  // generating past its original round count (PRD §5.1).
  round: z.int().min(1, 'Turn round must be 1 or greater.'),
  content: z.string().max(MAX_TURN_CONTENT),
  status: z.enum(['complete', 'failed']),
  error: z.string().max(MAX_TURN_CONTENT).nullable(),
  model: nullableModel,
  promptTokens: z.int().min(0).nullable(),
  completionTokens: z.int().min(0).nullable(),
  createdAt: z.iso.datetime('Turn createdAt must be an ISO-8601 timestamp.'),
})

const sessionSchema = z.strictObject({
  topic: nonBlank(10_000, 'Topic is required.'),
  model: nullableModel,
  status: z.enum(['active', 'completed', 'abandoned']),
  turnCursor: z
    .int()
    .min(0, 'turnCursor must not be negative.')
    .max(MAX_GENERATED_TURNS, `turnCursor must not exceed the ${MAX_GENERATED_TURNS}-turn cap.`),
  createdAt: z.iso.datetime('Session createdAt must be an ISO-8601 timestamp.'),
  completedAt: z.iso.datetime('Session completedAt must be an ISO-8601 timestamp.').nullable(),
  councilSnapshot: snapshotSchema,
})

/**
 * The whole document.
 *
 * The `z.ZodType<SessionDocument>` annotation is a compile-time lockstep guard:
 * drop or retype a field here and the assignment stops typechecking against the
 * hand-written type in `./document.ts`. It cannot catch a field the *exporter*
 * never emits, which is what the key-parity test in `./schema.test.ts` is for.
 */
export const sessionDocumentSchema: z.ZodType<SessionDocument> = z
  .strictObject({
    schemaVersion: z.literal(
      SESSION_DOCUMENT_VERSION,
      `Unsupported schemaVersion; this build reads version ${SESSION_DOCUMENT_VERSION}.`,
    ),
    session: sessionSchema,
    turns: z.array(turnSchema).max(MAX_DOCUMENT_TURNS, 'The transcript is too long to import.'),
  })
  .superRefine((document, ctx) => {
    // A transcript is an ordered list; a repeated or out-of-order slot means the
    // file cannot be replayed into `UNIQUE(session_id, seq)` as written.
    let previous: number | null = null
    for (const turn of document.turns) {
      if (previous !== null && turn.seq <= previous) {
        ctx.addIssue({
          code: 'custom',
          path: ['turns'],
          message: 'Turn seq values must be unique and ascending.',
        })
        break
      }
      previous = turn.seq
    }

    const memberNames = new Set(document.session.councilSnapshot.members.map((m) => m.name))
    for (const turn of document.turns) {
      // PRD §7: an interjection is the convener speaking and has no persona.
      if (turn.kind === 'interjection') {
        if (turn.speakerName !== null) {
          ctx.addIssue({
            code: 'custom',
            path: ['turns'],
            message: `Turn ${turn.seq} is an interjection and must have no speaker name.`,
          })
        }
        continue
      }
      if (turn.speakerName === null) {
        ctx.addIssue({
          code: 'custom',
          path: ['turns'],
          message: `Turn ${turn.seq} is a ${turn.kind} turn and needs a speaker name.`,
        })
        continue
      }
      // Syntheses are exempt: the Chair sits in no speaking order, so the
      // synthesizer is deliberately absent from the snapshot's members.
      if (turn.kind === 'persona' && !memberNames.has(turn.speakerName)) {
        ctx.addIssue({
          code: 'custom',
          path: ['turns'],
          message: `Turn ${turn.seq} names a speaker that is not in the council snapshot.`,
        })
      }
    }

    if (document.session.status === 'completed' && document.session.completedAt === null) {
      ctx.addIssue({
        code: 'custom',
        path: ['session', 'completedAt'],
        message: 'A completed session must carry a completedAt timestamp.',
      })
    }
    // What `reopenSession` guarantees: reopening clears `completed_at`.
    if (document.session.status === 'active' && document.session.completedAt !== null) {
      ctx.addIssue({
        code: 'custom',
        path: ['session', 'completedAt'],
        message: 'An active session must not carry a completedAt timestamp.',
      })
    }
  })
