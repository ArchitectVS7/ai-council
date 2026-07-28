/**
 * `/sessions/[id]` — the server shell for the chamber (PRD §6).
 *
 * It reads the session once so the first paint is real content, then hands the
 * exact payload the API returns to the client component, which refetches the
 * same shape after every mutation.
 *
 * `force-dynamic` for the same reason the route handlers use it: `next build`
 * must never need `DATABASE_URL`.
 */
import { notFound } from 'next/navigation'

import Chamber from '@/components/chamber'
import { sessionIdSchema } from '@/lib/api/schemas'
import { loadSessionView } from '@/lib/session/view'

export const dynamic = 'force-dynamic'

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const parsed = sessionIdSchema.safeParse(id)
  if (!parsed.success) notFound()

  const view = await loadSessionView(parsed.data)
  if (!view) notFound()

  return <Chamber initialView={view} />
}
