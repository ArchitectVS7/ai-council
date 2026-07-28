/**
 * Request validation for the session route handlers (PRD §8: "All request
 * bodies validated with zod").
 *
 * These live outside the route files for two reasons: a Next route module may
 * only export the HTTP verbs and its own config, and the schemas have to be
 * unit-testable on their own.
 */
import { z } from 'zod'

import { MAX_ROUNDS, MIN_ROUNDS } from '@/lib/council/snapshot'

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
