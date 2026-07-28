/**
 * `GET /api/councils` — the council library, for the picker on `/` (PRD §8).
 *
 * Read-only on purpose. PRD §8 lists full CRUD under `/api/councils`, but the
 * write verbs and the `/councils` screen belong to T-023; shipping them here
 * would put code in the tree with no caller (R2), so they are simply absent.
 *
 * Database access goes exclusively through `lib/db/repo.ts`.
 */
import { serverError } from '@/lib/api/http'
import { listCouncils } from '@/lib/db/repo'

// Reads the database on every request; nothing here may be evaluated at build
// time, where `DATABASE_URL` is deliberately absent.
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    return Response.json({ councils: await listCouncils() })
  } catch (error) {
    return serverError(error)
  }
}
