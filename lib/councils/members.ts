/**
 * Speaking-order arithmetic for the councils builder (T-023, PRD §6 screen 3).
 *
 * Deliberately `lib/councils/` (plural) and not `lib/council/`: the singular
 * directory is the pure session domain — snapshot, scheduler, prompt, transcript
 * — and `lib/council/purity.test.ts` enumerates exactly what lives there. These
 * helpers are about the council *library* row shape, not about running a
 * session, so they are kept apart rather than smuggled in.
 *
 * Pure by design: no database, no HTTP, no React.
 */

/** One `council_members` row as the client submits it and the server stores it. */
export type CouncilMemberInput = {
  personaId: string
  position: number
}

/**
 * Order members by their submitted position, then renumber them `0..n-1`.
 *
 * The client's positions are advisory (server-authoritative, PRD §5.1): the
 * builder may hand up `0, 5, 9` after a few removals, and the stored speaking
 * order must still be contiguous so `council_members`'s composite primary key
 * `(council_id, position)` describes one unambiguous sequence.
 *
 * Total — there is no refusal case. Duplicate `personaId`s are rejected earlier
 * by `councilInputSchema`, and duplicate *positions* simply resolve here:
 * `Array.prototype.sort` is stable, so members that tie on position keep the
 * order they were submitted in. The input array is copied, never sorted in place.
 */
export function normalizeCouncilMembers(members: CouncilMemberInput[]): CouncilMemberInput[] {
  return [...members]
    .sort((a, b) => a.position - b.position)
    .map((member, index) => ({ personaId: member.personaId, position: index }))
}

/**
 * The first submitted `personaId` that is not in `known`, or null when every
 * member exists.
 *
 * Both write routes ask this so an unknown id becomes a 400 that names the
 * offender, rather than a raw foreign-key violation surfacing as a 500 (R4).
 */
export function findUnknownPersonaId(
  members: CouncilMemberInput[],
  known: Iterable<string>,
): string | null {
  const ids = new Set(known)
  for (const member of members) {
    if (!ids.has(member.personaId)) return member.personaId
  }
  return null
}
