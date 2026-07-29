import 'server-only'

/**
 * Turns a streamed generation into an HTTP response (T-030).
 *
 * PRD §8's endpoint list is normative and complete, so streaming is a change of
 * *media type* on `advance` and `synthesize`, not a new route. The first event
 * decides which response the caller gets, and the two are deliberately different
 * kinds of answer:
 *
 * - `refused` → the PRD §8 status code (409 / 422 / 404) with the usual JSON
 *   `{error}` envelope. A refusal must never be smuggled inside a 200 stream:
 *   the chamber and the route contract both read the status.
 * - `accepted` → 200 `text/event-stream`, in which a provider failure arrives as
 *   a `failed` turn on the terminal `turn` event (PRD §5.4).
 *
 * The pump keeps draining the generator after the client has gone. That is the
 * whole point: the turn — including an aborted one — is persisted by the service
 * *after* the stream ends, so abandoning the generator would lose the write.
 */
import { turnFailureResponse } from '@/lib/api/http'
import type { TurnStreamEvent } from '@/lib/session/turns'
import { encodeServerEvent } from '@/lib/sse'

const encoder = new TextEncoder()

export async function turnStreamResponse(
  events: AsyncGenerator<TurnStreamEvent>,
  clientSignal: AbortSignal,
  abort: () => void,
): Promise<Response> {
  const first = await events.next()

  if (first.done) {
    // R4: a generator that yields nothing is a bug, not an empty turn.
    throw new Error('The turn stream ended without emitting an event.')
  }

  if (first.value.type === 'refused') {
    // Releases the service's session lock via the generator's `finally`.
    await events.return(undefined)
    return turnFailureResponse(first.value)
  }

  const opening = first.value
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      void pump(controller, opening, events)
    },
    cancel() {
      abort()
    },
  })

  // Client disconnect and stream cancellation feed the same abort, so the
  // service records one reason for both. Checked as well as listened for: a
  // request cancelled while the guards were still running would otherwise never
  // fire the event and the generation would run on unwatched.
  if (clientSignal.aborted) abort()
  else clientSignal.addEventListener('abort', abort)

  return new Response(body, {
    status: 200,
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-store, no-transform',
      connection: 'keep-alive',
      // Tells a reverse proxy not to buffer, which would defeat the point.
      'x-accel-buffering': 'no',
    },
  })
}

async function pump(
  controller: ReadableStreamDefaultController<Uint8Array>,
  opening: TurnStreamEvent,
  events: AsyncGenerator<TurnStreamEvent>,
): Promise<void> {
  const send = (name: string, data: unknown): void => {
    try {
      controller.enqueue(encoder.encode(encodeServerEvent(name, data)))
    } catch {
      // The client is gone. Swallowed here and only here, so the loop below
      // keeps draining and the turn is still written.
    }
  }

  send(opening.type, opening)

  try {
    for await (const event of events) send(event.type, event)
  } catch (error) {
    // The status line is long gone, so the only way to tell the client is a
    // frame. It is logged in full as well (R4: nothing is swallowed silently).
    console.error(error)
    send('error', { error: error instanceof Error ? error.message : String(error) })
  } finally {
    try {
      controller.close()
    } catch {
      // Already closed by a cancelled stream.
    }
  }
}
