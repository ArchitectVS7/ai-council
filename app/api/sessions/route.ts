/**
 * `POST /api/sessions` — create a session, snapshotting its council.
 * `GET  /api/sessions` — list sessions, most recently active first.
 *
 * Database access goes exclusively through `lib/db/repo.ts`; snapshot
 * construction is the pure function in `lib/council/snapshot.ts` (PRD §8).
 *
 * `POST` also accepts a session document (T-031). Importing one is a *create*
 * that arrives with its transcript already attached, so it enters here rather
 * than through a route PRD §8's complete list does not name.
 */
import { badRequest, notFound, serverError, unprocessable } from '@/lib/api/http'
import { createSessionSchema } from '@/lib/api/schemas'
import { buildCouncilSnapshot } from '@/lib/council/snapshot'
import { findCouncilWithMembers, insertImportedSession, insertSession, listSessions } from '@/lib/db/repo'
import { sessionDocumentSchema } from '@/lib/transfer/schema'

// Handlers read the database on every request; nothing here may be evaluated at
// build time, where `DATABASE_URL` is deliberately absent.
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return badRequest('Request body must be valid JSON.')
    }

    // `schemaVersion` is the discriminator: only a session document carries it,
    // and the ordinary create schema is strict, so the two shapes cannot be
    // confused for one another.
    if (typeof body === 'object' && body !== null && 'schemaVersion' in body) {
      const document = sessionDocumentSchema.safeParse(body)
      if (!document.success) {
        return badRequest('Invalid session document.', document.error.issues)
      }
      // Status, turn cursor, and every timestamp are preserved exactly as the
      // document carried them; nothing about the imported session is re-derived.
      // `schemaVersion` is a wire concern and is deliberately not stored.
      const session = await insertImportedSession({
        session: document.data.session,
        turns: document.data.turns,
      })
      return Response.json({ session }, { status: 201 })
    }

    const parsed = createSessionSchema.safeParse(body)
    if (!parsed.success) {
      return badRequest('Invalid request body.', parsed.error.issues)
    }
    const { topic, councilId, rounds, model } = parsed.data

    const council = await findCouncilWithMembers(councilId)
    if (!council) {
      return notFound(`Council ${councilId} not found.`)
    }

    const result = buildCouncilSnapshot(council, rounds)
    if (!result.ok) {
      return unprocessable(result.message)
    }

    // `model` is stored once, at creation (PRD Amendment A1). Every later turn
    // reads it back from the row — the client never names a model again.
    const session = await insertSession({ topic, councilId, model, snapshot: result.snapshot })
    return Response.json({ session }, { status: 201 })
  } catch (error) {
    return serverError(error)
  }
}

export async function GET() {
  try {
    return Response.json({ sessions: await listSessions() })
  } catch (error) {
    return serverError(error)
  }
}
