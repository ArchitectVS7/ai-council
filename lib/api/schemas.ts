/**
 * Request validation for the session route handlers (PRD §8: "All request
 * bodies validated with zod").
 *
 * These live outside the route files for two reasons: a Next route module may
 * only export the HTTP verbs and its own config, and the schemas have to be
 * unit-testable on their own.
 */
import { z } from 'zod'

import {
  MAX_COUNCIL_MEMBERS,
  MAX_ROUNDS,
  MIN_COUNCIL_MEMBERS,
  MIN_ROUNDS,
} from '@/lib/council/snapshot'

/**
 * `POST /api/sessions`. Strict: an unknown key is a caller mistake and is
 * reported rather than ignored (R4). `rounds` is optional — when omitted the
 * council's own `default_rounds` applies (PRD §6, "rounds override").
 */
export const createSessionSchema = z.strictObject({
  topic: z.string().trim().min(1, 'Topic is required.').max(10_000),
  councilId: z.uuid('councilId must be a UUID.'),
  rounds: z.number().int().min(MIN_ROUNDS).max(MAX_ROUNDS).optional(),
})

/** `GET /api/sessions/[id]` — validated before it reaches Postgres, so a bad id is a 400 rather than a cast error. */
export const sessionIdSchema = z.uuid('Session id must be a UUID.')

/** `PUT`/`DELETE /api/personas/[id]` — a bad id is a 400 rather than a Postgres cast error. */
export const personaIdSchema = z.uuid('Persona id must be a UUID.')

/**
 * `POST /api/personas` (create) and `PUT /api/personas/[id]` (replace).
 *
 * One schema for both verbs: the editor on `/personas` is a whole-record form
 * that always sends all four fields, so a partial-update schema would be a
 * shape with no caller (R2). Strict for the same reason as `createSessionSchema`
 * — an unknown key is reported, never silently dropped.
 *
 * `archived` is deliberately not accepted: archiving is a server decision made
 * by `DELETE` when the persona is still referenced, never something the client
 * asks for (PRD §8).
 */
export const personaInputSchema = z.strictObject({
  name: z.string().trim().min(1, 'Name is required.').max(80),
  role: z
    .string()
    .trim()
    .min(1, 'Role is required.')
    .max(200)
    // PRD §6 screen 4 calls role "one line"; a newline would break the grid row.
    .refine((value) => !/[\r\n]/.test(value), 'Role must be a single line.'),
  charter: z.string().trim().min(1, 'Charter is required.').max(5_000),
  color: z.string().regex(/^#[0-9a-f]{6}$/i, 'Color must be a hex value like #2563eb.'),
})

/** `PUT`/`DELETE /api/councils/[id]` — a bad id is a 400 rather than a Postgres cast error. */
export const councilIdSchema = z.uuid('Council id must be a UUID.')

/** One seat of the submitted speaking order. The position is advisory — the server renumbers it. */
const councilMemberSchema = z.strictObject({
  personaId: z.uuid('Each member must reference a persona by UUID.'),
  position: z.number().int().min(0),
})

/**
 * `POST /api/councils` (create) and `PUT /api/councils/[id]` (replace).
 *
 * One schema for both verbs, for the same reason as `personaInputSchema`: the
 * editor on `/councils` is a whole-record form that always sends every field.
 *
 * The bounds are PRD §5.3's, imported from `lib/council/snapshot.ts` rather than
 * restated, so the builder and the snapshot builder can never disagree about
 * what a legal council is. `description` is a required key with a nullable value
 * — the form sends `null` when the box is blank, so "cleared" is expressible.
 *
 * `archived` is deliberately not accepted: archiving is a server decision made
 * by `DELETE` when the council is still referenced, never something the client
 * asks for (PRD §8).
 */
export const councilInputSchema = z.strictObject({
  name: z.string().trim().min(1, 'Name is required.').max(80),
  description: z.string().trim().max(1_000).nullable(),
  defaultRounds: z.number().int().min(MIN_ROUNDS).max(MAX_ROUNDS),
  members: z
    .array(councilMemberSchema)
    .min(MIN_COUNCIL_MEMBERS, `A council needs at least ${MIN_COUNCIL_MEMBERS} personas.`)
    .max(MAX_COUNCIL_MEMBERS, `A council may seat at most ${MAX_COUNCIL_MEMBERS} personas.`)
    .refine(
      (members) => new Set(members.map((member) => member.personaId)).size === members.length,
      'A persona may hold only one place in the speaking order.',
    ),
})

/**
 * `POST /api/sessions/[id]/interject`. The content is the whole body — who
 * speaks next and which round the note lands in are derived server-side, so
 * there is nothing else for the caller to say (PRD §5.1). Strict for the same
 * reason as above, and capped at the same 10,000 characters as `topic`: the note
 * is prepended to the prompt, and `lib/llm.ts` rejects over-length input anyway.
 */
export const interjectSchema = z.strictObject({
  content: z.string().trim().min(1, 'Interjection content is required.').max(10_000),
})
