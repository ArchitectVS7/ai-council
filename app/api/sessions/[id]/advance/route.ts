/**
 * `POST /api/sessions/[id]/advance` — generate the next persona turn, streamed.
 *
 * No request body is read, and none is accepted: the server derives the
 * speaker, the round, and the transcript slot from persisted state (PRD §5.1).
 * All of that lives in `lib/session/turns.ts`; this file only decides between a
 * refusal status code and a `text/event-stream`, and that decision lives in
 * `lib/api/turn-stream.ts` so both generating routes make it identically.
 *
 * A turn whose `status` is `failed` is a successful request with a failed turn
 * in it: the provider's error is stored and streamed so the chamber can render
 * it next to Retry (PRD §5.4).
 */
import { badRequest, serverError } from '@/lib/api/http'
import { sessionIdSchema } from '@/lib/api/schemas'
import { turnStreamResponse } from '@/lib/api/turn-stream'
import { advanceSessionStream } from '@/lib/session/turns'

export const dynamic = 'force-dynamic'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const parsed = sessionIdSchema.safeParse(id)
    if (!parsed.success) {
      return badRequest('Invalid session id.', parsed.error.issues)
    }

    // Aborted when the convener pauses (the client drops the stream) or the
    // request itself is cancelled; the service records the reason on the turn.
    const controller = new AbortController()
    return await turnStreamResponse(
      advanceSessionStream(parsed.data, controller.signal),
      request.signal,
      () => controller.abort(),
    )
  } catch (error) {
    return serverError(error)
  }
}
