/**
 * `POST /api/sessions/[id]/synthesize` — The Chair writes the synthesis and the
 * session is marked completed (PRD §8).
 *
 * No request body: the Chair, the round, and the transcript slot are all
 * derived server-side.
 */
import { badRequest, serverError, turnFailureResponse } from '@/lib/api/http'
import { sessionIdSchema } from '@/lib/api/schemas'
import { synthesizeSession } from '@/lib/session/turns'

export const dynamic = 'force-dynamic'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const parsed = sessionIdSchema.safeParse(id)
    if (!parsed.success) {
      return badRequest('Invalid session id.', parsed.error.issues)
    }

    const result = await synthesizeSession(parsed.data)
    if (!result.ok) {
      return turnFailureResponse(result)
    }

    // A failed synthesis leaves the session active; the returned session row is
    // what the client should believe about its status.
    return Response.json(result)
  } catch (error) {
    return serverError(error)
  }
}
