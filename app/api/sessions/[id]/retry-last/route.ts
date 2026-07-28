/**
 * `POST /api/sessions/[id]/retry-last` — regenerate the latest turn in place,
 * only when it failed (PRD §8).
 *
 * No request body: which turn is "last" is a property of the stored transcript,
 * not of the caller's claim.
 */
import { badRequest, serverError, turnFailureResponse } from '@/lib/api/http'
import { sessionIdSchema } from '@/lib/api/schemas'
import { retryLastTurn } from '@/lib/session/turns'

export const dynamic = 'force-dynamic'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const parsed = sessionIdSchema.safeParse(id)
    if (!parsed.success) {
      return badRequest('Invalid session id.', parsed.error.issues)
    }

    const result = await retryLastTurn(parsed.data)
    if (!result.ok) {
      return turnFailureResponse(result)
    }

    // The retried turn keeps its id and its `seq`; a second failure comes back
    // as another `failed` turn carrying the new provider error.
    return Response.json(result)
  } catch (error) {
    return serverError(error)
  }
}
