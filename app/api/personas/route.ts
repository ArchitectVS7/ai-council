/**
 * `GET  /api/personas` — the persona library for the grid on `/personas`.
 * `POST /api/personas` — create a persona (PRD §8: CRUD, zod-validated).
 *
 * Database access goes exclusively through `lib/db/repo.ts`. The response
 * carries only the four editable fields plus the id: `archived` and the
 * timestamps have no reader on the client, and the library never lists an
 * archived persona in the first place.
 */
import { badRequest, serverError } from '@/lib/api/http'
import { personaInputSchema } from '@/lib/api/schemas'
import { insertPersona, listPersonas } from '@/lib/db/repo'
import { toPersonaSummary } from '@/lib/personas/types'

// Reads the database on every request; nothing here may be evaluated at build
// time, where `DATABASE_URL` is deliberately absent.
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    return Response.json({ personas: await listPersonas() })
  } catch (error) {
    return serverError(error)
  }
}

export async function POST(request: Request) {
  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return badRequest('Request body must be valid JSON.')
    }

    const parsed = personaInputSchema.safeParse(body)
    if (!parsed.success) {
      return badRequest('Invalid request body.', parsed.error.issues)
    }

    const persona = await insertPersona(parsed.data)
    return Response.json({ persona: toPersonaSummary(persona) }, { status: 201 })
  } catch (error) {
    return serverError(error)
  }
}
