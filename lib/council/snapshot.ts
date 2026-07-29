/**
 * Council snapshot construction (PRD §7 of `design-docs/02-PRD-Rebuild.md`).
 *
 * A session freezes its council at creation time into `sessions.council_snapshot`
 * `{name, rounds, members:[{name, role, charter, color}]}`. Sessions render
 * exclusively from that copy; `sessions.council_id` is provenance only and is
 * never joined for rendering. Editing or archiving a council later therefore
 * cannot alter a finished transcript.
 *
 * Pure by design — no database, no HTTP, no provider. The route handler reads
 * the council rows through `lib/db/repo.ts` and hands them here.
 */
import type { CouncilSnapshot } from './types'

/** PRD §5.3: "Council: 2–8 personas. Rounds per run: 1–5." */
export const MIN_COUNCIL_MEMBERS = 2
export const MAX_COUNCIL_MEMBERS = 8
export const MIN_ROUNDS = 1
export const MAX_ROUNDS = 5

/**
 * PRD Amendment A3: the council directive is fed to every member on every turn,
 * so it is bounded well below the transcript budget. Owned here beside the other
 * council bounds; `lib/api/schemas.ts` and `lib/transfer/schema.ts` import it
 * rather than restating it, so the write boundary and the import boundary cannot
 * disagree about how long a legal directive is.
 */
export const MAX_DIRECTIVE_LENGTH = 2_000

/** One `council_members` row joined to its persona, as read from the database. */
export type SnapshotSourceMember = {
  name: string
  role: string
  charter: string
  color: string
  /** Speaking order, as stored in `council_members.position`. */
  position: number
}

/** The council row plus its ordered membership. */
export type SnapshotSource = {
  name: string
  defaultRounds: number
  /** `councils.directive` (PRD Amendment A3); null when the council has none. */
  directive: string | null
  members: SnapshotSourceMember[]
}

/**
 * Refusals are values, not exceptions: the route maps `ok: false` to a 4xx whose
 * body carries `message` verbatim (R4 — nothing is guessed or degraded).
 */
export type SnapshotResult =
  | { ok: true; snapshot: CouncilSnapshot }
  | { ok: false; message: string }

const MEMBER_FIELDS = ['name', 'role', 'charter', 'color'] as const

/**
 * Copy a council into the immutable snapshot shape of PRD §7.
 *
 * `roundsOverride` is the caller's optional `rounds` field; when absent the
 * council's own `default_rounds` applies. Members are ordered by `position`
 * here rather than trusting the caller's array order.
 */
export function buildCouncilSnapshot(
  council: SnapshotSource,
  roundsOverride?: number,
): SnapshotResult {
  const name = council.name.trim()
  if (name.length === 0) {
    return { ok: false, message: 'Council has no name; cannot snapshot it.' }
  }

  const rounds = roundsOverride ?? council.defaultRounds
  if (!Number.isInteger(rounds) || rounds < MIN_ROUNDS || rounds > MAX_ROUNDS) {
    return {
      ok: false,
      message: `Rounds must be a whole number between ${MIN_ROUNDS} and ${MAX_ROUNDS}; got ${rounds}.`,
    }
  }

  const count = council.members.length
  if (count < MIN_COUNCIL_MEMBERS || count > MAX_COUNCIL_MEMBERS) {
    return {
      ok: false,
      message: `Council "${name}" has ${count} members; it must have between ${MIN_COUNCIL_MEMBERS} and ${MAX_COUNCIL_MEMBERS}.`,
    }
  }

  const positions = new Set<number>()
  for (const member of council.members) {
    if (positions.has(member.position)) {
      return {
        ok: false,
        message: `Council "${name}" has two members at position ${member.position}; the speaking order is ambiguous.`,
      }
    }
    positions.add(member.position)

    for (const field of MEMBER_FIELDS) {
      if (member[field].trim().length === 0) {
        return {
          ok: false,
          message: `Council "${name}" has a member at position ${member.position} with an empty ${field}.`,
        }
      }
    }
  }

  // Exactly the four PRD §7 fields, in order — no persona id, no position. The
  // snapshot is a self-contained copy, so nothing in it can point back at a row
  // that may later change.
  const members = [...council.members]
    .sort((a, b) => a.position - b.position)
    .map((member) => ({
      name: member.name.trim(),
      role: member.role.trim(),
      charter: member.charter.trim(),
      color: member.color.trim(),
    }))

  // A3: the key is emitted only when there is something to say. A directive-less
  // council therefore produces byte-identical JSON to a pre-A3 snapshot, which is
  // what keeps the transfer round trip and the snapshot-immunity bytes stable.
  // No new refusal path: the 2,000-character bound is enforced at the write
  // boundary, and a legacy over-long row must not brick an existing council.
  const directive = council.directive?.trim() ?? ''

  return {
    ok: true,
    snapshot: { name, rounds, ...(directive.length === 0 ? {} : { directive }), members },
  }
}
