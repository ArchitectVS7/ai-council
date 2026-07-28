/**
 * `POST /api/sessions` — create a session, snapshotting its council.
 * `GET  /api/sessions` — list sessions, most recently active first.
 *
 * Database access goes exclusively through `lib/db/repo.ts`; snapshot
 * construction is the pure function in `lib/council/snapshot.ts` (PRD §8).
 */
import { badRequest, notFound, serverError, unprocessable } from '@/lib/api/http'
import { createSessionSchema } from '@/lib/api/schemas'
import { buildCouncilSnapshot } from '@/lib/council/snapshot'
import { findCouncilWithMembers, insertSession, listSessions } from '@/lib/db/repo'

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
