/**
 * `/` — Sessions (PRD §6 screen 1), the home page.
 *
 * The list is read on the server so the first paint is real content; the "New
 * session" form is a client component because it drives `POST /api/sessions`
 * and navigates to the chamber the server creates.
 *
 * `force-dynamic` for the same reason the route handlers use it: `next build`
 * must never need `DATABASE_URL`. A connection failure surfaces as an error
 * rather than an empty list (R4).
 */
import Link from 'next/link'

import NewSessionForm from '@/components/new-session-form'
import SessionList from '@/components/session-list'
import { listSessions } from '@/lib/db/repo'

export const dynamic = 'force-dynamic'

export default async function SessionsPage() {
  const sessions = await listSessions()

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 p-6">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">AI Council</h1>
        <Link href="/personas" className="text-sm text-slate-600 underline underline-offset-2">
          Personas
        </Link>
      </div>

      <section aria-labelledby="new-session" className="flex flex-col gap-3">
        <h2 id="new-session" className="text-lg font-medium">
          New session
        </h2>
        <NewSessionForm />
      </section>

      <section aria-labelledby="sessions" className="flex flex-col gap-3">
        <h2 id="sessions" className="text-lg font-medium">
          Sessions
        </h2>
        <SessionList
          sessions={sessions.map((session) => ({
            id: session.id,
            topic: session.topic,
            // Already read from `council_snapshot` by the repo (PRD §7).
            councilName: session.councilName,
            status: session.status,
            updatedAt: session.updatedAt.toISOString(),
          }))}
        />
      </section>
    </main>
  )
}
