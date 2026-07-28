/**
 * The wire shape the personas library and editor render from (T-022, PRD §6
 * screen 4: name, role, charter, color).
 *
 * A deliberate structural *subset* of the drizzle-derived persona row in
 * `lib/db/repo.ts`, so a row produced on the server is assignable without a
 * cast. `archived` and the timestamps are absent on purpose: the library only
 * ever shows unarchived personas, and an archived flag on the wire would be a
 * field with no reader.
 *
 * Client-safe by construction: nothing here imports a server module, and
 * `toPersonaSummary` is a pure projection with no database or HTTP knowledge.
 */

export type PersonaSummary = {
  id: string
  name: string
  role: string
  charter: string
  color: string
}

/**
 * Project a persona row onto the wire shape.
 *
 * Explicit field-by-field rather than a spread so a column added later (PRD §7
 * allows only the five tables it lists) cannot leak onto the wire unnoticed.
 */
export function toPersonaSummary(row: PersonaSummary): PersonaSummary {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    charter: row.charter,
    color: row.color,
  }
}
