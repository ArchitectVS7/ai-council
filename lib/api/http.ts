/**
 * JSON error responses shared by the route handlers.
 *
 * Every failure path returns a body with an `error` string; nothing is
 * swallowed and no placeholder payload is ever substituted for real data (R4).
 */

// Type-only: the reason union is defined next to the logic that produces it and
// is erased at compile time, so this file gains no runtime dependency on the
// server-only turn service and no import cycle.
import type { TurnFailureReason } from '@/lib/session/turns'

/** 400 — the caller's input is wrong. `issues` carries zod's issue list verbatim. */
export function badRequest(message: string, issues?: unknown): Response {
  return Response.json(issues === undefined ? { error: message } : { error: message, issues }, {
    status: 400,
  })
}

/** 404 — the referenced row does not exist. */
export function notFound(message: string): Response {
  return Response.json({ error: message }, { status: 404 })
}

/**
 * 422 — the request was well-formed but stored state cannot satisfy it (e.g. a
 * council whose membership violates the PRD §5.3 bounds). Distinct from 400 so
 * the caller can tell "you sent something wrong" from "that council is unusable".
 */
export function unprocessable(message: string): Response {
  return Response.json({ error: message }, { status: 422 })
}

/**
 * 409 — the request is fine but the session's current state forbids it: a
 * generation is already in flight, the session is completed or abandoned, or a
 * failed turn is waiting to be retried (PRD §8).
 */
export function conflict(message: string): Response {
  return Response.json({ error: message }, { status: 409 })
}

/**
 * Maps a refused turn generation onto its status code, passing the service's
 * message through verbatim.
 *
 * The 60-turn cap is a 422 rather than a 409 so the caller can tell "this
 * session is done growing" from the transient state conflicts above; both are
 * 4xx as PRD §5.3 requires. The `never` default makes a new refusal reason a
 * typecheck failure instead of a silent 500.
 */
export function turnFailureResponse(failure: {
  reason: TurnFailureReason
  message: string
}): Response {
  switch (failure.reason) {
    case 'invalid-session':
      return notFound(failure.message)
    case 'cap-reached':
      return unprocessable(failure.message)
    case 'locked':
    case 'not-active':
    case 'awaiting-retry':
    case 'nothing-to-retry':
    case 'nothing-to-synthesize':
      return conflict(failure.message)
    default: {
      const exhaustive: never = failure.reason
      throw new Error(`Unhandled turn failure reason: ${String(exhaustive)}`)
    }
  }
}

/** 500 — logged in full on the server, message surfaced to the caller. */
export function serverError(error: unknown): Response {
  console.error(error)
  const message = error instanceof Error ? error.message : String(error)
  return Response.json({ error: message }, { status: 500 })
}
