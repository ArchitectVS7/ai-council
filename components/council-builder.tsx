'use client'

/**
 * `/councils` (PRD §6 screen 3): the council list and the form editor.
 *
 * One component because the two halves share one list: every write returns the
 * stored council, and the list is re-rendered from *that* — never from the
 * fields the convener typed. A save the server rejects therefore leaves the list
 * exactly as it was (R4, server-authoritative).
 *
 * Reordering is two plain buttons per seat. PRD §6 screen 3 says "plain buttons,
 * no drag-and-drop library" and PRD §12 buries the drag-and-drop designer
 * outright, so this must not grow a dependency: moving a member is an array
 * splice, and the positions that go over the wire are advisory anyway —
 * `normalizeCouncilMembers` renumbers them on the server.
 *
 * Archiving is a server decision. `DELETE /api/councils/[id]` answers
 * `{archived}` and this component only reports which happened. Either way no
 * past session changes: sessions render from `council_snapshot` (PRD §7).
 */
import { useState } from 'react'
import type { FormEvent } from 'react'

import { describeFailure, messageOf, readErrorBody } from '@/lib/api/failure'
import {
  MAX_COUNCIL_MEMBERS,
  MAX_ROUNDS,
  MIN_COUNCIL_MEMBERS,
  MIN_ROUNDS,
} from '@/lib/council/snapshot'
import type { CouncilDetail, CouncilMemberSummary } from '@/lib/councils/types'
import type { PersonaSummary } from '@/lib/personas/types'

/**
 * One seat of the editor's working speaking order. `position` is dropped on
 * purpose: while editing, a seat's position *is* its index in the array, so
 * there is no second copy of the order to keep in step.
 */
type Seat = Omit<CouncilMemberSummary, 'position'>

/** The seats of a stored council, in the order the server returned them. */
function seatsOf(council: CouncilDetail): Seat[] {
  return council.members.map((member) => ({
    personaId: member.personaId,
    name: member.name,
    color: member.color,
  }))
}

/** A copy of `seats` with the entry at `index` moved one place towards `delta`. */
function moved(seats: Seat[], index: number, delta: -1 | 1): Seat[] {
  const target = index + delta
  if (target < 0 || target >= seats.length) return seats

  const next = [...seats]
  const [seat] = next.splice(index, 1)
  next.splice(target, 0, seat)
  return next
}

/** PRD §5.3's default, and what the seed councils use. */
const DEFAULT_ROUNDS = 2

