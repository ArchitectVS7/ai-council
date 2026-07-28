'use client'

/**
 * `/sessions/[id]` — the chamber (PRD §6, T-013, T-021).
 *
 * Every control here is wired to a real endpoint; nothing is rendered that does
 * nothing. All seven PRD §6 controls are now present. Two of them are shaped by
 * their endpoint rather than by the generation guard: Reopen is *conditionally
 * rendered* (a session that is not completed cannot be reopened at all, so the
 * button is absent rather than greyed out), and Interject is deliberately not
 * gated on the 60-turn cap, because a convener note generates nothing.
 *
 * Server-authoritative (PRD §5.1): every mutation is a POST followed by a
 * refetch of `GET /api/sessions/[id]` that replaces the view wholesale. The
 * client never tells the server whose turn it is and never patches the
 * transcript from a local guess about what happened — including after Reopen,
 * where it is the refetched `session.status` that restores the round controls.
 *
 * Snapshot rule (PRD §7): the roster, the colours, and the council name all come
 * from `session.councilSnapshot`. Nothing here resolves a council id.
 */
import { useCallback, useRef, useState } from 'react'

import { controlState, resultSeq } from '@/lib/chamber/controls'
import { atRoundBoundary, runRound } from '@/lib/chamber/runner'
import type { RunRoundResult, StepOutcome } from '@/lib/chamber/runner'
import type { ChamberTurn, ChamberView } from '@/lib/chamber/types'
import { exportSessionMarkdown, markdownFilename } from '@/lib/council/export-md'
import { MAX_GENERATED_TURNS } from '@/lib/council/scheduler'

/** The bodiless POST endpoints that answer with a turn (PRD §8). */
type Action = 'advance' | 'synthesize' | 'retry-last' | 'regenerate-last'

