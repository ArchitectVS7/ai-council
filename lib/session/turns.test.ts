/**
 * The T-012 acceptance suite.
 *
 * Nothing here touches a database or a network: `lib/db/repo` is replaced by an
 * in-memory double, and `lib/llm` runs its real deterministic `mock` provider
 * behind a thin wrapper that lets a test inject a provider error or hold a call
 * open. `fetch` is stubbed to throw so a regression that reaches a real provider
 * fails the suite instead of hanging.
 *
 * Extended for T-030: advance and synthesize are streams now, so most of the
 * suite reads their terminal event through `collect` and the streaming rules
 * themselves — chunk accumulation, write-once persistence, mid-stream failure
 * and abort — get their own describes at the foot of the file.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  ADDRESS_INTERJECTION_INSTRUCTION,
  CONVENER_NOTE_HEADING,
  ROUND_INSTRUCTIONS,
  SYNTHESIS_MAX_TOKENS,
} from '@/lib/council/prompt'
import type { CouncilSnapshot } from '@/lib/council/types'
import { generate, type GenerateOptions } from '@/lib/llm'
import { CHAIR_PERSONA, CHAIR_PERSONA_NAME } from '@/lib/seed-data'

import {
  ABORTED_BY_CONVENER,
  addInterjection,
  advanceSessionStream,
  regenerateLastTurn,
  reopenSession,
  retryLastTurn,
  synthesizeSessionStream,
  type TurnResult,
  type TurnStreamEvent,
} from './turns'

type FakeSession = {
  id: string
  topic: string
  councilId: string | null
  /** The per-session model override (PRD Amendment A1); null = the env default. */
  model: string | null
  councilSnapshot: CouncilSnapshot
  status: 'active' | 'completed' | 'abandoned'
  turnCursor: number
  createdAt: Date
  updatedAt: Date
  completedAt: Date | null
}

type FakeTurn = {
  id: string
  sessionId: string
  seq: number
  kind: 'persona' | 'interjection' | 'synthesis'
  speakerName: string | null
  round: number
  content: string
  status: 'complete' | 'failed'
  error: string | null
  model: string | null
  promptTokens: number | null
  completionTokens: number | null
  createdAt: Date
}

const db = vi.hoisted(() => ({
  sessions: new Map<string, Record<string, unknown>>(),
  turns: [] as Record<string, unknown>[],
  turnIds: 0,
}))

vi.mock('@/lib/db/repo', () => ({
  findSessionWithTurns: async (sessionId: string) => {
    const session = db.sessions.get(sessionId)
    if (!session) return null
    return {
      session,
      turns: db.turns
        .filter((t) => t.sessionId === sessionId)
        .sort((a, b) => (a.seq as number) - (b.seq as number)),
    }
  },
  insertTurn: async (input: Record<string, unknown>) => {
    db.turnIds += 1
    const turn = { id: `turn-${db.turnIds}`, createdAt: new Date('2026-02-02T00:00:00Z'), ...input }
    db.turns.push(turn)
    return turn
  },
  updateTurnInPlace: async (turnId: string, patch: Record<string, unknown>) => {
    const turn = db.turns.find((t) => t.id === turnId)
    if (!turn) throw new Error(`Turn ${turnId} not found; nothing was updated.`)
    Object.assign(turn, patch)
    return { ...turn }
  },
  bumpTurnCursor: async (sessionId: string) => {
    const session = db.sessions.get(sessionId)
    if (!session) throw new Error(`Session ${sessionId} not found; the turn cursor was not advanced.`)
    session.turnCursor = (session.turnCursor as number) + 1
    session.updatedAt = new Date('2026-03-03T00:00:00Z')
    return { ...session }
  },
  markSessionCompleted: async (sessionId: string) => {
    const session = db.sessions.get(sessionId)
    if (!session) throw new Error(`Session ${sessionId} not found; its status was not changed.`)
    session.status = 'completed'
    session.completedAt = new Date('2026-03-03T00:00:00Z')
    session.updatedAt = new Date('2026-03-03T00:00:00Z')
    return { ...session }
  },
  touchSession: async (sessionId: string) => {
    const session = db.sessions.get(sessionId)
    if (!session) throw new Error(`Session ${sessionId} not found; its activity time was not updated.`)
    session.updatedAt = new Date('2026-04-04T00:00:00Z')
    return { ...session }
  },
  reopenSession: async (sessionId: string) => {
    const session = db.sessions.get(sessionId)
    if (!session) throw new Error(`Session ${sessionId} not found; its status was not changed.`)
    session.status = 'active'
    session.completedAt = null
    session.updatedAt = new Date('2026-04-04T00:00:00Z')
    return { ...session }
  },
}))

/** Test knobs on the real provider module. */
const provider = vi.hoisted(() => ({
  /** Thrown by the next `generate` call, then cleared — a provider outage. */
  nextError: null as Error | null,
  /** Awaited before every `generate` call, so a test can hold the lock open. */
  gate: null as Promise<void> | null,
  /** Thrown *after* this many deltas — an outage half-way through a stream. */
  errorAfterDeltas: null as number | null,
  midStreamError: null as Error | null,
  /** Aborts `controller` after this many deltas — the convener pressing Pause. */
  abortAfterDeltas: null as number | null,
  controller: null as AbortController | null,
}))

/**
 * The provider double.
 *
 * Both entry points are wrapped, and `generateStream` is built on the mocked
 * `generate`, for two reasons: `vi.mock` replaces exports only for *importers*,
 * so the real `generate` inside `lib/llm.ts` would ignore these knobs entirely;
 * and routing every call through one spy keeps `vi.mocked(generate).mock.calls`
 * a faithful, ordered record of what the provider was asked for, whichever entry
 * point the session service used.
 */
