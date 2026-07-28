/**
 * `GET /api/sessions/[id]` — one session plus its transcript in `seq` order,
 * and the `mockMode` flag the chamber badges with (T-013).
 *
 * The response carries `councilSnapshot`; the client renders the council from
 * that copy alone. `councilId` is included as provenance and is never resolved
 * back into a live council row here (PRD §7 snapshot rule).
 *
 * The payload is assembled in `lib/session/view.ts` rather than here so this
 * file keeps its shape: no provider import, no drizzle import.
 */
import { badRequest, notFound, serverError } from '@/lib/api/http'
import { sessionIdSchema } from '@/lib/api/schemas'
import { loadSessionView } from '@/lib/session/view'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const parsed = sessionIdSchema.safeParse(id)
    if (!parsed.success) {
      return badRequest('Invalid session id.', parsed.error.issues)
    }

    const found = await loadSessionView(parsed.data)
    if (!found) {
      return notFound(`Session ${parsed.data} not found.`)
    }

    return Response.json(found)
  } catch (error) {
    return serverError(error)
  }
}
