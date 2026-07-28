/**
 * JSON error responses shared by the route handlers.
 *
 * Every failure path returns a body with an `error` string; nothing is
 * swallowed and no placeholder payload is ever substituted for real data (R4).
 */

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

/** 500 — logged in full on the server, message surfaced to the caller. */
export function serverError(error: unknown): Response {
  console.error(error)
  const message = error instanceof Error ? error.message : String(error)
  return Response.json({ error: message }, { status: 500 })
}
