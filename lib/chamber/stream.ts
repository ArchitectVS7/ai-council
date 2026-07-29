/**
 * Reading a streamed turn in the browser (T-030).
 *
 * Kept out of the React component so the reader loop can be unit-tested without
 * a DOM, and so the chamber keeps its one job: rendering server state.
 *
 * Display-only. The deltas are shown as they arrive, but nothing here patches
 * the transcript — the caller still refetches `GET /api/sessions/[id]` once the
 * turn lands, because the server is authoritative about what was stored
 * (PRD §5.1). A stream that ends without a `turn` event is an error, never a
 * quiet success (R4).
 */
import { describeFailure, readErrorBody } from '@/lib/api/failure'
import { readServerEvents } from '@/lib/sse'

import type { ChamberTurn } from './types'

/** The in-flight turn as the convener sees it while the tokens arrive. */
export type StreamingTurn = { speakerName: string; round: number; text: string }

/** How a stream ended. Module-local until a caller names it (R2 / knip). */
type TurnStreamResult =
  /** The server stored a turn; `status` may be `failed` (PRD §5.4). */
  | { kind: 'turn'; turn: ChamberTurn }
  /** A 4xx refusal, carrying the server's own words. */
  | { kind: 'refused'; message: string }
  /** The convener pressed Pause; the server recorded an aborted turn. */
  | { kind: 'aborted' }

export async function requestTurnStream(
  url: string,
  signal: AbortSignal,
  onDelta: (partial: StreamingTurn) => void,
): Promise<TurnStreamResult> {
  try {
    const response = await fetch(url, { method: 'POST', signal })
    if (!response.ok) {
      return { kind: 'refused', message: describeFailure(await readErrorBody(response), response.status) }
    }
    if (!response.body) {
      throw new Error('The server accepted the turn but sent no stream to read.')
    }

    let speakerName = ''
    let round = 0
    let text = ''
    let turn: ChamberTurn | null = null

    for await (const frame of readServerEvents(response.body)) {
      const data = JSON.parse(frame.data) as Record<string, unknown>
      switch (frame.event) {
        case 'accepted':
          speakerName = String(data.speakerName)
          round = Number(data.round)
          onDelta({ speakerName, round, text })
          break
        case 'delta':
          text += String(data.text)
          onDelta({ speakerName, round, text })
          break
        case 'turn':
          turn = (data.result as { turn: ChamberTurn }).turn
          break
        case 'error':
          throw new Error(String(data.error))
        default:
          break
      }
    }

    if (turn === null) {
      throw new Error('The turn stream ended before the server stored the turn.')
    }
    return { kind: 'turn', turn }
  } catch (error) {
    if (signal.aborted || (error instanceof Error && error.name === 'AbortError')) {
      return { kind: 'aborted' }
    }
    throw error
  }
}
