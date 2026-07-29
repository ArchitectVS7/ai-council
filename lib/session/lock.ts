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
 * Takes the session's lock, or reports that it is already held.
 *
 * The primitive form, for the streaming turn generators (T-030): an async
 * generator cannot be wrapped in a callback, because the lock has to stay held
 * across every `yield` until the turn is persisted. Returns the release
 * function, which is idempotent — calling it twice can never free a lock a
 * later caller has since taken.
 */
export function acquireSessionLock(sessionId: string): (() => void) | null {
  if (inFlight.has(sessionId)) return null

  inFlight.add(sessionId)
  let released = false
  return () => {
    if (released) return
    released = true
    inFlight.delete(sessionId)
  }
}

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
  const release = acquireSessionLock(sessionId)
  if (release === null) return { locked: true }

  try {
    return { locked: false, value: await run() }
  } finally {
    release()
  }
}
