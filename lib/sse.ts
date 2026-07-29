/**
 * The Server-Sent Events codec (T-030).
 *
 * One module, two directions, so the bytes a turn stream writes and the bytes a
 * reader parses can never disagree about the format:
 *
 * - `encodeServerEvent` writes the frames `lib/api/turn-stream.ts` sends to the
 *   chamber.
 * - `readServerEvents` parses the frames `lib/llm.ts` receives from Anthropic
 *   and OpenAI, *and* the frames `lib/chamber/stream.ts` receives from this
 *   app's own `advance`/`synthesize` endpoints.
 *
 * Client-safe by construction: no imports at all, no `server-only`, no `fetch`.
 *
 * Deliberately strict about the wire format rather than forgiving (R4): an
 * incomplete trailing frame is discarded, exactly as the SSE specification
 * requires, instead of being guessed at and delivered as if it were whole.
 */

/**
 * The smallest shape a byte source needs for `readServerEvents`.
 *
 * A structural type rather than `ReadableStream<Uint8Array>` so a unit test can
 * feed the real parser a hand-built reader without a platform stream — jsdom has
 * no dependable `ReadableStream`. A genuine `Response.body` satisfies it.
 */
type ByteSource = {
  getReader(): {
    read(): Promise<{ done: boolean; value?: Uint8Array }>
    releaseLock(): void
  }
}

/** One decoded frame. `event` defaults to `message` when the frame names none. */
type ServerEvent = { event: string; data: string }

/**
 * Encodes one frame.
 *
 * `data` is JSON, which can never contain a raw newline, so a payload can never
 * be split across frames or forge a frame boundary of its own.
 */
export function encodeServerEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

/**
 * Decodes a byte stream into frames as they arrive.
 *
 * Handles the parts of the format that actually vary between servers: frames
 * split across arbitrary chunk boundaries, `:` keepalive comments, several
 * `data:` lines per frame (joined with a newline), CRLF line endings, and a
 * missing `event:` line.
 */
export async function* readServerEvents(body: ByteSource): AsyncGenerator<ServerEvent> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      if (value === undefined) continue

      buffer += decoder.decode(value, { stream: true })
      // A lone trailing CR is left in place: it can only be the first half of a
      // CRLF whose LF is in the next chunk, and it cannot forge a frame boundary.
      buffer = buffer.replace(/\r\n/g, '\n')

      let boundary = buffer.indexOf('\n\n')
      while (boundary !== -1) {
        const frame = parseFrame(buffer.slice(0, boundary))
        buffer = buffer.slice(boundary + 2)
        if (frame !== null) yield frame
        boundary = buffer.indexOf('\n\n')
      }
    }
    // Whatever is left in `buffer` is an incomplete frame. The SSE spec
    // discards it, and so does this: half a frame is not data.
  } finally {
    reader.releaseLock()
  }
}

function parseFrame(frame: string): ServerEvent | null {
  let event = 'message'
  const data: string[] = []

  for (const line of frame.split('\n')) {
    // Blank lines and `:` comments (keepalives) carry nothing.
    if (line.length === 0 || line.startsWith(':')) continue

    const colon = line.indexOf(':')
    const field = colon === -1 ? line : line.slice(0, colon)
    const raw = colon === -1 ? '' : line.slice(colon + 1)
    const value = raw.startsWith(' ') ? raw.slice(1) : raw

    if (field === 'event') event = value
    else if (field === 'data') data.push(value)
  }

  if (event === 'message' && data.length === 0) return null
  return { event, data: data.join('\n') }
}
