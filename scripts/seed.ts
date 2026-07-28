/**
 * Writes the default personas and councils of `lib/seed-data.ts` to the database.
 *
 * Idempotent: rows are matched by name, then updated in place or inserted. A
 * council's members are replaced wholesale so that reordering converges. Never
 * touches `archived`, so re-seeding cannot silently revive something the user
 * archived on purpose. Requires `DATABASE_URL`; `getDb()` throws when it is
 * absent (PRD R4 — no fallback). Not part of `npm run check`.
 *
 * Usage: `npm run seed`
 */
import { eq } from 'drizzle-orm'

import { getDb } from '../lib/db'
import { councilMembers, councils, personas } from '../lib/db/schema'
import { seedCouncils, seedPersonas } from '../lib/seed-data'

async function main() {
  const db = getDb()

  const personaIdsByName = new Map<string, string>()
  let personasInserted = 0
  let personasUpdated = 0

  for (const persona of seedPersonas) {
    const [existing] = await db
      .select({ id: personas.id })
      .from(personas)
      .where(eq(personas.name, persona.name))
      .limit(1)

    if (existing) {
      await db
        .update(personas)
        .set({
          role: persona.role,
          charter: persona.charter,
          color: persona.color,
          updatedAt: new Date(),
        })
        .where(eq(personas.id, existing.id))
      personaIdsByName.set(persona.name, existing.id)
      personasUpdated += 1
    } else {
      const [inserted] = await db.insert(personas).values(persona).returning({ id: personas.id })
      personaIdsByName.set(persona.name, inserted.id)
      personasInserted += 1
    }
  }

  let councilsInserted = 0
  let councilsUpdated = 0
  let memberRows = 0

  for (const council of seedCouncils) {
    const [existing] = await db
      .select({ id: councils.id })
      .from(councils)
      .where(eq(councils.name, council.name))
      .limit(1)

    let councilId: string
    if (existing) {
      await db
        .update(councils)
        .set({
          description: council.description,
          defaultRounds: council.defaultRounds,
          updatedAt: new Date(),
        })
        .where(eq(councils.id, existing.id))
      councilId = existing.id
      councilsUpdated += 1
    } else {
      const [inserted] = await db
        .insert(councils)
        .values({
          name: council.name,
          description: council.description,
          defaultRounds: council.defaultRounds,
        })
        .returning({ id: councils.id })
      councilId = inserted.id
      councilsInserted += 1
    }

    const rows = council.members.map((name, position) => {
      const personaId = personaIdsByName.get(name)
      if (!personaId) {
        throw new Error(
          `Council "${council.name}" names member "${name}", which is not one of the seed personas.`,
        )
      }
      return { councilId, personaId, position }
    })

    // The composite primary key is (council_id, position), so a partial update
    // cannot express a reorder. Replace the whole speaking order instead.
    await db.delete(councilMembers).where(eq(councilMembers.councilId, councilId))
    await db.insert(councilMembers).values(rows)
    memberRows += rows.length
  }

  console.log(`personas:  ${personasInserted} inserted, ${personasUpdated} updated`)
  console.log(`councils:  ${councilsInserted} inserted, ${councilsUpdated} updated`)
  console.log(`members:   ${memberRows} rows written`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
