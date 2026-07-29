/**
 * `/personas` — Personas (PRD §6 screen 4): library grid + editor.
 *
 * The library is read on the server so the first paint is real content; the
 * grid and the editor are one client component because they share the list that
 * every write updates.
 *
 * `force-dynamic` for the same reason the route handlers use it: `next build`
 * must never need `DATABASE_URL`. A connection failure surfaces as an error
 * rather than an empty library (R4).
 */

import PersonaLibrary from '@/components/persona-library'
import { listPersonas } from '@/lib/db/repo'

export const dynamic = 'force-dynamic'

export default async function PersonasPage() {
  const personas = await listPersonas()

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Personas</h1>

      <PersonaLibrary initialPersonas={personas} />
    </main>
  )
}
