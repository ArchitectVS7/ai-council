/**
 * Reading a streamed turn (T-030), without a DOM.
 *
 * The response doubles are hand-built rather than platform `Response` objects,
 * because the interesting cases are the ones a real `fetch` cannot be made to
 * produce on demand: a body that stops half-way, and a reader that rejects the
 * moment the convener aborts.
 */
import { describe, expect, it, vi } from 'vitest'

import { encodeServerEvent } from '@/lib/sse'

import { requestTurnStream } from './stream'

const encoder = new TextEncoder()

const ACCEPTED = encodeServerEvent('accepted', {
  type: 'accepted',
  seq: 2,
  round: 1,
  kind: 'persona',
  speakerName: 'The Skeptic',
})
const TURN = encodeServerEvent('turn', {
  type: 'turn',
  result: { ok: true, turn: { id: 't-2', seq: 2, status: 'complete', content: 'Stored.' } },
})

function delta(text: string): string {
  return encodeServerEvent('delta', { type: 'delta', text })
}

/** A response whose body hands back the given frames and then ends. */
function sse(frames: string[]): Response {
  let index = 0
  return {
    ok: true,
    status: 200,
    body: {
      getReader: () => ({
        read: async () =>
          index < frames.length
            ? { done: false, value: encoder.encode(frames[index++]) }
            : { done: true, value: undefined },
        releaseLock: () => {},
      }),
    },
  } as unknown as Response
}

/** A response that stalls after `frames`, until the signal aborts it. */
function stalling(frames: string[], signal: AbortSignal): Response {
  let index = 0
  return {
    ok: true,
    status: 200,
    body: {
      getReader: () => ({
        read: () =>
          index < frames.length
            ? Promise.resolve({ done: false, value: encoder.encode(frames[index++]) })
            : new Promise<{ done: boolean; value?: Uint8Array }>((_resolve, reject) => {
                const abort = (): void => {
                  reject(Object.assign(new Error('The operation was aborted.'), { name: 'AbortError' }))
                }
                // Already aborted before this read even started — exactly what
                // happens when the convener presses Pause between two frames.
                if (signal.aborted) abort()
                else signal.addEventListener('abort', abort)
              }),
        releaseLock: () => {},
      }),
    },
  } as unknown as Response
}

function stubFetch(response: (init: RequestInit) => Response) {
  const spy = vi.fn(async (_url: string, init: RequestInit) => response(init))
  vi.stubGlobal('fetch', spy)
  return spy
}

const URL_ADVANCE = '/api/sessions/abc/advance'

describe('requestTurnStream', () => {
  it('accumulates deltas and returns the stored turn', async () => {
    stubFetch(() => sse([ACCEPTED, delta('The build '), delta('is green.'), TURN]))
    const seen: string[] = []

    const result = await requestTurnStream(URL_ADVANCE, new AbortController().signal, (partial) => {
      seen.push(partial.text)
    })

    expect(result).toEqual({
      kind: 'turn',
      turn: { id: 't-2', seq: 2, status: 'complete', content: 'Stored.' },
    })
    // The speaker is known before the first token, and the text grows.
    expect(seen).toEqual(['', 'The build ', 'The build is green.'])
    vi.unstubAllGlobals()
  })

  it('reports the speaker and round from the acceptance event', async () => {
    stubFetch(() => sse([ACCEPTED, delta('hi'), TURN]))
    const partials: { speakerName: string; round: number }[] = []

    await requestTurnStream(URL_ADVANCE, new AbortController().signal, (partial) => {
      partials.push({ speakerName: partial.speakerName, round: partial.round })
    })

    expect(partials.every((p) => p.speakerName === 'The Skeptic' && p.round === 1)).toBe(true)
    vi.unstubAllGlobals()
  })

  it('passes a refusal through with the server’s own words', async () => {
    const message = 'A turn is already being generated for this session. Wait for it to finish.'
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 409, json: async () => ({ error: message }) }) as Response),
    )

    expect(await requestTurnStream(URL_ADVANCE, new AbortController().signal, () => {})).toEqual({
      kind: 'refused',
      message,
    })
    vi.unstubAllGlobals()
  })

  it('reports a refusal with no readable body by its status rather than inventing one', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          ({
            ok: false,
            status: 502,
            json: async () => {
              throw new Error('not json')
            },
          }) as unknown as Response,
      ),
    )

    const result = await requestTurnStream(URL_ADVANCE, new AbortController().signal, () => {})

    expect(result).toEqual({ kind: 'refused', message: 'The server refused the request (HTTP 502).' })
    vi.unstubAllGlobals()
  })

  it('throws when the stream ends before the turn was stored (R4)', async () => {
    stubFetch(() => sse([ACCEPTED, delta('half a sen')]))

    await expect(
      requestTurnStream(URL_ADVANCE, new AbortController().signal, () => {}),
    ).rejects.toThrowError(/before the server stored the turn/)
    vi.unstubAllGlobals()
  })

  it('throws the server’s error frame rather than resolving as if a turn landed', async () => {
    stubFetch(() =>
      sse([ACCEPTED, encodeServerEvent('error', { error: 'the session vanished mid-turn' })]),
    )

    await expect(
      requestTurnStream(URL_ADVANCE, new AbortController().signal, () => {}),
    ).rejects.toThrowError('the session vanished mid-turn')
    vi.unstubAllGlobals()
  })

  it('throws when a 200 carries no stream at all', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, body: null }) as Response))

    await expect(
      requestTurnStream(URL_ADVANCE, new AbortController().signal, () => {}),
    ).rejects.toThrowError(/no stream to read/)
    vi.unstubAllGlobals()
  })

  it('reports an abort as an abort, not as an error', async () => {
    const controller = new AbortController()
    const spy = stubFetch(() => stalling([ACCEPTED, delta('half a sen')], controller.signal))
    const seen: string[] = []

    const pending = requestTurnStream(URL_ADVANCE, controller.signal, (partial) => {
      seen.push(partial.text)
      if (partial.text === 'half a sen') controller.abort()
    })

    expect(await pending).toEqual({ kind: 'aborted' })
    // The signal really was handed to `fetch`, so a real request would stop too.
    expect((spy.mock.calls[0][1] as RequestInit).signal).toBe(controller.signal)
    expect(seen).toEqual(['', 'half a sen'])
    vi.unstubAllGlobals()
  })
})
