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
 *
 * The `(home)` route group changes no URL — this is still `/`. It exists purely
 * so the sessions-shaped `loading.tsx` beside it is scoped to this page instead
 * of becoming the Suspense fallback for `/personas` and `/councils` too.
 */

import ImportSession from '@/components/import-session'
import NewSessionForm from '@/components/new-session-form'
import SessionList from '@/components/session-list'
import { listSessions } from '@/lib/db/repo'
import { getProviderName } from '@/lib/llm'

export const dynamic = 'force-dynamic'

export default async function SessionsPage() {
  const sessions = await listSessions()

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 p-6">
      {/* No link row here: `components/app-header.tsx` owns every navigation
          link in the app, and the root layout renders it above this page. */}
      <h1 className="text-2xl font-semibold tracking-tight">Sessions</h1>

      <section aria-labelledby="new-session" className="flex flex-col gap-3">
        <h2 id="new-session" className="text-lg font-medium">
          New session
        </h2>
        {/* The provider name is read on the server and handed down as a plain
            string so the model picker can offer that provider's curated list
            (PRD Amendment A1). No key material crosses the boundary. */}
        <NewSessionForm provider={getProviderName()} />
      </section>

      <section aria-labelledby="import-session" className="flex flex-col gap-3">
        <h2 id="import-session" className="text-lg font-medium">
          Import session
        </h2>
        {/* The counterpart of the chamber's Download .json (T-031). No server
            data is needed: the file itself is the whole request. */}
        <ImportSession />
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