/** One round trip, with the server's refusal text passed through unedited. */
type Reply = { ok: true; data: unknown } | { ok: false; message: string }

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
  /** Success confirmation for Copy Markdown; the amber notice box is for failures only. */
  const [copied, setCopied] = useState(false)
  /** The convener's in-progress note; cleared only once the server has stored it. */
  const [interjection, setInterjection] = useState('')
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
   * The bare POST. A 4xx is a refusal carrying the server's own message; the
   * body is returned untouched so each caller can read the shape its endpoint
   * actually returns — `reopen` answers without a `turn`, so no shared helper
   * may assume one.
   */
  const request = useCallback(
    async (path: string, body?: unknown): Promise<Reply> => {
      const init: RequestInit =
        body === undefined
          ? { method: 'POST' }
          : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }

      const response = await fetch(`/api/sessions/${sessionId}/${path}`, init)
      if (!response.ok) {
        const failure = (await response.json().catch(() => null)) as { error?: string } | null
        return {
          ok: false,
          message: failure?.error ?? `The server refused the request (HTTP ${response.status}).`,
        }
      }
      return { ok: true, data: await response.json() }
    },
    [sessionId],
  )

  /**
   * One turn-producing round trip: POST the action, then reload from the
   * server. A 200 with a `failed` turn is a stored provider error, not a
   * transport error (PRD §5.4).
   */
  const post = useCallback(
    async (action: Action): Promise<StepOutcome> => {
      const reply = await request(action)
      if (!reply.ok) return { kind: 'refused', message: reply.message }

      const body = reply.data as { turn: ChamberTurn }
      const fresh = await refresh()
      return {
        kind: 'turn',
        failed: body.turn.status === 'failed',
        atRoundBoundary: atRoundBoundary(fresh.turns, fresh.session.councilSnapshot.members.length),
      }
    },
    [request, refresh],
  )

  const runOnce = useCallback(
    async (action: Action) => {
      setBusy(true)
      setNotice(null)
      setCopied(false)
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

  /**
   * The round trip for the actions whose response this screen does not read —
   * Interject and Reopen. Both take effect through the refetch, never through a
   * local edit of the view. Answers whether the server accepted.
   */
  const runPlain = useCallback(
    async (path: string, body?: unknown): Promise<boolean> => {
      setBusy(true)
      setNotice(null)
      setCopied(false)
      try {
        const reply = await request(path, body)
        if (!reply.ok) {
          setNotice(reply.message)
          return false
        }
        await refresh()
        return true
      } catch (error) {
        setNotice(messageOf(error))
        return false
      } finally {
        setBusy(false)
      }
    },
    [request, refresh],
  )

  const onInterject = useCallback(async () => {
    // Mirrors `interjectSchema`; the server is still the authority, and if it
    // refuses anyway its message is what the convener reads.
    const content = interjection.trim()
    if (content === '') return
    // The note stays in the box on a refusal so nothing typed is lost.
    if (await runPlain('interject', { content })) setInterjection('')
  }, [interjection, runPlain])

  const onRunRound = useCallback(async () => {
    pauseRef.current = false
    setBusy(true)
    setRunning(true)
    setNotice(null)
    setCopied(false)
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

  /** The single source of the exported document; both buttons go through it. */
  const buildMarkdown = useCallback(
    () =>
      exportSessionMarkdown({
        topic: view.session.topic,
        snapshot,
        createdAt: view.session.createdAt,
        turns: view.turns,
      }),
    [view, snapshot],
  )

  const onCopyMarkdown = useCallback(async () => {
    setNotice(null)
    setCopied(false)
    try {
      if (typeof navigator === 'undefined' || navigator.clipboard === undefined) {
        // R4: no hidden-textarea fallback pretending the copy worked.
        throw new Error('This browser did not grant clipboard access. Use Download .md instead.')
      }
      await navigator.clipboard.writeText(buildMarkdown())
      setCopied(true)
    } catch (error) {
      setNotice(messageOf(error))
    }
  }, [buildMarkdown])

  const onDownloadMarkdown = useCallback(() => {
    setNotice(null)
    setCopied(false)
    let url: string | null = null
    try {
      const blob = new Blob([buildMarkdown()], { type: 'text/markdown' })
      url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = markdownFilename({
        topic: view.session.topic,
        createdAt: view.session.createdAt,
      })
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
    } catch (error) {
      setNotice(messageOf(error))
    } finally {
      if (url !== null) URL.revokeObjectURL(url)
    }
  }, [buildMarkdown, view.session.topic, view.session.createdAt])

  // Mirrors the server's refusal rules so the UI refuses exactly what the API
  // would refuse — no control here promises something the server will deny.
  const controls = controlState(view, busy)

  const colorOf = (speakerName: string | null): string | undefined =>
    snapshot.members.find((member) => member.name === speakerName)?.color

  const lastSeq = view.turns.length === 0 ? null : view.turns[view.turns.length - 1].seq
  /** The one synthesis that is the session's result; the rest keep the plain badge. */
  const latestSynthesisSeq = resultSeq(view.turns)

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
          {/* The effective model (PRD Amendment A1): the session's own choice,
              or the app default when it made none. */}
          <div className="flex gap-1">
            <dt>Model:</dt>
            <dd className="font-medium text-slate-900" data-testid="session-model">
              {view.session.model ?? view.defaultModel}
            </dd>
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
          disabled={!controls.canGenerate}
          onClick={() => void runOnce('advance')}
        >
          Step
        </button>
        <button
          type="button"
          className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
          disabled={!controls.canGenerate}
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
          disabled={!controls.canGenerate}
          onClick={() => void runOnce('synthesize')}
        >
          Synthesize
        </button>
        <button
          type="button"
          className="rounded border border-slate-300 px-3 py-2 text-sm font-medium disabled:opacity-40"
          disabled={!controls.canRegenerate}
          onClick={() => void runOnce('regenerate-last')}
        >
          Regenerate last
        </button>
        {/* Absent rather than disabled: only a completed session can be
            reopened, so on any other status the control has nothing to offer. */}
        {controls.showReopen ? (
          <button
            type="button"
            className="rounded border border-slate-300 px-3 py-2 text-sm font-medium disabled:opacity-40"
            disabled={!controls.canReopen}
            onClick={() => void runPlain('reopen')}
          >
            Reopen
          </button>
        ) : null}
      </section>

      {/* Export never generates, so it is live even when the session is
          completed or at the turn cap. */}
      <section aria-label="Export" className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="rounded border border-slate-300 px-3 py-2 text-sm font-medium"
          onClick={() => void onCopyMarkdown()}
        >
          Copy Markdown
        </button>
        <button
          type="button"
          className="rounded border border-slate-300 px-3 py-2 text-sm font-medium"
          onClick={onDownloadMarkdown}
        >
          Download .md
        </button>
        {copied ? <span className="text-sm text-slate-600">Copied to the clipboard.</span> : null}
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
              data-kind={turn.kind}
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
                  // A session may hold several syntheses; the latest complete
                  // one is the session's result (PRD §5.1) and is badged so.
                  <span
                    className={
                      turn.seq === latestSynthesisSeq
                        ? 'rounded bg-indigo-700 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white'
                        : 'rounded bg-indigo-200 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-indigo-900'
                    }
                  >
                    {turn.seq === latestSynthesisSeq ? 'Result' : 'Synthesis'}
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
                      disabled={!controls.canGenerate}
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

      {/* A convener note lands at the end of the transcript, so the control that
          writes one belongs there too. */}
      <section aria-label="Interjection" className="flex flex-col gap-2">
        <label htmlFor="interjection" className="text-sm font-medium text-slate-900">
          Interject
        </label>
        <textarea
          id="interjection"
          rows={3}
          maxLength={10_000}
          className="rounded border border-slate-300 p-2 text-sm"
          placeholder="Steer the council in your own words."
          value={interjection}
          onChange={(event) => setInterjection(event.target.value)}
        />
        <button
          type="button"
          className="self-start rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
          disabled={!controls.canInterject || interjection.trim() === ''}
          onClick={() => void onInterject()}
        >
          Interject
        </button>
      </section>
    </main>
  )
}
