'use client'

/**
 * "Import session" on `/` (T-031) — the other half of the chamber's
 * **Download .json**.
 *
 * The file is posted *verbatim* to `POST /api/sessions`, which recognises a
 * session document by its `schemaVersion` key. Nothing is parsed, repaired, or
 * pre-validated here: the server is the single validator, so a file that is not
 * JSON at all comes back with the route's own "Request body must be valid
 * JSON.", and a file that is JSON but not a session document comes back with
 * zod's issue messages, which `describeFailure` appends to the sentence shown
 * below the control (R4).
 *
 * Server-authoritative (PRD §5.1): this component never constructs a session, a
 * status, or a turn cursor. It navigates to whatever id the server hands back.
 */
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import { describeFailure, messageOf, readErrorBody } from '@/lib/api/failure'

export default function ImportSession() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  /** The chosen file's name, or null when nothing is chosen — the button's gate. */
  const [filename, setFilename] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onImport() {
    const file = inputRef.current?.files?.[0]
    if (!file) return

    setError(null)
    setSubmitting(true)
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // The file's exact bytes. Reformatting it here would mean the server
        // validated something the convener never exported.
        body: await file.text(),
      })

      if (!response.ok) {
        setError(describeFailure(await readErrorBody(response), response.status))
        return
      }

      const body = (await response.json()) as { session: { id: string } }
      router.push(`/sessions/${body.session.id}`)
    } catch (importError) {
      setError(messageOf(importError))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="session-document" className="text-sm font-medium text-slate-900">
          Session document
        </label>
        <input
          id="session-document"
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          className="text-sm"
          onChange={(event) => {
            setError(null)
            setFilename(event.target.files?.[0]?.name ?? null)
          }}
        />
        <span className="text-xs text-slate-600">
          A <code>.json</code> file exported from a chamber. The imported session keeps its status
          and its whole transcript.
        </span>
      </div>

      {error === null ? null : (
        <p role="alert" className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={submitting || filename === null}
        onClick={() => void onImport()}
        className="self-start rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
      >
        Import session
      </button>
    </div>
  )
}
