/**
 * `/councils` — Councils (PRD §6 screen 3): list + form editor.
 *
 * The library and the persona list are read on the server so the first paint is
 * real content; the list and the editor are one client component because they
 * share the list that every write updates.
 *
 * `force-dynamic` for the same reason the route handlers use it: `next build`
 * must never need `DATABASE_URL`. A connection failure surfaces as an error
 * rather than an empty library (R4).
 */
import Link from 'next/link'

import CouncilBuilder from '@/components/council-builder'
import { listCouncilsWithMembers, listPersonas } from '@/lib/db/repo'

export const dynamic = 'force-dynamic'

export default async function CouncilsPage() {
  const [councils, personas] = await Promise.all([listCouncilsWithMembers(), listPersonas()])

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 p-6">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Councils</h1>
        <nav className="flex gap-4 text-sm text-slate-600">
          <Link href="/" className="underline underline-offset-2">
            Sessions
          </Link>
          <Link href="/personas" className="underline underline-offset-2">
            Personas
          </Link>
        </nav>
      </div>

      <CouncilBuilder initialCouncils={councils} personas={personas} />
    </main>
  )
}
