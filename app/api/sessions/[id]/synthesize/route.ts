/**
 * `POST /api/sessions/[id]/synthesize` — The Chair writes the synthesis,
 * streamed, and the session is marked completed (PRD §8).
 *
 * No request body: the Chair, the round, and the transcript slot are all
 * derived server-side. A failed synthesis leaves the session active, and the
 * session row on the terminal `turn` event is what the client should believe
 * about its status.
 */
import { badRequest, serverError } from '@/lib/api/http'
import { sessionIdSchema } from '@/lib/api/schemas'
import { turnStreamResponse } from '@/lib/api/turn-stream'
import { synthesizeSessionStream } from '@/lib/session/turns'

export const dynamic = 'force-dynamic'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const parsed = sessionIdSchema.safeParse(id)
    if (!parsed.success) {
      return badRequest('Invalid session id.', parsed.error.issues)
    }

    const controller = new AbortController()
    return await turnStreamResponse(
      synthesizeSessionStream(parsed.data, controller.signal),
      request.signal,
      () => controller.abort(),
    )
  } catch (error) {
    return serverError(error)
  }
}