vi.mock('@/lib/llm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/llm')>()

  // The second argument is the resolved model (PRD Amendment A1); it is
  // forwarded rather than dropped so a test can assert what the provider was
  // actually asked for.
  const generate = vi.fn(async (options: GenerateOptions, model?: string | null) => {
    if (provider.gate) await provider.gate
    if (provider.nextError) {
      const error = provider.nextError
      provider.nextError = null
      throw error
    }
    return actual.generate(options, model)
  })

  return {
    ...actual,
    generate,
    generateStream: vi.fn(async function* (
      options: GenerateOptions,
      model?: string | null,
      signal?: AbortSignal,
    ) {
      const result = await generate(options, model)

      // Three slices, so "the deltas concatenate to the stored content" is a
      // real assertion rather than a one-chunk tautology.
      const size = Math.max(1, Math.ceil(result.text.length / 3))
      const pieces: string[] = []
      for (let i = 0; i < result.text.length; i += size) pieces.push(result.text.slice(i, i + size))

      let emitted = 0
      for (const text of pieces) {
        signal?.throwIfAborted()
        yield { type: 'delta' as const, text }
        emitted += 1

        if (provider.abortAfterDeltas === emitted) {
          provider.controller?.abort()
          signal?.throwIfAborted()
        }
        if (provider.errorAfterDeltas === emitted) {
          const error = provider.midStreamError ?? new Error('The provider stream broke.')
          provider.midStreamError = null
          provider.errorAfterDeltas = null
          throw error
        }
      }
      yield { type: 'done' as const, result }
    }),
  }
})

const SNAPSHOT: CouncilSnapshot = {
  name: 'Decision Panel',
  rounds: 2,
  members: [
    {
      name: 'The Pragmatist',
      role: 'Delivery-focused practitioner',
      charter: 'You judge every proposal by what it would take to actually ship it.',
      color: '#2563eb',
    },
    {
      name: 'The Skeptic',
      role: 'Risk and evidence analyst',
      charter: 'You want to know how anyone could tell if the claim on the table were false.',
      color: '#dc2626',
    },
  ],
}

let sessionCounter = 0

function createSession(overrides: Partial<FakeSession> = {}): FakeSession {
  sessionCounter += 1
  const id = `00000000-0000-4000-8000-${String(sessionCounter).padStart(12, '0')}`
  const created = new Date('2026-01-01T00:00:00Z')
  const session: FakeSession = {
    id,
    topic: 'Should we ship the beta this quarter?',
    councilId: null,
    model: null,
    councilSnapshot: SNAPSHOT,
    status: 'active',
    turnCursor: 0,
    createdAt: created,
    updatedAt: created,
    completedAt: null,
    ...overrides,
  }
  db.sessions.set(id, session as unknown as Record<string, unknown>)
  return session
}

function addTurn(sessionId: string, turn: Partial<FakeTurn> & { seq: number; kind: FakeTurn['kind'] }): void {
  db.turnIds += 1
  db.turns.push({
    id: `seeded-${db.turnIds}`,
    sessionId,
    speakerName: null,
    round: 1,
    content: 'Seeded transcript content.',
    status: 'complete',
    error: null,
    model: 'mock',
    promptTokens: 10,
    completionTokens: 10,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    ...turn,
  })
}

function storedSession(id: string): FakeSession {
  return db.sessions.get(id) as unknown as FakeSession
}

function storedTurns(id: string): FakeTurn[] {
  return db.turns.filter((t) => t.sessionId === id) as unknown as FakeTurn[]
}

/**
 * Drains a turn stream into the three things a test ever asks about.
 *
 * The terminal event is the result: `refused` (nothing was written) or `turn`
 * (the row that was stored, however it went). Anything else is a bug in the
 * service, so it throws rather than being reported as an empty success.
 */
async function collect(stream: AsyncGenerator<TurnStreamEvent>): Promise<{
  events: TurnStreamEvent[]
  deltas: string[]
  result: TurnResult
}> {
  const events: TurnStreamEvent[] = []
  for await (const event of stream) events.push(event)

  const deltas = events
    .filter((e): e is Extract<TurnStreamEvent, { type: 'delta' }> => e.type === 'delta')
    .map((e) => e.text)

  const terminal = events[events.length - 1]
  if (terminal === undefined) throw new Error('The turn stream yielded no events at all.')
  if (terminal.type === 'refused') {
    return { events, deltas, result: { ok: false, reason: terminal.reason, message: terminal.message } }
  }
  if (terminal.type === 'turn') return { events, deltas, result: terminal.result }
  throw new Error(`The turn stream ended on a "${terminal.type}" event.`)
}

/**
 * The streamed entry points, read as a single result.
 *
 * Most of this suite is about the rules of the loop, not about streaming, so it
 * reads the terminal event and moves on. The streaming-specific behaviour has
 * its own describe below, which consumes the events one at a time.
 */
async function advanceSession(sessionId: string, signal?: AbortSignal): Promise<TurnResult> {
  return (await collect(advanceSessionStream(sessionId, signal))).result
}

async function synthesizeSession(sessionId: string, signal?: AbortSignal): Promise<TurnResult> {
  return (await collect(synthesizeSessionStream(sessionId, signal))).result
}

/** Narrows a result to its success shape with a readable failure message. */
function expectOk(result: Awaited<ReturnType<typeof advanceSession>>) {
  if (!result.ok) throw new Error(`expected success, got ${result.reason}: ${result.message}`)
  return result
}

function expectRefused(result: Awaited<ReturnType<typeof advanceSession>>) {
  if (result.ok) throw new Error(`expected a refusal, got turn ${result.turn.seq}`)
  return result
}

/** Reopen writes no turn, so its result has no `turn` to narrow on. */
function expectSessionOk(result: Awaited<ReturnType<typeof reopenSession>>) {
  if (!result.ok) throw new Error(`expected success, got ${result.reason}: ${result.message}`)
  return result
}

function expectSessionRefused(result: Awaited<ReturnType<typeof reopenSession>>) {
  if (result.ok) throw new Error(`expected a refusal, got session ${result.session.status}`)
  return result
}

