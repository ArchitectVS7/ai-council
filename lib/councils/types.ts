/**
 * The wire shapes the councils builder on `/councils` renders from (T-023,
 * PRD §6 screen 3: name, description, ordered member list, default rounds).
 *
 * `name` and `color` are carried per member rather than looked up client-side
 * from the persona library: a council may still seat a persona that has since
 * been archived, and `listPersonas()` omits those. Resolving the label on the
 * client would render that seat as "unknown" — a quiet degradation (R4).
 *
 * Client-safe by construction: nothing here imports a server module.
 */

/** One seat in a council's speaking order, already joined to its persona. */
export type CouncilMemberSummary = {
  personaId: string
  /** Contiguous, `0`-based, ascending — see `normalizeCouncilMembers`. */
  position: number
  name: string
  color: string
}

/** One council of the library, with its speaking order in ascending position. */
export type CouncilDetail = {
  id: string
  name: string
  description: string | null
  /**
   * PRD Amendment A3: fed to every member on every turn, unlike `description`,
   * which is display-only. Null when the council has none.
   */
  directive: string | null
  defaultRounds: number
  members: CouncilMemberSummary[]
}
