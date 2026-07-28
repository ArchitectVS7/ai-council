/**
 * Turning a refused request into the sentence a client component shows.
 *
 * The counterpart of `lib/api/http.ts`: that module writes the `{error, issues}`
 * envelope on the server, this one reads it in the browser. Extracted here once
 * `/councils` (T-023) would have been the third copy — the home form, the
 * persona library, and the councils builder all say failures the same way.
 *
 * Client-safe by construction: no server import, no React, no `fetch` of its
 * own. The rule it encodes is R4 — the server's own words are shown, and a
 * response that carries none is reported as a refusal with its status code
 * rather than smoothed over.
 */

/** The error envelope every route handler returns (`lib/api/http.ts`). */
export type ErrorBody = { error?: string; issues?: { message?: string }[] }

/** A thrown value as a sentence — a network failure has no envelope to read. */
export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** The server's own words, with zod's issue messages appended when it sent any. */
export function describeFailure(body: ErrorBody | null, status: number): string {
  const base = body?.error ?? `The server refused the request (HTTP ${status}).`
  const issues = Array.isArray(body?.issues)
    ? body.issues
        .map((issue) => issue?.message)
        .filter((message): message is string => typeof message === 'string' && message.length > 0)
    : []
  return issues.length === 0 ? base : `${base} ${issues.join(' ')}`
}

/** Parse an error response, tolerating a body that is not JSON at all. */
export async function readErrorBody(response: Response): Promise<ErrorBody | null> {
  return (await response.json().catch(() => null)) as ErrorBody | null
}
