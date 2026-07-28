/**
 * `GET  /api/councils` — the council library, for the picker on `/` (PRD §8).
 * `POST /api/councils` — create a council and its speaking order (T-023).
 *
 * The two verbs answer deliberately different shapes. `GET` stays the flat list
 * the picker consumes (`{id, name, description, defaultRounds}`); `POST` answers
 * the full council, members included, because the builder re-renders from what
 * was stored rather than from what was typed.
 *
 * Positions submitted by the client are advisory: `normalizeCouncilMembers`
 * renumbers them to contiguous `0..n-1` before anything is written, so the
 * server alone decides the speaking order (PRD §5.1, server-authoritative).
 *
 * Database access goes exclusively through `lib/db/repo.ts`.
 */
import { badRequest, serverError } from '@/lib/api/http'
import { councilInputSchema } from '@/lib/api/schemas'
import { findUnknownPersonaId, normalizeCouncilMembers } from '@/lib/councils/members'
import {
  findCouncilDetail,
  findPersonasByIds,
  insertCouncil,
  listCouncils,
  replaceCouncilMembers,
} from '@/lib/db/repo'

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

export async function POST(request: Request) {
  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return badRequest('Request body must be valid JSON.')
    }

    const parsed = councilInputSchema.safeParse(body)
    if (!parsed.success) {
      return badRequest('Invalid request body.', parsed.error.issues)
    }
    const { name, description, defaultRounds, members } = parsed.data

    const known = await findPersonasByIds(members.map((member) => member.personaId))
    const unknown = findUnknownPersonaId(
      members,
      known.map((persona) => persona.id),
    )
    if (unknown !== null) {
      return badRequest(`Persona ${unknown} is not in the library; it cannot be seated.`)
    }

    const created = await insertCouncil({ name, description, defaultRounds })
    await replaceCouncilMembers(created.id, normalizeCouncilMembers(members))

    return Response.json({ council: await findCouncilDetail(created.id) }, { status: 201 })
  } catch (error) {
    return serverError(error)
  }
}
