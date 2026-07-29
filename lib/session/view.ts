import 'server-only'

/**
 * The payload behind `GET /api/sessions/[id]` and the `/sessions/[id]` server
 * shell (PRD §6, T-013).
 *
 * It exists so two rules can both hold at once. Route files reach the database
 * only through `lib/db/repo.ts` and never import a provider module
 * (`lib/db/repo.test.ts` enforces both statically), yet the chamber has to know
 * whether the server is running the mock provider so it can show the MOCK MODE
 * badge. Reading `getProviderName()` here keeps the route thin and keeps the
 * provider import out of it.
 *
 * It is also the single shape the chamber ever sees: the page renders from it
 * on the server, and every client refetch reads the identical payload from the
 * API, so there is no second, divergent projection of a session.
 */
import { findSessionWithTurns } from '@/lib/db/repo'
import type { SessionRow, TurnRow } from '@/lib/db/repo'
import { getModel, getProviderName } from '@/lib/llm'

export type SessionView = {
  session: SessionRow
  turns: TurnRow[]
  /** True only under `LLM_PROVIDER=mock` — the one place mock output is allowed (R4). */
  mockMode: boolean
  /**
   * True only under `LLM_PROVIDER=local`: the turns were generated on the
   * operator's own machine (PRD Amendment A2), which the chamber marks with a
   * neutral LOCAL indicator beside the model. Unrelated to `mockMode` — local
   * output is real model output, so it carries no warning badge.
   */
  localMode: boolean
  /**
   * The app default model, so the chamber can show the *effective* model of a
   * session that set no override of its own (PRD Amendment A1). A resolved
   * public model id and nothing else — no key material leaves the server.
   *
   * The provider *name* is deliberately not added here: the chamber's only
   * provider-dependent behaviours are the mock badge and the local indicator,
   * which the two booleans above already carry, and a field with no consumer is
   * code without a caller (R2).
   * The `/` form, which does need the name, reads it in its own server
   * component by the same mechanism.
   */
  defaultModel: string
}

/** A session plus its transcript and the provider flags, or null when the id is unknown. */
export async function loadSessionView(sessionId: string): Promise<SessionView | null> {
  const found = await findSessionWithTurns(sessionId)
  if (!found) return null

  // `getProviderName()` throws on an unreadable `LLM_PROVIDER`. That is operator
  // misconfiguration and must surface as a logged 500, not as a quietly
  // un-badged page (R4), so it is deliberately not caught here. `getModel()` is
  // called with no argument on purpose — this is the app default, not the
  // session's override, which the chamber reads off the session row itself.
  const provider = getProviderName()
  return {
    ...found,
    mockMode: provider === 'mock',
    localMode: provider === 'local',
    defaultModel: getModel(),
  }
}
