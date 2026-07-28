'use client'

/**
 * `/personas` (PRD §6 screen 4): the persona library grid and the editor form.
 *
 * One component because the two halves share one list: every write returns the
 * stored persona, and the grid is re-rendered from *that* — never from the
 * fields the convener typed. A create that the server rejects therefore leaves
 * the grid exactly as it was (R4, server-authoritative).
 *
 * Archiving is a server decision. `DELETE /api/personas/[id]` answers
 * `{archived}` and this component only reports which happened; it never asks
 * for one outcome or the other. Either way the card leaves the library, and no
 * past session changes — sessions render from `council_snapshot` (PRD §7).
 */
import { useState } from 'react'
import type { FormEvent } from 'react'

import type { PersonaSummary } from '@/lib/personas/types'

/** The error envelope every route handler returns (`lib/api/http.ts`). */
type ErrorBody = { error?: string; issues?: { message?: string }[] }

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** The server's own words, with zod's issue messages appended when it sent any. */
function describeFailure(body: ErrorBody | null, status: number): string {
  const base = body?.error ?? `The server refused the request (HTTP ${status}).`
  const issues = Array.isArray(body?.issues)
    ? body.issues
        .map((issue) => issue?.message)
        .filter((message): message is string => typeof message === 'string' && message.length > 0)
    : []
  return issues.length === 0 ? base : `${base} ${issues.join(' ')}`
}

async function readErrorBody(response: Response): Promise<ErrorBody | null> {
  return (await response.json().catch(() => null)) as ErrorBody | null
}

/** Matches the seed palette, so a new persona starts somewhere sensible. */
const DEFAULT_COLOR = '#2563eb'

export default function PersonaLibrary({
  initialPersonas,
}: {
  initialPersonas: PersonaSummary[]
}) {
  const [personas, setPersonas] = useState<PersonaSummary[]>(initialPersonas)
  /** null means the editor is creating; an id means it is editing that persona. */
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [charter, setCharter] = useState('')
  const [color, setColor] = useState(DEFAULT_COLOR)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function resetForm() {
    setEditingId(null)
    setName('')
    setRole('')
    setCharter('')
    setColor(DEFAULT_COLOR)
  }

  function startEditing(persona: PersonaSummary) {
    setError(null)
    setNotice(null)
    setEditingId(persona.id)
    setName(persona.name)
    setRole(persona.role)
    setCharter(persona.charter)
    setColor(persona.color)
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setNotice(null)

    // Exactly these four keys: `personaInputSchema` is strict and reports an
    // unknown one as a 400.
    const input = {
      name: name.trim(),
      role: role.trim(),
      charter: charter.trim(),
      color,
    }
    if (input.name.length === 0) {
      setError('Name is required.')
      return
    }
    if (input.role.length === 0) {
      setError('Role is required.')
      return
    }
    if (input.charter.length === 0) {
      setError('Charter is required.')
      return
    }

    const editing = editingId
    setSubmitting(true)
    try {
      const response = await fetch(
        editing === null ? '/api/personas' : `/api/personas/${editing}`,
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

      const body = (await response.json()) as { persona: PersonaSummary }
      const stored = body.persona
      setPersonas((current) =>
        editing === null
          ? [...current, stored]
          : current.map((persona) => (persona.id === stored.id ? stored : persona)),
      )
      resetForm()
      setNotice(editing === null ? `Added ${stored.name}.` : `Saved ${stored.name}.`)
    } catch (submitError) {
      setError(messageOf(submitError))
    } finally {
      setSubmitting(false)
    }
  }

  async function onDelete(persona: PersonaSummary) {
    setError(null)
    setNotice(null)

    try {
      const response = await fetch(`/api/personas/${persona.id}`, { method: 'DELETE' })

      if (!response.ok) {
        setError(describeFailure(await readErrorBody(response), response.status))
        return
      }

      const body = (await response.json()) as { archived: boolean }
      setPersonas((current) => current.filter((entry) => entry.id !== persona.id))
      if (editingId === persona.id) resetForm()
      setNotice(
        body.archived
          ? `${persona.name} is used by a council or a past session, so it was archived rather than deleted. Existing sessions are unaffected.`
          : `${persona.name} was deleted.`,
      )
    } catch (deleteError) {
      setError(messageOf(deleteError))
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="library" className="flex flex-col gap-3">
        <h2 id="library" className="text-lg font-medium">
          Library
        </h2>

        {personas.length === 0 ? (
          <p className="text-sm text-slate-600">
            No personas yet. Run <code>npm run seed</code> to create the defaults, or add one below.
          </p>
        ) : (
          <ul aria-label="Personas" className="flex flex-col gap-2">
            {personas.map((persona) => (
              <li
                key={persona.id}
                data-testid={`persona-${persona.id}`}
                className="flex items-center gap-3 rounded border border-slate-200 bg-white p-4"
              >
                <span
                  data-testid={`swatch-${persona.id}`}
                  aria-hidden
                  style={{ backgroundColor: persona.color }}
                  className="h-6 w-6 shrink-0 rounded-full border border-slate-300"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900">{persona.name}</p>
                  <p className="text-sm text-slate-600">{persona.role}</p>
                </div>
                <button
                  type="button"
                  aria-label={`Edit ${persona.name}`}
                  onClick={() => startEditing(persona)}
                  className="rounded border border-slate-300 px-2 py-1 text-sm"
                >
                  Edit
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${persona.name}`}
                  onClick={() => void onDelete(persona)}
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
            {editingId === null ? 'New persona' : 'Edit persona'}
          </h2>
          {editingId === null ? null : (
            <button
              type="button"
              onClick={resetForm}
              className="text-sm text-slate-600 underline underline-offset-2"
            >
              New persona
            </button>
          )}
        </div>

        <form
          onSubmit={onSubmit}
          className="flex flex-col gap-4 rounded border border-slate-200 bg-white p-4"
        >
          <div className="flex flex-col gap-1">
            <label htmlFor="persona-name" className="text-sm font-medium text-slate-900">
              Name
            </label>
            <input
              id="persona-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="rounded border border-slate-300 p-2 text-sm"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="persona-role" className="text-sm font-medium text-slate-900">
              Role
            </label>
            <input
              id="persona-role"
              value={role}
              onChange={(event) => setRole(event.target.value)}
              className="rounded border border-slate-300 p-2 text-sm"
              placeholder="One line: what this persona is in the room to do."
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="persona-charter" className="text-sm font-medium text-slate-900">
              Charter
            </label>
            <textarea
              id="persona-charter"
              rows={6}
              value={charter}
              onChange={(event) => setCharter(event.target.value)}
              className="rounded border border-slate-300 p-2 text-sm"
              placeholder="Perspective, expertise, and disposition."
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="persona-color" className="text-sm font-medium text-slate-900">
              Color
            </label>
            <input
              id="persona-color"
              type="color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              className="h-9 w-16 rounded border border-slate-300"
            />
          </div>

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
            disabled={submitting}
            className="self-start rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            {editingId === null ? 'Create persona' : 'Save persona'}
          </button>
        </form>
      </section>
    </div>
  )
}
