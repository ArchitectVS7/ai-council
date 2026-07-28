'use client'

/**
 * "New session" on `/` (PRD §6 screen 1): topic textarea, council picker, a
 * rounds override that defaults to the chosen council's `default_rounds`, and a
 * model picker (PRD Amendment A1).
 *
 * Server-authoritative (PRD §5.1): this form posts `{topic, councilId, rounds}`
 * plus an optional `model` to `POST /api/sessions` (PRD §8) and then navigates
 * to whatever id the server hands back. It never invents a session, a snapshot,
 * or a status locally. The model is the *only* thing it ever chooses, and only
 * at creation: from then on the server reads it back off the session row.
 *
 * Fail loudly (R4): the council picker is fed by `GET /api/councils` and has no
 * hardcoded fallback — if that read fails, the error is shown and the form stays
 * disabled rather than offering councils that may not exist.
 */
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useRouter } from 'next/navigation'

import { describeFailure, messageOf, readErrorBody } from '@/lib/api/failure'
import { MAX_ROUNDS, MIN_ROUNDS } from '@/lib/council/snapshot'
import type { CouncilOption } from '@/lib/home/types'
import { MODEL_CHOICES } from '@/lib/models'
import type { ProviderName } from '@/lib/models'

export default function NewSessionForm({ provider }: { provider: ProviderName }) {
  const router = useRouter()
  /** null until the council read settles — never an empty array standing in for "loading". */
  const [councils, setCouncils] = useState<CouncilOption[] | null>(null)
  const [councilId, setCouncilId] = useState('')
  const [topic, setTopic] = useState('')
  /** Held as text so the field can be cleared; parsed and range-checked on submit. */
  const [rounds, setRounds] = useState('')
  /** `''` is "Provider default" — it sends no `model` key at all. */
  const [model, setModel] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadCouncils() {
      try {
        const response = await fetch('/api/councils')
        if (!response.ok) {
          const body = await readErrorBody(response)
          throw new Error(describeFailure(body, response.status))
        }
        const body = (await response.json()) as { councils: CouncilOption[] }
        if (cancelled) return
        setCouncils(body.councils)
        const first = body.councils[0]
        if (first) {
          setCouncilId(first.id)
          setRounds(String(first.defaultRounds))
        }
      } catch (loadError) {
        if (!cancelled) setError(messageOf(loadError))
      }
    }

    void loadCouncils()
    return () => {
      cancelled = true
    }
  }, [])

  const selected = councils?.find((council) => council.id === councilId) ?? null
  // Empty under `mock`: there is nothing to choose between, so the control is
  // absent rather than shown and ignored.
  const modelChoices = MODEL_CHOICES[provider]

  function onCouncilChange(nextId: string) {
    setCouncilId(nextId)
    // The rounds field is an *override*: changing council resets it to that
    // council's own default rather than carrying the previous one over.
    const next = councils?.find((council) => council.id === nextId)
    if (next) setRounds(String(next.defaultRounds))
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const trimmedTopic = topic.trim()
    if (trimmedTopic.length === 0) {
      setError('Topic is required.')
      return
    }
    if (councilId === '') {
      setError('Choose a council.')
      return
    }
    const parsedRounds = Number(rounds)
    if (!Number.isInteger(parsedRounds) || parsedRounds < MIN_ROUNDS || parsedRounds > MAX_ROUNDS) {
      setError(`Rounds must be a whole number between ${MIN_ROUNDS} and ${MAX_ROUNDS}.`)
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Exactly these keys: `createSessionSchema` is a strict object and
        // reports an unknown one as a 400. "Provider default" omits `model`
        // entirely rather than sending a blank, which the schema rejects.
        body: JSON.stringify({
          topic: trimmedTopic,
          councilId,
          rounds: parsedRounds,
          ...(model === '' ? {} : { model }),
        }),
      })

      if (!response.ok) {
        setError(describeFailure(await readErrorBody(response), response.status))
        return
      }

      const body = (await response.json()) as { session: { id: string } }
      router.push(`/sessions/${body.session.id}`)
    } catch (postError) {
      setError(messageOf(postError))
    } finally {
      setSubmitting(false)
    }
  }

  const noCouncils = councils !== null && councils.length === 0
  const blocked = submitting || councils === null || noCouncils

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 rounded border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="topic" className="text-sm font-medium text-slate-900">
          Topic
        </label>
        <textarea
          id="topic"
          rows={3}
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
          className="rounded border border-slate-300 p-2 text-sm"
          placeholder="What should the council take up?"
        />
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="council" className="text-sm font-medium text-slate-900">
            Council
          </label>
          {councils === null ? (
            <p className="text-sm text-slate-600">
              {error === null ? 'Loading councils…' : 'Councils could not be loaded.'}
            </p>
          ) : noCouncils ? (
            <p className="text-sm text-slate-600">
              No councils are available. Run <code>npm run seed</code> to create the defaults.
            </p>
          ) : (
            <select
              id="council"
              value={councilId}
              onChange={(event) => onCouncilChange(event.target.value)}
              className="rounded border border-slate-300 p-2 text-sm"
            >
              {councils.map((council) => (
                <option key={council.id} value={council.id}>
                  {council.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="rounds" className="text-sm font-medium text-slate-900">
            Rounds
          </label>
          <input
            id="rounds"
            type="number"
            min={MIN_ROUNDS}
            max={MAX_ROUNDS}
            value={rounds}
            onChange={(event) => setRounds(event.target.value)}
            className="w-24 rounded border border-slate-300 p-2 text-sm"
          />
        </div>

        {modelChoices.length === 0 ? null : (
          <div className="flex flex-col gap-1">
            <label htmlFor="model" className="text-sm font-medium text-slate-900">
              Model
            </label>
            <select
              id="model"
              value={model}
              onChange={(event) => setModel(event.target.value)}
              className="rounded border border-slate-300 p-2 text-sm"
            >
              <option value="">Provider default</option>
              {modelChoices.map((choice) => (
                <option key={choice} value={choice}>
                  {choice}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {selected?.description == null ? null : (
        <p className="text-sm text-slate-600">{selected.description}</p>
      )}

      {error === null ? null : (
        <p role="alert" className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={blocked}
        className="self-start rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
      >
        Create session
      </button>
    </form>
  )
}