export default function CouncilBuilder({
  initialCouncils,
  personas,
}: {
  initialCouncils: CouncilDetail[]
  personas: PersonaSummary[]
}) {
  const [councils, setCouncils] = useState<CouncilDetail[]>(initialCouncils)
  /** null means the editor is creating; an id means it is editing that council. */
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  /** Held as text so the field can be cleared; parsed and range-checked on submit. */
  const [rounds, setRounds] = useState(String(DEFAULT_ROUNDS))
  const [seats, setSeats] = useState<Seat[]>([])
  const [pendingPersonaId, setPendingPersonaId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const available = personas.filter(
    (persona) => !seats.some((seat) => seat.personaId === persona.id),
  )
  const selectable = available.some((persona) => persona.id === pendingPersonaId)
    ? pendingPersonaId
    : (available[0]?.id ?? '')
  const full = seats.length >= MAX_COUNCIL_MEMBERS
  const short = seats.length < MIN_COUNCIL_MEMBERS

  function resetForm() {
    setEditingId(null)
    setName('')
    setDescription('')
    setRounds(String(DEFAULT_ROUNDS))
    setSeats([])
    setPendingPersonaId('')
  }

  function startEditing(council: CouncilDetail) {
    setError(null)
    setNotice(null)
    setEditingId(council.id)
    setName(council.name)
    setDescription(council.description ?? '')
    setRounds(String(council.defaultRounds))
    setSeats(seatsOf(council))
    setPendingPersonaId('')
  }

  function addSeat() {
    const persona = personas.find((entry) => entry.id === selectable)
    if (!persona || full) return
    setSeats((current) => [
      ...current,
      { personaId: persona.id, name: persona.name, color: persona.color },
    ])
    setPendingPersonaId('')
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setNotice(null)

    const trimmedName = name.trim()
    if (trimmedName.length === 0) {
      setError('Name is required.')
      return
    }
    const parsedRounds = Number(rounds)
    if (!Number.isInteger(parsedRounds) || parsedRounds < MIN_ROUNDS || parsedRounds > MAX_ROUNDS) {
      setError(`Default rounds must be a whole number between ${MIN_ROUNDS} and ${MAX_ROUNDS}.`)
      return
    }
    if (short || full) {
      setError(
        `A council seats between ${MIN_COUNCIL_MEMBERS} and ${MAX_COUNCIL_MEMBERS} personas; this one has ${seats.length}.`,
      )
      return
    }

    // Exactly these four keys: `councilInputSchema` is strict and reports an
    // unknown one as a 400. The positions are the current on-screen order; the
    // server renumbers them before storing.
    const input = {
      name: trimmedName,
      description: description.trim().length === 0 ? null : description.trim(),
      defaultRounds: parsedRounds,
      members: seats.map((seat, index) => ({ personaId: seat.personaId, position: index })),
    }

    const editing = editingId
    setSubmitting(true)
    try {
      const response = await fetch(
        editing === null ? '/api/councils' : `/api/councils/${editing}`,
        {
          method: editing === null ? 'POST' : 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        },
      )

      if (!response.ok) {
        setError(describeFailure(await readErrorBody(response), response.status))
        return
      }

      const body = (await response.json()) as { council: CouncilDetail }
      const stored = body.council
      setCouncils((current) =>
        editing === null
          ? [...current, stored]
          : current.map((council) => (council.id === stored.id ? stored : council)),
      )
      resetForm()
      setNotice(editing === null ? `Added ${stored.name}.` : `Saved ${stored.name}.`)
    } catch (submitError) {
      setError(messageOf(submitError))
    } finally {
      setSubmitting(false)
    }
  }

  async function onDelete(council: CouncilDetail) {
    setError(null)
    setNotice(null)

    try {
      const response = await fetch(`/api/councils/${council.id}`, { method: 'DELETE' })

      if (!response.ok) {
        setError(describeFailure(await readErrorBody(response), response.status))
        return
      }

      const body = (await response.json()) as { archived: boolean }
      setCouncils((current) => current.filter((entry) => entry.id !== council.id))
      if (editingId === council.id) resetForm()
      setNotice(
        body.archived
          ? `${council.name} has already run sessions, so it was archived rather than deleted. Existing sessions are unaffected.`
          : `${council.name} was deleted.`,
      )
    } catch (deleteError) {
      setError(messageOf(deleteError))
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="library" className="flex flex-col gap-3">
        <h2 id="library" className="text-lg font-medium">
          Councils
        </h2>

        {councils.length === 0 ? (
          <p className="text-sm text-slate-600">
            No councils yet. Run <code>npm run seed</code> to create the defaults, or build one
            below.
          </p>
        ) : (
          <ul aria-label="Councils" className="flex flex-col gap-2">
            {councils.map((council) => (
              <li
                key={council.id}
                data-testid={`council-${council.id}`}
                className="flex items-center gap-3 rounded border border-slate-200 bg-white p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900">{council.name}</p>
                  {council.description === null ? null : (
                    <p className="text-sm text-slate-600">{council.description}</p>
                  )}
                  <p data-testid={`order-${council.id}`} className="text-sm text-slate-600">
                    {council.members.map((member) => member.name).join(' → ')}
                  </p>
                  <p className="text-sm text-slate-500">
                    {council.defaultRounds} default rounds · {council.members.length} personas
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Edit ${council.name}`}
                  onClick={() => startEditing(council)}
                  className="rounded border border-slate-300 px-2 py-1 text-sm"
                >
                  Edit
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${council.name}`}
                  onClick={() => void onDelete(council)}
                  className="rounded border border-slate-300 px-2 py-1 text-sm"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="editor" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="editor" className="text-lg font-medium">
            {editingId === null ? 'New council' : 'Edit council'}
          </h2>
          {editingId === null ? null : (
            <button
              type="button"
              onClick={resetForm}
              className="text-sm text-slate-600 underline underline-offset-2"
            >
              New council
            </button>
          )}
        </div>

        <form
          onSubmit={onSubmit}
          className="flex flex-col gap-4 rounded border border-slate-200 bg-white p-4"
        >
          <div className="flex flex-col gap-1">
            <label htmlFor="council-name" className="text-sm font-medium text-slate-900">
              Name
            </label>
            <input
              id="council-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="rounded border border-slate-300 p-2 text-sm"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="council-description" className="text-sm font-medium text-slate-900">
              Description
            </label>
            <textarea
              id="council-description"
              rows={2}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="rounded border border-slate-300 p-2 text-sm"
              placeholder="What is this council for?"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="council-rounds" className="text-sm font-medium text-slate-900">
              Default rounds
            </label>
            <input
              id="council-rounds"
              type="number"
              min={MIN_ROUNDS}
              max={MAX_ROUNDS}
              value={rounds}
              onChange={(event) => setRounds(event.target.value)}
              className="w-24 rounded border border-slate-300 p-2 text-sm"
            />
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-slate-900">Speaking order</legend>

            {seats.length === 0 ? (
              <p className="text-sm text-slate-600">No personas seated yet.</p>
            ) : (
              <ol aria-label="Speaking order" className="flex flex-col gap-2">
                {seats.map((seat, index) => (
                  <li
                    key={seat.personaId}
                    className="flex items-center gap-3 rounded border border-slate-200 p-2"
                  >
                    <span className="w-6 text-sm text-slate-500">{index + 1}</span>
                    <span
                      data-testid={`seat-swatch-${seat.personaId}`}
                      aria-hidden
                      style={{ backgroundColor: seat.color }}
                      className="h-5 w-5 shrink-0 rounded-full border border-slate-300"
                    />
                    <span className="min-w-0 flex-1 text-sm text-slate-900">{seat.name}</span>
                    <button
                      type="button"
                      aria-label={`Move ${seat.name} up`}
                      disabled={index === 0}
                      onClick={() => setSeats((current) => moved(current, index, -1))}
                      className="rounded border border-slate-300 px-2 py-1 text-sm disabled:opacity-40"
                    >
                      Move up
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${seat.name} down`}
                      disabled={index === seats.length - 1}
                      onClick={() => setSeats((current) => moved(current, index, 1))}
                      className="rounded border border-slate-300 px-2 py-1 text-sm disabled:opacity-40"
                    >
                      Move down
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove ${seat.name}`}
                      onClick={() =>
                        setSeats((current) =>
                          current.filter((entry) => entry.personaId !== seat.personaId),
                        )
                      }
                      className="rounded border border-slate-300 px-2 py-1 text-sm"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ol>
            )}

            <div className="flex flex-wrap items-end gap-2">
              <div className="flex flex-col gap-1">
                <label htmlFor="council-add" className="text-sm font-medium text-slate-900">
                  Add persona
                </label>
                <select
                  id="council-add"
                  value={selectable}
                  disabled={available.length === 0}
                  onChange={(event) => setPendingPersonaId(event.target.value)}
                  className="rounded border border-slate-300 p-2 text-sm"
                >
                  {available.map((persona) => (
                    <option key={persona.id} value={persona.id}>
                      {persona.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={addSeat}
                disabled={full || selectable === ''}
                className="rounded border border-slate-300 px-3 py-2 text-sm disabled:opacity-40"
              >
                Add
              </button>
            </div>

            <p className="text-sm text-slate-600">
              {full
                ? `A council seats at most ${MAX_COUNCIL_MEMBERS} personas.`
                : short
                  ? `Seat at least ${MIN_COUNCIL_MEMBERS} personas before saving.`
                  : `${seats.length} personas seated. Use Move up and Move down to set the speaking order.`}
            </p>
          </fieldset>

          {error === null ? null : (
            <p
              role="alert"
              className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
            >
              {error}
            </p>
          )}

          {notice === null ? null : (
            <p
              role="status"
              className="rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700"
            >
              {notice}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || short}
            className="self-start rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            {editingId === null ? 'Create council' : 'Save council'}
          </button>
        </form>
      </section>
    </div>
  )
}
