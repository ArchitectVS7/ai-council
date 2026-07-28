import 'server-only'

/**
 * Per-session in-flight generation lock (PRD §8: "409 if locked").
 *
 * Held in module scope, so it is per-process. That is deliberate and sufficient
 * for the single-user app the PRD describes: §8 already settles for an in-memory
 * per-IP rate limiter for the same reason, and PRD §7 is final at five tables —
 * a `locked_at` column would be a schema addition requiring the PRD to be
 * amended first (R1). Its job is to stop the convener's own double-click (or a
 * "Run round" loop racing itself) from deriving the same speaker twice, which is
 * a same-process race.
 *
 * The lock is never persisted and never survives a restart, so a crashed
 * generation cannot wedge a session permanently.
 */

const inFlight = new Set<string>()

/**
 * Runs `run` while holding the session's lock.
 *
 * Returns `{ locked: true }` without calling `run` when a generation is already
 * in flight for that session — the caller turns that into a 409. The lock is
 * released in `finally`, including when `run` throws; the throw propagates so
 * nothing is swallowed (R4).
 */
export async function withSessionLock<T>(
  sessionId: string,
  run: () => Promise<T>,
): Promise<{ locked: true } | { locked: false; value: T }> {
  if (inFlight.has(sessionId)) return { locked: true }

  inFlight.add(sessionId)
  try {
    return { locked: false, value: await run() }
  } finally {
    inFlight.delete(sessionId)
  }
}
