/**
 * Markdown export of a session (PRD §6: "Export Markdown (copy + download)").
 *
 * Pure and dependency-free, like the rest of `lib/council/`: it takes the data
 * the chamber already holds and returns a string. It never reaches a database,
 * a provider, or the clipboard — the caller owns all of that.
 *
 * Snapshot rule (PRD §7): the council name comes from `snapshot.name`. The
 * serializer has no access to a council id and must not gain one.
 */
import { CONVENER_LABEL } from './transcript'
import type { CouncilSnapshot, TranscriptTurn } from './types'

/** The fixed document title; the topic is a metadata field, not the H1. */
const DOCUMENT_TITLE = '# AI Council Session'

/**
 * What the serializer needs from a session. Module-local until a caller names it
 * (R2 / knip); `TranscriptTurn` rows and chamber turns are both assignable.
 *
 * `createdAt` is a `Date` when a server component passes the row down and an ISO
 * string after a client refetch, hence the union.
 */
type SessionExport = {
  topic: string
  snapshot: CouncilSnapshot
  createdAt: string | Date
  turns: TranscriptTurn[]
}

/** `YYYY-MM-DD` in UTC, so the output does not vary with the reader's clock. */
function isoDate(createdAt: string | Date): string {
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) {
    // R4: an unreadable timestamp is a bug upstream, not something to paper over
    // with "unknown date".
    throw new Error(`Session has an unreadable createdAt: ${String(createdAt)}`)
  }
  return date.toISOString().slice(0, 10)
}

function speakerOf(turn: TranscriptTurn): string {
  if (turn.speakerName === null || turn.speakerName === '') {
    throw new Error(`Turn ${turn.seq} of kind "${turn.kind}" has no speaker name.`)
  }
  return turn.speakerName
}

/** A Markdown blockquote, every line prefixed so multi-line content stays quoted. */
function blockquote(label: string, content: string): string {
  const lines = content.split('\n')
  const [first = '', ...rest] = lines
  const head = `> **${label}:** ${first}`.trimEnd()
  const tail = rest.map((line) => (line.trim() === '' ? '>' : `> ${line}`))
  return [head, ...tail].join('\n')
}

function renderTurn(turn: TranscriptTurn): string {
  if (turn.kind === 'interjection') {
    return blockquote(CONVENER_LABEL, turn.content)
  }
  return `### ${speakerOf(turn)}\n\n${turn.content}`
}

/**
 * The session as a Markdown document: header, one `## Round n` section per round
 * in ascending order, then a single trailing `## Synthesis` section whose latest
 * entry is labelled `### Result`.
 *
 * Failed turns are omitted entirely (PRD §5.4), including any round heading they
 * would have been the only occupant of.
 */
export function exportSessionMarkdown(session: SessionExport): string {
  const turns = session.turns
    .filter((turn) => turn.status !== 'failed')
    .slice()
    .sort((a, b) => a.seq - b.seq)

  const blocks: string[] = [
    DOCUMENT_TITLE,
    [
      `- **Topic:** ${session.topic}`,
      `- **Council:** ${session.snapshot.name}`,
      `- **Date:** ${isoDate(session.createdAt)}`,
    ].join('\n'),
  ]

  const spoken = turns.filter((turn) => turn.kind !== 'synthesis')
  const rounds = [...new Set(spoken.map((turn) => turn.round))].sort((a, b) => a - b)
  for (const round of rounds) {
    blocks.push(`## Round ${round}`)
    for (const turn of spoken.filter((t) => t.round === round)) blocks.push(renderTurn(turn))
  }

  const syntheses = turns.filter((turn) => turn.kind === 'synthesis')
  if (syntheses.length > 0) {
    blocks.push('## Synthesis')
    syntheses.forEach((turn, index) => {
      const latest = index === syntheses.length - 1
      blocks.push(latest ? '### Result' : `### Synthesis — Round ${turn.round}`)
      blocks.push(turn.content)
    })
  }

  return `${blocks.join('\n\n')}\n`
}

/**
 * The extension-free download name shared by every export of a session:
 * `council-session-<topic-slug>-<YYYY-MM-DD>`.
 *
 * Extracted so the Markdown document and the JSON session document (T-031)
 * cannot drift into two different slug rules for the same session.
 */
export function sessionBasename(session: Pick<SessionExport, 'topic' | 'createdAt'>): string {
  const slug =
    session.topic
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60)
      .replace(/-+$/, '') || 'session'
  return `council-session-${slug}-${isoDate(session.createdAt)}`
}

/** Deterministic download name: `council-session-<topic-slug>-<YYYY-MM-DD>.md`. */
export function markdownFilename(session: Pick<SessionExport, 'topic' | 'createdAt'>): string {
  return `${sessionBasename(session)}.md`
}
