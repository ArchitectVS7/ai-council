/**
 * `POST /api/sessions/[id]/reopen` — completed → active (PRD §8).
 *
 * No request body and no turn in the response: reopening writes nothing to the
 * transcript, and the prior synthesis stays exactly where it is.
 */
import { badRequest, serverError, turnFailureResponse } from '@/lib/api/http'
import { sessionIdSchema } from '@/lib/api/schemas'
import { reopenSession } from '@/lib/session/turns'

export const dynamic = 'force-dynamic'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const parsed = sessionIdSchema.safeParse(id)
    if (!parsed.success) {
      return badRequest('Invalid session id.', parsed.error.issues)
    }

    const result = await reopenSession(parsed.data)
    if (!result.ok) {
      return turnFailureResponse(result)
    }

    return Response.json(result)
  } catch (error) {
    return serverError(error)
  }
}
