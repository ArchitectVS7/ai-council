/**
 * The SSE codec (T-030).
 *
 * Everything here feeds the real parser hand-built byte chunks, because the
 * failure mode that matters is a frame arriving split across a network read —
 * which no fixture that hands over one tidy string can ever reproduce.
 */
import { describe, expect, it } from 'vitest'

import { encodeServerEvent, readServerEvents } from './sse'

const encoder = new TextEncoder()

/** A byte source that hands back exactly the chunks given, in order. */
function source(chunks: string[]) {
  let index = 0
  return {
    getReader: () => ({
      read: async () =>
        index < chunks.length
          ? { done: false, value: encoder.encode(chunks[index++]) }
          : { done: true, value: undefined },
      releaseLock: () => {},
    }),
  }
}

async function collect(chunks: string[]): Promise<{ event: string; data: string }[]> {
  const frames: { event: string; data: string }[] = []
  for await (const frame of readServerEvents(source(chunks))) frames.push(frame)
  return frames
}

describe('readServerEvents', () => {
  it('reads whole frames from one chunk', async () => {
    expect(await collect(['event: delta\ndata: {"text":"hi"}\n\n'])).toEqual([
      { event: 'delta', data: '{"text":"hi"}' },
    ])
  })

  it('reassembles a frame split across arbitrary chunk boundaries', async () => {
    const whole = 'event: delta\ndata: {"text":"one"}\n\nevent: delta\ndata: {"text":"two"}\n\n'
    // Every single-character split of the same payload must parse identically.
    for (const size of [1, 3, 7, 11]) {
      const chunks: string[] = []
      for (let i = 0; i < whole.length; i += size) chunks.push(whole.slice(i, i + size))

      expect(await collect(chunks)).toEqual([
        { event: 'delta', data: '{"text":"one"}' },
        { event: 'delta', data: '{"text":"two"}' },
      ])
    }
  })

  it('joins several data lines in one frame with a newline', async () => {
    expect(await collect(['event: note\ndata: first\ndata: second\n\n'])).toEqual([
      { event: 'note', data: 'first\nsecond' },
    ])
  })

  it('ignores `:` keepalive comments', async () => {
    expect(await collect([': ping\n\n', 'event: turn\ndata: {}\n\n'])).toEqual([
      { event: 'turn', data: '{}' },
    ])
  })

  it('defaults a frame with no event line to `message`', async () => {
    expect(await collect(['data: [DONE]\n\n'])).toEqual([{ event: 'message', data: '[DONE]' }])
  })

  it('strips exactly one leading space after the field name', async () => {
    expect(await collect(['data:  two spaces\n\n'])).toEqual([{ event: 'message', data: ' two spaces' }])
  })

  it('accepts CRLF line endings', async () => {
    expect(await collect(['event: delta\r\ndata: hi\r\n\r\n'])).toEqual([{ event: 'delta', data: 'hi' }])
  })

  it('reassembles a CRLF frame whose CR and LF land in different chunks', async () => {
    expect(await collect(['event: delta\r\ndata: hi\r', '\n\r', '\n'])).toEqual([
      { event: 'delta', data: 'hi' },
    ])
  })

  it('discards an incomplete trailing frame rather than delivering half of it', async () => {
    expect(await collect(['event: delta\ndata: whole\n\nevent: delta\ndata: cut off'])).toEqual([
      { event: 'delta', data: 'whole' },
    ])
  })

  it('releases the reader even when the consumer stops early', async () => {
    let released = false
    const body = {
      getReader: () => ({
        read: async () => ({ done: false, value: encoder.encode('event: delta\ndata: a\n\n') }),
        releaseLock: () => {
          released = true
        },
      }),
    }

    for await (const frame of readServerEvents(body)) {
      expect(frame.data).toBe('a')
      break
    }

    expect(released).toBe(true)
  })
})

describe('encodeServerEvent', () => {
  it('round-trips through the parser', async () => {
    const payload = { type: 'delta', text: 'Line one\nLine two\twith a tab' }

    const frames = await collect([encodeServerEvent('delta', payload)])

    expect(frames).toHaveLength(1)
    expect(frames[0].event).toBe('delta')
    expect(JSON.parse(frames[0].data)).toEqual(payload)
  })

  it('never writes a raw newline into the data line, so a payload cannot forge a frame', () => {
    const encoded = encodeServerEvent('delta', { text: 'a\n\nb' })

    // Exactly one frame boundary: the terminator.
    expect(encoded.split('\n\n')).toHaveLength(2)
    expect(encoded.endsWith('\n\n')).toBe(true)
  })

  it('round-trips a whole run of frames written back to back', async () => {
    const written = [
      encodeServerEvent('accepted', { seq: 0, speakerName: 'The Skeptic' }),
      encodeServerEvent('delta', { text: 'one ' }),
      encodeServerEvent('delta', { text: 'two' }),
      encodeServerEvent('turn', { ok: true }),
    ].join('')

    const frames = await collect([written])

    expect(frames.map((f) => f.event)).toEqual(['accepted', 'delta', 'delta', 'turn'])
    expect(
      frames
        .filter((f) => f.event === 'delta')
        .map((f) => (JSON.parse(f.data) as { text: string }).text)
        .join(''),
    ).toBe('one two')
  })
})