beforeEach(() => {
  db.sessions.clear()
  db.turns = []
  db.turnIds = 0
  provider.nextError = null
  provider.gate = null
  provider.errorAfterDeltas = null
  provider.midStreamError = null
  provider.abortAfterDeltas = null
  provider.controller = null
  vi.clearAllMocks()
  vi.stubEnv('LLM_PROVIDER', 'mock')
  // Blank so `getModel()` falls back to the provider default regardless of the
  // developer's `.env.local`.
  vi.stubEnv('LLM_MODEL', '')
  vi.stubGlobal(
    'fetch',
    vi.fn(() => {
      throw new Error('fetch must not be called in unit tests')
    }),
  )
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('advanceSession', () => {
  it('stores the first persona turn and counts it against the cap', async () => {
    const session = createSession()

    const result = expectOk(await advanceSession(session.id))

    expect(result.turn).toMatchObject({
      sessionId: session.id,
      seq: 0,
      kind: 'persona',
      speakerName: 'The Pragmatist',
      round: 1,
      status: 'complete',
      error: null,
      model: 'mock',
    })
    expect(result.turn.content.length).toBeGreaterThan(0)
    expect(result.turn.promptTokens).toBeGreaterThan(0)
    expect(result.plannedRoundsComplete).toBe(false)
    expect(result.session.turnCursor).toBe(1)
    expect(storedSession(session.id).turnCursor).toBe(1)
  })

  it('cycles the speaking order and rolls into the next round', async () => {
    const session = createSession()

    const first = expectOk(await advanceSession(session.id))
    const second = expectOk(await advanceSession(session.id))
    const third = expectOk(await advanceSession(session.id))

    expect([first.turn.speakerName, second.turn.speakerName, third.turn.speakerName]).toEqual([
      'The Pragmatist',
      'The Skeptic',
      'The Pragmatist',
    ])
    expect([first.turn.round, second.turn.round, third.turn.round]).toEqual([1, 1, 2])
    expect([first.turn.seq, second.turn.seq, third.turn.seq]).toEqual([0, 1, 2])
    expect(storedSession(session.id).turnCursor).toBe(3)
  })

  it('reports when the session has run every planned round', async () => {
    const session = createSession()
    for (let i = 0; i < 4; i += 1) expectOk(await advanceSession(session.id))

    // Snapshot plans 2 rounds; the fifth turn opens round 3.
    const beyond = expectOk(await advanceSession(session.id))
    expect(beyond.turn.round).toBe(3)
    expect(beyond.plannedRoundsComplete).toBe(true)
  })

  it('builds the prompt from the speaking persona charter and the round instruction', async () => {
    const session = createSession()
    await advanceSession(session.id)

    const [options] = vi.mocked(generate).mock.calls[0]
    expect(options.system).toContain(SNAPSHOT.members[0].charter)
    expect(options.prompt).toContain(session.topic)
    expect(options.prompt).toContain(ROUND_INSTRUCTIONS.opening)
  })

  it('refuses a second concurrent generation with `locked`', async () => {
    const session = createSession()
    let openGate = (): void => {}
    provider.gate = new Promise<void>((resolve) => {
      openGate = resolve
    })

    const inFlight = advanceSession(session.id)
    const rejected = expectRefused(await advanceSession(session.id))

    expect(rejected.reason).toBe('locked')
    expect(rejected.message).toMatch(/already being generated/i)
    // The refused caller wrote nothing.
    expect(storedTurns(session.id)).toHaveLength(0)

    openGate()
    expectOk(await inFlight)
    expect(storedTurns(session.id)).toHaveLength(1)
  })

  it('refuses a completed session', async () => {
    const session = createSession({ status: 'completed' })
    const refused = expectRefused(await advanceSession(session.id))

    expect(refused.reason).toBe('not-active')
    expect(refused.message).toContain('completed')
    expect(storedTurns(session.id)).toHaveLength(0)
  })

  it('refuses an abandoned session', async () => {
    const session = createSession({ status: 'abandoned' })
    expect(expectRefused(await advanceSession(session.id)).reason).toBe('not-active')
  })

  it('refuses once the 60-turn cap is reached, naming the cap', async () => {
    const session = createSession({ turnCursor: 60 })
    const refused = expectRefused(await advanceSession(session.id))

    expect(refused.reason).toBe('cap-reached')
    expect(refused.message).toContain('60')
    expect(storedSession(session.id).turnCursor).toBe(60)
  })

  it('refuses an unknown session id', async () => {
    const refused = expectRefused(await advanceSession('00000000-0000-4000-8000-999999999999'))
    expect(refused.reason).toBe('invalid-session')
  })

  it('does not let an interjection consume a persona slot', async () => {
    const session = createSession()
    addTurn(session.id, { seq: 0, kind: 'persona', speakerName: 'The Pragmatist', round: 1 })
    addTurn(session.id, { seq: 1, kind: 'interjection', speakerName: null, round: 1 })
    session.turnCursor = 1

    const result = expectOk(await advanceSession(session.id))

    // Still round 1, still the second member — but into the next transcript slot.
    expect(result.turn).toMatchObject({ speakerName: 'The Skeptic', round: 1, seq: 2 })
  })
})

describe("the session's model reaches the provider (PRD Amendment A1)", () => {
  /** The model the nth `generate` call was asked for. */
  function modelOfCall(index: number): string | null | undefined {
    return vi.mocked(generate).mock.calls[index][1]
  }

  it('sends the session model on advance and records it on the turn', async () => {
    const session = createSession({ model: 'claude-opus-5' })

    const result = expectOk(await advanceSession(session.id))

    expect(modelOfCall(0)).toBe('claude-opus-5')
    expect(result.turn.model).toBe('claude-opus-5')
    expect(storedTurns(session.id)[0].model).toBe('claude-opus-5')
  })

  it('falls back to the env/provider default when the session set no model', async () => {
    const session = createSession()

    const result = expectOk(await advanceSession(session.id))

    // `LLM_PROVIDER=mock` with a blank `LLM_MODEL` (see beforeEach).
    expect(modelOfCall(0)).toBe('mock')
    expect(result.turn.model).toBe('mock')
  })

  it('prefers the session model over LLM_MODEL — the session was created with it', async () => {
    vi.stubEnv('LLM_MODEL', 'some-env-model')
    const session = createSession({ model: 'claude-opus-5' })

    expectOk(await advanceSession(session.id))

    expect(modelOfCall(0)).toBe('claude-opus-5')
  })

  it('sends it on synthesize, retry-last, and regenerate-last too', async () => {
    const session = createSession({ model: 'claude-opus-5' })

    provider.nextError = new Error('Anthropic request failed (529): overloaded')
    expectOk(await advanceSession(session.id))
    const retried = expectOk(await retryLastTurn(session.id))
    const regenerated = expectOk(await regenerateLastTurn(session.id))
    const synthesized = expectOk(await synthesizeSession(session.id))

    expect([modelOfCall(0), modelOfCall(1), modelOfCall(2), modelOfCall(3)]).toEqual([
      'claude-opus-5',
      'claude-opus-5',
      'claude-opus-5',
      'claude-opus-5',
    ])
    for (const turn of [retried, regenerated, synthesized]) {
      expect(turn.turn.model).toBe('claude-opus-5')
    }
  })

  it('surfaces a malformed stored model as a throw, not as a failed turn (R4)', async () => {
    const session = createSession({ model: '   ' })

    await expect(advanceSession(session.id)).rejects.toThrowError(/empty/i)
    expect(storedTurns(session.id)).toHaveLength(0)
  })
})

describe('a provider failure (PRD §5.4, R4)', () => {
  const OUTAGE = 'Anthropic request failed (529): {"type":"overloaded_error"}'

  it('stores the error verbatim on a failed turn instead of throwing it away', async () => {
    const session = createSession()
    provider.nextError = new Error(OUTAGE)

    const result = expectOk(await advanceSession(session.id))

    expect(result.turn.status).toBe('failed')
    expect(result.turn.error).toBe(OUTAGE)
    expect(result.turn.content).toBe('')
    expect(result.turn.completionTokens).toBeNull()
    // The attempt still counts toward the cap.
    expect(storedSession(session.id).turnCursor).toBe(1)
  })

  it('blocks advance and synthesize until the failed turn is retried', async () => {
    const session = createSession()
    provider.nextError = new Error(OUTAGE)
    await advanceSession(session.id)

    expect(expectRefused(await advanceSession(session.id)).reason).toBe('awaiting-retry')
    expect(expectRefused(await synthesizeSession(session.id)).reason).toBe('awaiting-retry')
    expect(storedTurns(session.id)).toHaveLength(1)
  })

  it('is repaired by retry-last, in place, keeping the id and the slot', async () => {
    const session = createSession()
    provider.nextError = new Error(OUTAGE)
    const failed = expectOk(await advanceSession(session.id))

    const retried = expectOk(await retryLastTurn(session.id))

    expect(retried.turn.id).toBe(failed.turn.id)
    expect(retried.turn.seq).toBe(failed.turn.seq)
    expect(retried.turn.speakerName).toBe('The Pragmatist')
    expect(retried.turn.status).toBe('complete')
    expect(retried.turn.error).toBeNull()
    expect(retried.turn.content.length).toBeGreaterThan(0)
    expect(storedTurns(session.id)).toHaveLength(1)
    // Both attempts counted.
    expect(storedSession(session.id).turnCursor).toBe(2)

    // …and the session advances normally again.
    expect(expectOk(await advanceSession(session.id)).turn.speakerName).toBe('The Skeptic')
  })

  it('records a second failure rather than masking it', async () => {
    const session = createSession()
    provider.nextError = new Error(OUTAGE)
    await advanceSession(session.id)

    provider.nextError = new Error('Anthropic request failed (401): invalid x-api-key')
    const retried = expectOk(await retryLastTurn(session.id))

    expect(retried.turn.status).toBe('failed')
    expect(retried.turn.error).toBe('Anthropic request failed (401): invalid x-api-key')
  })
})

describe('synthesizeSession', () => {
  it('records a Chair synthesis and completes the session', async () => {
    const session = createSession()
    await advanceSession(session.id)
    await advanceSession(session.id)

    const result = expectOk(await synthesizeSession(session.id))

    expect(result.turn).toMatchObject({
      kind: 'synthesis',
      speakerName: CHAIR_PERSONA_NAME,
      seq: 2,
      round: 2,
      status: 'complete',
    })
    expect(result.session.status).toBe('completed')
    expect(result.session.completedAt).toBeInstanceOf(Date)
    expect(storedSession(session.id).status).toBe('completed')
  })

  it('prompts the Chair with its own charter and the synthesis instruction', async () => {
    const session = createSession()
    await advanceSession(session.id)
    await synthesizeSession(session.id)

    const [options] = vi.mocked(generate).mock.calls[1]
    expect(options.system).toContain(CHAIR_PERSONA.charter)
    expect(options.prompt).toContain(ROUND_INSTRUCTIONS.synthesis)
    expect(options.maxTokens).toBe(SYNTHESIS_MAX_TOKENS)
  })

  it('leaves the session active when the synthesis fails, and completes it on retry', async () => {
    const session = createSession()
    await advanceSession(session.id)

    provider.nextError = new Error('OpenAI request failed (500): server error')
    const failed = expectOk(await synthesizeSession(session.id))

    expect(failed.turn.status).toBe('failed')
    expect(failed.session.status).toBe('active')
    expect(storedSession(session.id).status).toBe('active')
    expect(storedSession(session.id).completedAt).toBeNull()

    const retried = expectOk(await retryLastTurn(session.id))
    expect(retried.turn).toMatchObject({ kind: 'synthesis', speakerName: CHAIR_PERSONA_NAME, status: 'complete' })
    expect(retried.session.status).toBe('completed')
  })

  it('refuses when no persona has spoken', async () => {
    const session = createSession()
    const refused = expectRefused(await synthesizeSession(session.id))

    expect(refused.reason).toBe('nothing-to-synthesize')
    expect(storedTurns(session.id)).toHaveLength(0)
  })

  it('refuses a completed session, the cap, and an unknown id', async () => {
    expect(expectRefused(await synthesizeSession(createSession({ status: 'completed' }).id)).reason).toBe(
      'not-active',
    )
    expect(expectRefused(await synthesizeSession(createSession({ turnCursor: 60 }).id)).reason).toBe(
      'cap-reached',
    )
    expect(expectRefused(await synthesizeSession('00000000-0000-4000-8000-999999999998')).reason).toBe(
      'invalid-session',
    )
  })
})

describe('retryLastTurn', () => {
  it('refuses when the session has no turns', async () => {
    const session = createSession()
    const refused = expectRefused(await retryLastTurn(session.id))

    expect(refused.reason).toBe('nothing-to-retry')
    expect(refused.message).toMatch(/no turns/i)
  })

  it('refuses when the latest turn completed — that is regenerate, not retry', async () => {
    const session = createSession()
    await advanceSession(session.id)

    const refused = expectRefused(await retryLastTurn(session.id))
    expect(refused.reason).toBe('nothing-to-retry')
    expect(refused.message).toMatch(/did not fail/i)
  })

  it('refuses when the latest turn is an interjection', async () => {
    const session = createSession()
    addTurn(session.id, { seq: 0, kind: 'persona', speakerName: 'The Pragmatist', round: 1 })
    addTurn(session.id, { seq: 1, kind: 'interjection', round: 1, status: 'failed' })

    expect(expectRefused(await retryLastTurn(session.id)).reason).toBe('nothing-to-retry')
  })

  it('refuses on an inactive session and at the cap', async () => {
    const completed = createSession({ status: 'completed' })
    addTurn(completed.id, { seq: 0, kind: 'synthesis', speakerName: CHAIR_PERSONA_NAME, status: 'failed' })
    expect(expectRefused(await retryLastTurn(completed.id)).reason).toBe('not-active')

    const capped = createSession({ turnCursor: 60 })
    addTurn(capped.id, { seq: 0, kind: 'persona', speakerName: 'The Pragmatist', status: 'failed' })
    expect(expectRefused(await retryLastTurn(capped.id)).reason).toBe('cap-reached')
  })

  it('refuses an unknown session id', async () => {
    expect(expectRefused(await retryLastTurn('00000000-0000-4000-8000-999999999997')).reason).toBe(
      'invalid-session',
    )
  })

  it('rebuilds a round-2 rebuttal from the stored turn rather than re-deriving it', async () => {
    const session = createSession({ turnCursor: 3 })
    addTurn(session.id, { seq: 0, kind: 'persona', speakerName: 'The Pragmatist', round: 1 })
    addTurn(session.id, { seq: 1, kind: 'persona', speakerName: 'The Skeptic', round: 1 })
    addTurn(session.id, {
      seq: 2,
      kind: 'persona',
      speakerName: 'The Skeptic',
      round: 2,
      status: 'failed',
      content: '',
      error: 'Anthropic request failed (429): rate limit',
    })

    const retried = expectOk(await retryLastTurn(session.id))

    expect(retried.turn).toMatchObject({ seq: 2, round: 2, speakerName: 'The Skeptic', status: 'complete' })
    const [options] = vi.mocked(generate).mock.calls[0]
    expect(options.system).toContain(SNAPSHOT.members[1].charter)
    expect(options.prompt).toContain(ROUND_INSTRUCTIONS.rebuttal)
  })

  it('throws loudly when the failed turn names a persona outside the snapshot', async () => {
    const session = createSession({ turnCursor: 1 })
    addTurn(session.id, { seq: 0, kind: 'persona', speakerName: 'The Ghost', round: 1, status: 'failed' })

    await expect(retryLastTurn(session.id)).rejects.toThrow(/not in the session council snapshot/)
  })

  it('refuses a second concurrent retry with `locked`', async () => {
    const session = createSession({ turnCursor: 1 })
    addTurn(session.id, { seq: 0, kind: 'persona', speakerName: 'The Pragmatist', round: 1, status: 'failed' })
    let openGate = (): void => {}
    provider.gate = new Promise<void>((resolve) => {
      openGate = resolve
    })

    const inFlight = retryLastTurn(session.id)
    expect(expectRefused(await retryLastTurn(session.id)).reason).toBe('locked')

    openGate()
    expectOk(await inFlight)
  })
})

const NOTE = 'Cost the migration in engineer-months before anyone argues about syntax.'

describe('addInterjection', () => {
  it('records a convener turn that consumes no persona slot and no cap slot', async () => {
    const session = createSession()
    expectOk(await advanceSession(session.id))
    const cursorBefore = storedSession(session.id).turnCursor
    const providerCallsBefore = vi.mocked(generate).mock.calls.length

    const result = expectOk(await addInterjection(session.id, NOTE))

    expect(result.turn).toMatchObject({
      sessionId: session.id,
      seq: 1,
      kind: 'interjection',
      speakerName: null,
      round: 1,
      content: NOTE,
      status: 'complete',
      error: null,
      model: null,
      promptTokens: null,
      completionTokens: null,
    })
    // PRD §5.3 caps *generated* turns; a convener note generates nothing.
    expect(storedSession(session.id).turnCursor).toBe(cursorBefore)
    expect(vi.mocked(generate).mock.calls).toHaveLength(providerCallsBefore)
    // …but it is activity, and the sessions list orders by it.
    expect(result.session.updatedAt.getTime()).toBeGreaterThan(session.createdAt.getTime())
  })

  it('leaves the scheduler pointing at exactly the same speaker', async () => {
    const withNote = createSession()
    const withoutNote = createSession()
    for (const id of [withNote.id, withoutNote.id]) expectOk(await advanceSession(id))

    expectOk(await addInterjection(withNote.id, NOTE))

    const noted = expectOk(await advanceSession(withNote.id)).turn
    const plain = expectOk(await advanceSession(withoutNote.id)).turn

    expect(noted.speakerName).toBe(plain.speakerName)
    expect(noted.round).toBe(plain.round)
    // Only the transcript slot differs: the note occupies one.
    expect(noted.seq).toBe(plain.seq + 1)
  })

  it('makes the next speaker address the note, quoting its text', async () => {
    const session = createSession()
    await advanceSession(session.id)
    await addInterjection(session.id, NOTE)
    await advanceSession(session.id)

    // Call 0 was the opening; call 1 is the turn that follows the note.
    const [options] = vi.mocked(generate).mock.calls[1]
    expect(options.prompt).toContain(NOTE)
    expect(options.prompt).toContain(CONVENER_NOTE_HEADING)
    expect(options.prompt).toContain(ADDRESS_INTERJECTION_INSTRUCTION)
  })

  it('is allowed at the 60-turn cap — the cap counts generated turns only', async () => {
    const session = createSession({ turnCursor: 60 })
    addTurn(session.id, { seq: 0, kind: 'persona', speakerName: 'The Pragmatist', round: 1 })

    const result = expectOk(await addInterjection(session.id, NOTE))

    expect(result.turn).toMatchObject({ seq: 1, kind: 'interjection' })
    expect(storedSession(session.id).turnCursor).toBe(60)
    // Generation is still refused; only the note got through.
    expect(expectRefused(await advanceSession(session.id)).reason).toBe('cap-reached')
  })

  it('refuses a completed or abandoned session, and an unknown id', async () => {
    expect(expectRefused(await addInterjection(createSession({ status: 'completed' }).id, NOTE)).reason).toBe(
      'not-active',
    )
    expect(expectRefused(await addInterjection(createSession({ status: 'abandoned' }).id, NOTE)).reason).toBe(
      'not-active',
    )
    expect(
      expectRefused(await addInterjection('00000000-0000-4000-8000-999999999996', NOTE)).reason,
    ).toBe('invalid-session')
  })

  it('refuses while a failed turn is waiting to be retried', async () => {
    const session = createSession()
    provider.nextError = new Error('Anthropic request failed (529): overloaded')
    await advanceSession(session.id)

    const refused = expectRefused(await addInterjection(session.id, NOTE))

    expect(refused.reason).toBe('awaiting-retry')
    expect(refused.message).toMatch(/retry/i)
    expect(storedTurns(session.id)).toHaveLength(1)
  })
})

describe('regenerateLastTurn', () => {
  it('replaces the latest complete persona turn in place and counts against the cap', async () => {
    const session = createSession()
    const original = { ...expectOk(await advanceSession(session.id)).turn }
    vi.mocked(generate).mockResolvedValueOnce({
      text: 'A sharper second take on the same question.',
      promptTokens: 42,
      completionTokens: 9,
    })

    const result = expectOk(await regenerateLastTurn(session.id))

    expect(result.turn.id).toBe(original.id)
    expect(result.turn.seq).toBe(original.seq)
    expect(result.turn.kind).toBe('persona')
    expect(result.turn.round).toBe(original.round)
    expect(result.turn.speakerName).toBe(original.speakerName)
    expect(result.turn.content).toBe('A sharper second take on the same question.')
    expect(result.turn.content).not.toBe(original.content)
    // No new row: the slot is reused, and the discarded text is not retained.
    expect(storedTurns(session.id)).toHaveLength(1)
    // PRD §5.3: regenerations count toward the 60-turn cap.
    expect(storedSession(session.id).turnCursor).toBe(2)
  })

  it('does not show the speaker the text it is being asked to replace', async () => {
    const session = createSession()
    // Copied: the in-memory double rewrites the stored row in place, exactly as
    // `updateTurnInPlace` does, so the original text has to be captured now.
    const original = { ...expectOk(await advanceSession(session.id)).turn }
    await regenerateLastTurn(session.id)

    const [options] = vi.mocked(generate).mock.calls[1]
    expect(options.prompt).not.toContain(original.content)
    expect(options.prompt).toContain('No turns yet. You speak first.')
  })

  it('re-exposes an interjection that the replaced turn was meant to address', async () => {
    const session = createSession()
    await advanceSession(session.id)
    await addInterjection(session.id, NOTE)
    await advanceSession(session.id)
    await regenerateLastTurn(session.id)

    const [options] = vi.mocked(generate).mock.calls[2]
    expect(options.prompt).toContain(NOTE)
    expect(options.prompt).toContain(ADDRESS_INTERJECTION_INSTRUCTION)
  })

  it('refuses when the latest turn failed — that is retry, not regenerate', async () => {
    const session = createSession()
    provider.nextError = new Error('OpenAI request failed (500): server error')
    await advanceSession(session.id)

    const refused = expectRefused(await regenerateLastTurn(session.id))

    expect(refused.reason).toBe('nothing-to-regenerate')
    expect(refused.message).toMatch(/retry/i)
    expect(storedSession(session.id).turnCursor).toBe(1)
  })

  it('refuses when the latest turn is an interjection', async () => {
    const session = createSession()
    await advanceSession(session.id)
    await addInterjection(session.id, NOTE)

    const refused = expectRefused(await regenerateLastTurn(session.id))

    expect(refused.reason).toBe('nothing-to-regenerate')
    expect(refused.message).toMatch(/interjection/i)
  })

  it('refuses when the session has no turns', async () => {
    const refused = expectRefused(await regenerateLastTurn(createSession().id))

    expect(refused.reason).toBe('nothing-to-regenerate')
    expect(refused.message).toMatch(/no turns/i)
  })

  it('refuses a completed session, the cap, and an unknown id', async () => {
    const completed = createSession({ status: 'completed', turnCursor: 3 })
    addTurn(completed.id, { seq: 0, kind: 'synthesis', speakerName: CHAIR_PERSONA_NAME })
    // Reopen first: a regeneration that failed on a completed session would leave
    // a failed turn that retry-last then refuses as `not-active`.
    expect(expectRefused(await regenerateLastTurn(completed.id)).reason).toBe('not-active')

    const capped = createSession({ turnCursor: 60 })
    addTurn(capped.id, { seq: 0, kind: 'persona', speakerName: 'The Pragmatist' })
    expect(expectRefused(await regenerateLastTurn(capped.id)).reason).toBe('cap-reached')

    expect(expectRefused(await regenerateLastTurn('00000000-0000-4000-8000-999999999995')).reason).toBe(
      'invalid-session',
    )
  })

  it('refuses a second concurrent regeneration with `locked`', async () => {
    const session = createSession({ turnCursor: 1 })
    addTurn(session.id, { seq: 0, kind: 'persona', speakerName: 'The Pragmatist' })
    let openGate = (): void => {}
    provider.gate = new Promise<void>((resolve) => {
      openGate = resolve
    })

    const inFlight = regenerateLastTurn(session.id)
    expect(expectRefused(await regenerateLastTurn(session.id)).reason).toBe('locked')

    openGate()
    expectOk(await inFlight)
  })

  it('regenerates a synthesis on a reopened session and re-seals it', async () => {
    const session = createSession()
    await advanceSession(session.id)
    await advanceSession(session.id)
    const synthesis = expectOk(await synthesizeSession(session.id)).turn
    expectSessionOk(await reopenSession(session.id))

    const result = expectOk(await regenerateLastTurn(session.id))

    expect(result.turn.id).toBe(synthesis.id)
    expect(result.turn).toMatchObject({ seq: 2, kind: 'synthesis', speakerName: CHAIR_PERSONA_NAME })
    expect(result.session.status).toBe('completed')
    expect(storedSession(session.id).status).toBe('completed')
    expect(storedTurns(session.id)).toHaveLength(3)
  })

  it('leaves a failed regeneration active for retry-last to repair', async () => {
    const session = createSession()
    await advanceSession(session.id)
    await advanceSession(session.id)
    await synthesizeSession(session.id)
    expectSessionOk(await reopenSession(session.id))

    provider.nextError = new Error('Anthropic request failed (429): rate limit')
    const failed = expectOk(await regenerateLastTurn(session.id))

    expect(failed.turn).toMatchObject({ seq: 2, kind: 'synthesis', status: 'failed' })
    expect(storedSession(session.id).status).toBe('active')

    const retried = expectOk(await retryLastTurn(session.id))
    expect(retried.turn).toMatchObject({ seq: 2, status: 'complete' })
    expect(retried.session.status).toBe('completed')
  })
})

describe('reopenSession', () => {
  /** Four persona turns (both planned rounds) plus the Chair's synthesis. */
  async function runToSynthesis() {
    const session = createSession()
    for (let i = 0; i < 4; i += 1) expectOk(await advanceSession(session.id))
    expectOk(await synthesizeSession(session.id))
    return session
  }

  it('flips a completed session back to active, keeping the synthesis in the transcript', async () => {
    const session = await runToSynthesis()
    expect(storedSession(session.id).status).toBe('completed')
    const cursorBefore = storedSession(session.id).turnCursor

    const result = expectSessionOk(await reopenSession(session.id))

    expect(result.session.status).toBe('active')
    expect(result.session.completedAt).toBeNull()
    // Nothing was generated and nothing was removed.
    expect(storedSession(session.id).turnCursor).toBe(cursorBefore)
    expect(storedTurns(session.id).filter((t) => t.kind === 'synthesis')).toHaveLength(1)
  })

  it('lets the session advance again, past the rounds its snapshot planned', async () => {
    const session = await runToSynthesis()
    expectSessionOk(await reopenSession(session.id))

    const next = expectOk(await advanceSession(session.id))

    expect(next.turn).toMatchObject({ speakerName: 'The Pragmatist', round: 3, seq: 5 })
    expect(next.plannedRoundsComplete).toBe(true)

    // …and a second synthesis lands alongside the first, re-completing the session.
    expectOk(await advanceSession(session.id))
    const second = expectOk(await synthesizeSession(session.id))
    expect(second.session.status).toBe('completed')
    expect(storedTurns(session.id).filter((t) => t.kind === 'synthesis')).toHaveLength(2)
  })

  it('refuses an active or abandoned session, and an unknown id', async () => {
    const active = expectSessionRefused(await reopenSession(createSession().id))
    expect(active.reason).toBe('not-completed')
    expect(active.message).toContain('active')

    expect(expectSessionRefused(await reopenSession(createSession({ status: 'abandoned' }).id)).reason).toBe(
      'not-completed',
    )
    expect(expectSessionRefused(await reopenSession('00000000-0000-4000-8000-999999999994')).reason).toBe(
      'invalid-session',
    )
  })
})

/**
 * T-030: the streaming contract itself — what the events say, when the row is
 * written, and what is recorded when a stream does not finish.
 */
describe('streaming a turn', () => {
  it('announces the speaker before a single token arrives', async () => {
    const session = createSession()

    const { events } = await collect(advanceSessionStream(session.id))

    expect(events[0]).toEqual({
      type: 'accepted',
      seq: 0,
      round: 1,
      kind: 'persona',
      speakerName: 'The Pragmatist',
    })
    expect(events[events.length - 1].type).toBe('turn')
  })

  it('yields chunks that accumulate to exactly the stored content', async () => {
    const session = createSession()

    const { deltas, result } = await collect(advanceSessionStream(session.id))

    expect(deltas.length).toBeGreaterThan(1)
    expect(deltas.join('')).toBe(expectOk(result).turn.content)
    expect(storedTurns(session.id)[0].content).toBe(deltas.join(''))
  })

  it('does the same for the Chair synthesis', async () => {
    const session = createSession()
    await advanceSession(session.id)

    const { events, deltas, result } = await collect(synthesizeSessionStream(session.id))

    expect(events[0]).toMatchObject({ type: 'accepted', kind: 'synthesis', speakerName: CHAIR_PERSONA_NAME })
    expect(deltas.length).toBeGreaterThan(1)
    expect(deltas.join('')).toBe(expectOk(result).turn.content)
    expect(expectOk(result).session.status).toBe('completed')
  })

  it('persists the turn exactly once, and not before the stream has ended', async () => {
    const session = createSession()
    let deltasSeen = 0

    for await (const event of advanceSessionStream(session.id)) {
      if (event.type === 'delta') {
        deltasSeen += 1
        // Nothing is written while tokens are still arriving: a partial row
        // could otherwise be read as a complete turn.
        expect(storedTurns(session.id)).toHaveLength(0)
      }
    }

    expect(deltasSeen).toBeGreaterThan(1)
    expect(storedTurns(session.id)).toHaveLength(1)
  })

  it('releases the lock once the stream ends', async () => {
    const session = createSession()
    await collect(advanceSessionStream(session.id))

    expect(expectOk(await advanceSession(session.id)).turn.seq).toBe(1)
  })
})

describe('a provider failure mid-stream (T-030)', () => {
  const OUTAGE = 'Anthropic request failed (529): {"type":"overloaded_error"}'

  it('stores a failed turn, discards the partial text, and keeps the error verbatim', async () => {
    const session = createSession()
    provider.errorAfterDeltas = 2
    provider.midStreamError = new Error(OUTAGE)

    const { deltas, result } = await collect(advanceSessionStream(session.id))

    // The convener saw text arrive…
    expect(deltas).toHaveLength(2)
    expect(deltas.join('').length).toBeGreaterThan(0)
    // …and none of it was kept.
    const turn = expectOk(result).turn
    expect(turn.status).toBe('failed')
    expect(turn.content).toBe('')
    expect(turn.error).toBe(OUTAGE)
    expect(turn.promptTokens).toBeNull()
    // Exactly one row, and no `complete` row was ever written.
    expect(storedTurns(session.id)).toHaveLength(1)
    expect(storedTurns(session.id).filter((t) => t.status === 'complete')).toHaveLength(0)
    // The attempt still counts toward the cap.
    expect(storedSession(session.id).turnCursor).toBe(1)
  })

  it('leaves a broken synthesis stream on an active session for retry-last', async () => {
    const session = createSession()
    await advanceSession(session.id)
    provider.errorAfterDeltas = 1
    provider.midStreamError = new Error(OUTAGE)

    const failed = expectOk(await synthesizeSession(session.id))

    expect(failed.turn).toMatchObject({ kind: 'synthesis', status: 'failed', content: '' })
    expect(storedSession(session.id).status).toBe('active')
    expect(storedSession(session.id).completedAt).toBeNull()

    const retried = expectOk(await retryLastTurn(session.id))
    expect(retried.turn).toMatchObject({ kind: 'synthesis', status: 'complete' })
    expect(retried.session.status).toBe('completed')
  })
})

describe('aborting a stream (T-030)', () => {
  it('is the literal reason recorded on the turn', () => {
    expect(ABORTED_BY_CONVENER).toBe('aborted by convener')
  })

  it('records a failed turn naming the abort, and completes without throwing', async () => {
    const session = createSession()
    const controller = new AbortController()
    provider.controller = controller
    provider.abortAfterDeltas = 1

    const { deltas, result } = await collect(advanceSessionStream(session.id, controller.signal))

    expect(deltas).toHaveLength(1)
    const turn = expectOk(result).turn
    expect(turn.status).toBe('failed')
    expect(turn.error).toBe(ABORTED_BY_CONVENER)
    expect(turn.content).toBe('')
    expect(storedTurns(session.id)).toHaveLength(1)
    // The abort is not mistaken for a provider outage message.
    expect(storedTurns(session.id)[0].error).toBe(ABORTED_BY_CONVENER)
  })

  it('does the same for a synthesis, leaving the session active', async () => {
    const session = createSession()
    await advanceSession(session.id)
    const controller = new AbortController()
    provider.controller = controller
    provider.abortAfterDeltas = 1

    const result = expectOk(await synthesizeSession(session.id, controller.signal))

    expect(result.turn).toMatchObject({ kind: 'synthesis', status: 'failed', error: ABORTED_BY_CONVENER })
    expect(storedSession(session.id).status).toBe('active')
  })

  it('releases the lock, so retry-last can repair the aborted turn', async () => {
    const session = createSession()
    const controller = new AbortController()
    provider.controller = controller
    provider.abortAfterDeltas = 1
    await advanceSession(session.id, controller.signal)

    provider.abortAfterDeltas = null
    provider.controller = null
    const retried = expectOk(await retryLastTurn(session.id))

    expect(retried.turn).toMatchObject({ seq: 0, status: 'complete', error: null })
    expect(retried.turn.content.length).toBeGreaterThan(0)
  })
})

describe('a refused stream (T-030)', () => {
  /** Every refusal must arrive as the first and only event, having written nothing. */
  async function expectRefusalOnly(stream: AsyncGenerator<TurnStreamEvent>, sessionId: string | null) {
    const { events, result } = await collect(stream)

    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('refused')
    if (sessionId !== null) {
      expect(storedTurns(sessionId)).toHaveLength(0)
    }
    return expectRefused(result)
  }

  it('refuses a completed session without bumping the cap counter', async () => {
    const session = createSession({ status: 'completed', turnCursor: 4 })

    const refused = await expectRefusalOnly(advanceSessionStream(session.id), session.id)

    expect(refused.reason).toBe('not-active')
    expect(storedSession(session.id).turnCursor).toBe(4)
  })

  it('refuses at the cap without bumping it further', async () => {
    const session = createSession({ turnCursor: 60 })

    const refused = await expectRefusalOnly(advanceSessionStream(session.id), session.id)

    expect(refused.reason).toBe('cap-reached')
    expect(storedSession(session.id).turnCursor).toBe(60)
  })

  it('refuses an unknown session id', async () => {
    const refused = await expectRefusalOnly(
      advanceSessionStream('00000000-0000-4000-8000-999999999993'),
      null,
    )

    expect(refused.reason).toBe('invalid-session')
  })

  it('refuses a synthesis before any persona has spoken', async () => {
    const session = createSession()

    const refused = await expectRefusalOnly(synthesizeSessionStream(session.id), session.id)

    expect(refused.reason).toBe('nothing-to-synthesize')
  })

  it('refuses a second stream while the first is open, and unlocks when it is closed', async () => {
    const session = createSession()
    let openGate = (): void => {}
    provider.gate = new Promise<void>((resolve) => {
      openGate = resolve
    })

    const held = advanceSessionStream(session.id)
    // Pull the first event so the lock is definitely taken.
    expect((await held.next()).value).toMatchObject({ type: 'accepted' })

    const refused = await expectRefusalOnly(advanceSessionStream(session.id), session.id)
    expect(refused.reason).toBe('locked')

    openGate()
    await collect(held)
    expect(storedTurns(session.id)).toHaveLength(1)

    // …and the lock is free again.
    provider.gate = null
    expect(expectOk(await advanceSession(session.id)).turn.seq).toBe(1)
  })

  it('leaves the session unlocked when the consumer closes a refused stream early', async () => {
    const session = createSession({ status: 'completed' })
    const stream = advanceSessionStream(session.id)

    expect((await stream.next()).value).toMatchObject({ type: 'refused' })
    // What `turnStreamResponse` does before answering with the status code.
    await stream.return(undefined)

    // A second stream is refused for the session's status, never for the lock.
    expect(expectRefused(await advanceSession(session.id)).reason).toBe('not-active')
  })
})
