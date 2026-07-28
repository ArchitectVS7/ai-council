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
import { getProviderName } from '@/lib/llm'

export type SessionView = {
  session: SessionRow
  turns: TurnRow[]
  /** True only under `LLM_PROVIDER=mock` — the one place mock output is allowed (R4). */
  mockMode: boolean
}

/** A session plus its transcript and the provider flag, or null when the id is unknown. */
export async function loadSessionView(sessionId: string): Promise<SessionView | null> {
  const found = await findSessionWithTurns(sessionId)
  if (!found) return null

  // `getProviderName()` throws on an unreadable `LLM_PROVIDER`. That is operator
  // misconfiguration and must surface as a logged 500, not as a quietly
  // un-badged page (R4), so it is deliberately not caught here.
  return { ...found, mockMode: getProviderName() === 'mock' }
}
