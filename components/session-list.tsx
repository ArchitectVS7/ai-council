/**
 * The sessions list on `/` (PRD §6 screen 1: topic, council name, status, last
 * activity).
 *
 * Presentational and server-renderable: it fetches nothing and holds no state,
 * so the home page can paint real rows on the first response.
 *
 * Snapshot rule (PRD §7): `councilName` arrives already read from
 * `council_snapshot`; nothing here resolves a council id.
 */
import Link from 'next/link'

import type { SessionListRow } from '@/lib/home/types'

/**
 * A fixed UTC rendering of an ISO timestamp.
 *
 * Deliberately not `toLocaleString`: the server and the browser would disagree
 * on locale and time zone, and the resulting hydration mismatch would be a
 * console error on the home page of the app.
 */
function formatLastActivity(iso: string): string {
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`
}

export default function SessionList({ sessions }: { sessions: SessionListRow[] }) {
  if (sessions.length === 0) {
    return <p className="text-sm text-slate-600">No sessions yet. Convene one above.</p>
  }

  return (
    <ol aria-label="Sessions" className="flex flex-col gap-2">
      {sessions.map((session) => (
        <li
          key={session.id}
          data-testid={`session-${session.id}`}
          className="rounded border border-slate-200 bg-white p-4"
        >
          <Link
            href={`/sessions/${session.id}`}
            className="font-medium text-slate-900 underline underline-offset-2"
          >
            {session.topic}
          </Link>
          <dl className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-slate-600">
            <div className="flex gap-1">
              <dt>Council:</dt>
              <dd className="text-slate-900">{session.councilName}</dd>
            </div>
            <div className="flex gap-1">
              <dt>Status:</dt>
              <dd className="text-slate-900">{session.status}</dd>
            </div>
            <div className="flex gap-1">
              <dt>Last activity:</dt>
              <dd className="text-slate-900">
                <time dateTime={session.updatedAt}>{formatLastActivity(session.updatedAt)}</time>
              </dd>
            </div>
          </dl>
        </li>
      ))}
    </ol>
  )
}
