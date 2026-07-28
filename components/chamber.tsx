'use client'

/**
 * `/sessions/[id]` — the chamber (PRD §6, T-013).
 *
 * Every control here is wired to a real endpoint; nothing is rendered that does
 * nothing. Controls the PRD lists but that later tasks own — Interject,
 * Regenerate last, Reopen (T-020/T-021), Export Markdown (T-015) — are simply
 * absent rather than shown disabled.
 *
 * Server-authoritative (PRD §5.1): every mutation is a bodiless POST followed by
 * a refetch of `GET /api/sessions/[id]` that replaces the view wholesale. The
 * client never tells the server whose turn it is and never patches the
 * transcript from a local guess about what happened.
 *
 * Snapshot rule (PRD §7): the roster, the colours, and the council name all come
 * from `session.councilSnapshot`. Nothing here resolves a council id.
 */
import { useCallback, useRef, useState } from 'react'

import { atRoundBoundary, runRound } from '@/lib/chamber/runner'
import type { RunRoundResult, StepOutcome } from '@/lib/chamber/runner'
import type { ChamberTurn, ChamberView } from '@/lib/chamber/types'
import { MAX_GENERATED_TURNS } from '@/lib/council/scheduler'

/** The three bodiless POST endpoints this screen drives (PRD §8). */
type Action = 'advance' | 'synthesize' | 'retry-last'

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** What to tell the convener once a run has stopped; null when nothing needs saying. */
function describeStop(result: RunRoundResult): string | null {
  switch (result.stoppedBy) {
    case 'refused':
      // The server's own words (cap reached, session not active, locked).
      return result.message ?? 'The server refused the next turn.'
    case 'failure':
      // The provider's error text is already rendered on the turn itself.
      return 'A turn failed to generate. Retry it in the transcript to continue.'
    default:
      return null
  }
}

