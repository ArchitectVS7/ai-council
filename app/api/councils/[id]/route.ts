/**
 * `PUT    /api/councils/[id]` — replace a council's fields and its speaking order.
 * `DELETE /api/councils/[id]` — archive when referenced, delete when not (PRD §8).
 *
 * There is no `GET` here: the builder already holds every council it can edit,
 * so a single-council read would be code with no caller (R2).
 *
 * Editing is safe by construction. A session renders from `council_snapshot`,
 * frozen at creation (PRD §7), so renaming a council or reordering its members
 * cannot reach a transcript that already ran —
 * `app/api/councils/snapshot-immunity.test.ts` pins that byte for byte.
 *
 * DELETE reports which of the two things happened as `{archived: boolean}`
 * rather than leaving the caller to guess, exactly as `/api/personas/[id]` does.
 * Archiving matters here because `sessions.council_id` is `on delete set null`:
 * a hard delete of a referenced council would erase the provenance of past runs
 * while leaving their transcripts untouched.
 *
 * Database access goes exclusively through `lib/db/repo.ts`.
 */
import { badRequest, notFound, serverError } from '@/lib/api/http'
import { councilIdSchema, councilInputSchema } from '@/lib/api/schemas'
import { findUnknownPersonaId, normalizeCouncilMembers } from '@/lib/councils/members'
import {
  archiveCouncil,
  countCouncilReferences,
  deleteCouncil,
  findCouncil,
  findCouncilDetail,
  findPersonasByIds,
  replaceCouncilMembers,
  updateCouncil,
} from '@/lib/db/repo'

export const dynamic = 'force-dynamic'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const parsedId = councilIdSchema.safeParse(id)
    if (!parsedId.success) {
      return badRequest('Invalid council id.', parsedId.error.issues)
    }

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

    const updated = await updateCouncil(parsedId.data, { name, description, defaultRounds })
    if (!updated) {
      return notFound(`Council ${parsedId.data} not found.`)
    }

    await replaceCouncilMembers(updated.id, normalizeCouncilMembers(members))

    return Response.json({ council: await findCouncilDetail(updated.id) })
  } catch (error) {
    return serverError(error)
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const parsedId = councilIdSchema.safeParse(id)
    if (!parsedId.success) {
      return badRequest('Invalid council id.', parsedId.error.issues)
    }

    const council = await findCouncil(parsedId.data)
    if (!council) {
      return notFound(`Council ${parsedId.data} not found.`)
    }

    // Already retired: report the same fact without a second write.
    if (council.archived) {
      return Response.json({ archived: true })
    }

    // The check→act window is not locked: single-convener app, the same reason
    // PRD §8 accepts an in-memory rate limiter.
    const references = await countCouncilReferences(council.id)
    if (references > 0) {
      await archiveCouncil(council.id)
      return Response.json({ archived: true })
    }

    await deleteCouncil(council.id)
    return Response.json({ archived: false })
  } catch (error) {
    return serverError(error)
  }
}
