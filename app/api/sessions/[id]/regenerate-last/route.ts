/**
 * `POST /api/sessions/[id]/regenerate-last` — replace the latest *complete*
 * persona or synthesis turn in place (PRD §8).
 *
 * No request body: which turn is "last" is a property of the stored transcript,
 * not of the caller's claim. A 409 comes back when the latest turn failed (that
 * is retry-last) or is an interjection (nothing was generated).
 */
import { badRequest, serverError, turnFailureResponse } from '@/lib/api/http'
import { sessionIdSchema } from '@/lib/api/schemas'
import { regenerateLastTurn } from '@/lib/session/turns'

export const dynamic = 'force-dynamic'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const parsed = sessionIdSchema.safeParse(id)
    if (!parsed.success) {
      return badRequest('Invalid session id.', parsed.error.issues)
    }

    const result = await regenerateLastTurn(parsed.data)
    if (!result.ok) {
      return turnFailureResponse(result)
    }

    // The turn keeps its id and its `seq`; the replaced text is not retained.
    return Response.json(result)
  } catch (error) {
    return serverError(error)
  }
}
