/**
 * `POST /api/sessions/[id]/interject` — add a convener turn `{content}` to the
 * transcript (PRD §8).
 *
 * The content is the only thing the caller may supply: the transcript slot and
 * the round the note lands in are derived from persisted state, and the note
 * consumes no persona's turn.
 */
import { badRequest, serverError, turnFailureResponse } from '@/lib/api/http'
import { interjectSchema, sessionIdSchema } from '@/lib/api/schemas'
import { addInterjection } from '@/lib/session/turns'

export const dynamic = 'force-dynamic'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const parsedId = sessionIdSchema.safeParse(id)
    if (!parsedId.success) {
      return badRequest('Invalid session id.', parsedId.error.issues)
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return badRequest('Request body must be valid JSON.')
    }

    const parsed = interjectSchema.safeParse(body)
    if (!parsed.success) {
      return badRequest('Invalid request body.', parsed.error.issues)
    }

    const result = await addInterjection(parsedId.data, parsed.data.content)
    if (!result.ok) {
      return turnFailureResponse(result)
    }

    return Response.json(result)
  } catch (error) {
    return serverError(error)
  }
}