export default function Chamber({ initialView }: { initialView: ChamberView }) {
  const [view, setView] = useState<ChamberView>(initialView)
  /** True from the moment a request leaves until its refetch lands. */
  const [busy, setBusy] = useState(false)
  /** True only for the duration of a Run round. */
  const [running, setRunning] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  // A ref, not state: the running loop has to read the latest value between
  // steps, and a re-render is not what makes Pause take effect.
  const pauseRef = useRef(false)

  const sessionId = view.session.id
  const snapshot = view.session.councilSnapshot

  const refresh = useCallback(async (): Promise<ChamberView> => {
    const response = await fetch(`/api/sessions/${sessionId}`)
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null
      throw new Error(body?.error ?? `Could not reload the session (HTTP ${response.status}).`)
    }
    const fresh = (await response.json()) as ChamberView
    setView(fresh)
    return fresh
  }, [sessionId])

  /**
   * One server round trip: POST the action, then reload from the server. A 4xx
   * is a refusal carrying the server's message; a 200 with a `failed` turn is a
   * stored provider error, not a transport error (PRD §5.4).
   */
  const post = useCallback(
    async (action: Action): Promise<StepOutcome> => {
      const response = await fetch(`/api/sessions/${sessionId}/${action}`, { method: 'POST' })
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null
        return {
          kind: 'refused',
          message: body?.error ?? `The server refused the request (HTTP ${response.status}).`,
        }
      }

      const body = (await response.json()) as { turn: ChamberTurn }
      const fresh = await refresh()
      return {
        kind: 'turn',
        failed: body.turn.status === 'failed',
        atRoundBoundary: atRoundBoundary(fresh.turns, fresh.session.councilSnapshot.members.length),
      }
    },
    [sessionId, refresh],
  )

  const runOnce = useCallback(
    async (action: Action) => {
      setBusy(true)
      setNotice(null)
      try {
        const outcome = await post(action)
        if (outcome.kind === 'refused') setNotice(outcome.message)
      } catch (error) {
        setNotice(messageOf(error))
      } finally {
        setBusy(false)
      }
    },
    [post],
  )

  const onRunRound = useCallback(async () => {
    pauseRef.current = false
    setBusy(true)
    setRunning(true)
    setNotice(null)
    try {
      const result = await runRound({
        step: () => post('advance'),
        shouldStop: () => pauseRef.current,
        // A round cannot need more turns than the council has members.
        maxSteps: snapshot.members.length,
      })
      setNotice(describeStop(result))
    } catch (error) {
      setNotice(messageOf(error))
    } finally {
      setRunning(false)
      setBusy(false)
    }
  }, [post, snapshot.members.length])

  const onPause = useCallback(() => {
    pauseRef.current = true
  }, [])

  const atCap = view.session.turnCursor >= MAX_GENERATED_TURNS
  // Mirrors the server's `canGenerate` guard so the UI refuses exactly what the
  // API would refuse — no control here promises something the server will deny.
  const generationBlocked = busy || view.session.status !== 'active' || atCap

  const colorOf = (speakerName: string | null): string | undefined =>
    snapshot.members.find((member) => member.name === speakerName)?.color

  const lastSeq = view.turns.length === 0 ? null : view.turns[view.turns.length - 1].seq

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-3 border-b border-slate-200 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{view.session.topic}</h1>
          {view.mockMode ? (
            <span className="rounded bg-amber-200 px-2 py-1 text-xs font-bold uppercase tracking-wide text-amber-900">
              Mock mode
            </span>
          ) : null}
        </div>
        <dl className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-slate-600">
          <div className="flex gap-1">
            <dt>Council:</dt>
            <dd className="font-medium text-slate-900">{snapshot.name}</dd>
          </div>
          <div className="flex gap-1">
            <dt>Status:</dt>
            <dd className="font-medium text-slate-900">{view.session.status}</dd>
          </div>
          <div className="flex gap-1">
            <dt>Turns:</dt>
            <dd className="font-medium text-slate-900" data-testid="turn-counter">
              {view.session.turnCursor} / {MAX_GENERATED_TURNS}
            </dd>
          </div>
        </dl>
      </header>

      <section aria-label="Session controls" className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
          disabled={generationBlocked}
          onClick={() => void runOnce('advance')}
        >
          Step
        </button>
        <button
          type="button"
          className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
          disabled={generationBlocked}
          onClick={() => void onRunRound()}
        >
          Run round
        </button>
        <button
          type="button"
          className="rounded border border-slate-300 px-3 py-2 text-sm font-medium disabled:opacity-40"
          disabled={!running}
          onClick={onPause}
        >
          Pause
        </button>
        <button
          type="button"
          className="rounded border border-slate-300 px-3 py-2 text-sm font-medium disabled:opacity-40"
          disabled={generationBlocked}
          onClick={() => void runOnce('synthesize')}
        >
          Synthesize
        </button>
      </section>

      {notice === null ? null : (
        <p role="alert" className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          {notice}
        </p>
      )}

      <ol aria-label="Transcript" className="flex flex-col gap-4">
        {view.turns.map((turn) => {
          const failed = turn.status === 'failed'
          const color = turn.kind === 'persona' ? colorOf(turn.speakerName) : undefined

          return (
            <li
              key={turn.id}
              data-testid={`turn-${turn.seq}`}
              className={[
                'rounded border-l-4 p-4',
                failed
                  ? 'border border-red-300 bg-red-50'
                  : turn.kind === 'synthesis'
                    ? 'border border-indigo-300 bg-indigo-50 shadow-sm'
                    : turn.kind === 'interjection'
                      ? 'border border-slate-300 bg-slate-100 italic'
                      : 'border border-slate-200 bg-white',
              ].join(' ')}
              // Tailwind cannot build a class from a snapshot hex value, so the
              // persona colour is applied inline.
              style={color === undefined ? undefined : { borderLeftColor: color }}
            >
              <p className="flex flex-wrap items-baseline gap-2 text-sm">
                <span className="font-semibold text-slate-900">
                  {turn.kind === 'interjection' ? 'Convener' : turn.speakerName}
                </span>
                <span className="text-slate-500">Round {turn.round}</span>
                {turn.kind === 'synthesis' ? (
                  <span className="rounded bg-indigo-200 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-indigo-900">
                    Synthesis
                  </span>
                ) : null}
                {turn.kind === 'interjection' ? (
                  <span className="rounded bg-slate-300 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-slate-800">
                    Interjection
                  </span>
                ) : null}
              </p>

              {failed ? (
                <div className="mt-2 flex flex-col items-start gap-2">
                  {/* The provider's message, unedited (R4). */}
                  <p className="text-sm text-red-800">{turn.error}</p>
                  {/* `retry-last` only ever retries the latest turn, and the
                      scheduler blocks generation while a turn is failed, so a
                      failed turn is always the last one — this gate closes no
                      real gap, it just refuses to promise what the API cannot
                      deliver. */}
                  {turn.seq === lastSeq ? (
                    <button
                      type="button"
                      className="rounded bg-red-700 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
                      disabled={generationBlocked}
                      onClick={() => void runOnce('retry-last')}
                    >
                      Retry
                    </button>
                  ) : null}
                </div>
              ) : (
                <p className="mt-2 whitespace-pre-wrap text-slate-800">{turn.content}</p>
              )}
            </li>
          )
        })}
      </ol>

      {view.turns.length === 0 ? (
        <p className="text-sm text-slate-600">No turns yet. Press Step to hear the first persona.</p>
      ) : null}
    </main>
  )
}
