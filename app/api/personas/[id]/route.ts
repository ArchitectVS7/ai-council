/**
 * `PUT    /api/personas/[id]` — replace a persona's four editable fields.
 * `DELETE /api/personas/[id]` — archive when referenced, delete when not (PRD §8).
 *
 * The DELETE contract is the point of this file: PRD §6 screen 4 says "archive
 * instead of delete when referenced by any council or session", so the response
 * body reports which of the two happened as `{ archived: boolean }` rather than
 * leaving the caller to guess.
 *
 * Database access goes exclusively through `lib/db/repo.ts`.
 */
import { badRequest, notFound, serverError } from '@/lib/api/http'
import { personaIdSchema, personaInputSchema } from '@/lib/api/schemas'
import {
  archivePersona,
  countPersonaReferences,
  deletePersona,
  findPersona,
  updatePersona,
} from '@/lib/db/repo'
import { toPersonaSummary } from '@/lib/personas/types'

export const dynamic = 'force-dynamic'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const parsedId = personaIdSchema.safeParse(id)
    if (!parsedId.success) {
      return badRequest('Invalid persona id.', parsedId.error.issues)
    }

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

    const persona = await updatePersona(parsedId.data, parsed.data)
    if (!persona) {
      return notFound(`Persona ${parsedId.data} not found.`)
    }

    return Response.json({ persona: toPersonaSummary(persona) })
  } catch (error) {
    return serverError(error)
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const parsedId = personaIdSchema.safeParse(id)
    if (!parsedId.success) {
      return badRequest('Invalid persona id.', parsedId.error.issues)
    }

    const persona = await findPersona(parsedId.data)
    if (!persona) {
      return notFound(`Persona ${parsedId.data} not found.`)
    }

    // Already retired: report the same fact without a second write.
    if (persona.archived) {
      return Response.json({ archived: true })
    }

    // The reference check exists because `council_members.persona_id` cascades
    // on delete — dropping a referenced persona would silently shorten a
    // council's speaking order. Sessions need no such protection: they render
    // from `council_snapshot`, so a delete cannot reach a finished transcript.
    // The check→act window is not locked: this is a single-convener app, the
    // same reason PRD §8 accepts an in-memory rate limiter.
    const references = await countPersonaReferences({ id: persona.id, name: persona.name })
    if (references > 0) {
      await archivePersona(persona.id)
      return Response.json({ archived: true })
    }

    await deletePersona(persona.id)
    return Response.json({ archived: false })
  } catch (error) {
    return serverError(error)
  }
}
