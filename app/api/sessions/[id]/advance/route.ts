/**
 * `POST /api/sessions/[id]/advance` — generate the next persona turn.
 *
 * No request body is read, and none is accepted: the server derives the
 * speaker, the round, and the transcript slot from persisted state (PRD §5.1).
 * All of that lives in `lib/session/turns.ts`; this file only turns a typed
 * result into a status code.
 */
import { badRequest, serverError, turnFailureResponse } from '@/lib/api/http'
import { sessionIdSchema } from '@/lib/api/schemas'
import { advanceSession } from '@/lib/session/turns'

export const dynamic = 'force-dynamic'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const parsed = sessionIdSchema.safeParse(id)
    if (!parsed.success) {
      return badRequest('Invalid session id.', parsed.error.issues)
    }

    const result = await advanceSession(parsed.data)
    if (!result.ok) {
      return turnFailureResponse(result)
    }

    // A turn whose `status` is `failed` is a successful request with a failed
    // turn in it: the provider's error is stored and returned so the chamber can
    // render it next to Retry (PRD §5.4).
    return Response.json(result)
  } catch (error) {
    return serverError(error)
  }
}
