import { describe, expect, it, vi } from 'vitest'

import { atRoundBoundary, runRound } from './runner'
import type { StepOutcome } from './runner'
import type { ChamberTurn } from './types'

/** A completed step that neither failed nor landed on a round boundary. */
const OK: StepOutcome = { kind: 'turn', failed: false, atRoundBoundary: false }
const OK_BOUNDARY: StepOutcome = { kind: 'turn', failed: false, atRoundBoundary: true }
const FAILED: StepOutcome = { kind: 'turn', failed: true, atRoundBoundary: false }

/** Returns each outcome in turn; a further call is a test failure, not a silent repeat. */
function scriptedStep(outcomes: StepOutcome[]) {
  let index = 0
  return vi.fn(async () => {
    if (index >= outcomes.length) throw new Error(`step called ${index + 1} times; script has ${outcomes.length}`)
    return outcomes[index++]
  })
}

const never = () => false

describe('runRound', () => {
  it('halts immediately on a failed turn', async () => {
    const step = scriptedStep([OK, FAILED])

    const result = await runRound({ step, shouldStop: never, maxSteps: 5 })

    expect(result).toEqual({ steps: 2, stoppedBy: 'failure' })
    expect(step).toHaveBeenCalledTimes(2)
  })

  it('stops at the round boundary', async () => {
    const step = scriptedStep([OK, OK, OK_BOUNDARY])

    const result = await runRound({ step, shouldStop: never, maxSteps: 5 })

    expect(result).toEqual({ steps: 3, stoppedBy: 'round-boundary' })
    expect(step).toHaveBeenCalledTimes(3)
  })

  it('respects a pause raised between steps', async () => {
    const step = scriptedStep([OK, OK, OK])
    const shouldStop = vi.fn().mockReturnValueOnce(false).mockReturnValue(true)

    const result = await runRound({ step, shouldStop, maxSteps: 5 })

    expect(result).toEqual({ steps: 1, stoppedBy: 'pause' })
    expect(step).toHaveBeenCalledTimes(1)
  })

  it('never steps at all when paused before the first step', async () => {
    const step = scriptedStep([])

    const result = await runRound({ step, shouldStop: () => true, maxSteps: 5 })

    expect(result).toEqual({ steps: 0, stoppedBy: 'pause' })
    expect(step).not.toHaveBeenCalled()
  })

  it('stops on a server refusal and passes its message through verbatim', async () => {
    const message = 'Session turn cap reached (60 generated turns).'
    const step = scriptedStep([OK, { kind: 'refused', message }])

    const result = await runRound({ step, shouldStop: never, maxSteps: 5 })

    // The refused step stored nothing, so it does not count as a step.
    expect(result).toEqual({ steps: 1, stoppedBy: 'refused', message })
    expect(step).toHaveBeenCalledTimes(2)
  })

  it('cannot run away: maxSteps bounds the loop', async () => {
    const step = scriptedStep([OK, OK, OK])

    const result = await runRound({ step, shouldStop: never, maxSteps: 3 })

    expect(result).toEqual({ steps: 3, stoppedBy: 'step-limit' })
    expect(step).toHaveBeenCalledTimes(3)
  })
})

let nextSeq = 0
function turn(partial: Partial<ChamberTurn>): ChamberTurn {
  const seq = nextSeq++
  return {
    id: `turn-${seq}`,
    seq,
    kind: 'persona',
    speakerName: 'Pragmatist',
    round: 1,
    content: 'text',
    status: 'complete',
    error: null,
    ...partial,
  }
}

describe('atRoundBoundary', () => {
  const MEMBERS = 3

  it('is false for an empty transcript', () => {
    expect(atRoundBoundary([], MEMBERS)).toBe(false)
  })

  it('is false part-way through a round', () => {
    expect(atRoundBoundary([turn({}), turn({})], MEMBERS)).toBe(false)
  })

  it('is true once every member has spoken', () => {
    expect(atRoundBoundary([turn({}), turn({}), turn({})], MEMBERS)).toBe(true)
  })

  it('ignores interjections and syntheses — they consume no persona turn', () => {
    const turns = [
      turn({}),
      turn({ kind: 'interjection', speakerName: null }),
      turn({}),
      turn({ kind: 'synthesis', speakerName: 'The Chair' }),
    ]

    expect(atRoundBoundary(turns, MEMBERS)).toBe(false)
    expect(atRoundBoundary([...turns, turn({})], MEMBERS)).toBe(true)
  })

  it('ignores a failed turn — it is retried in place, not skipped', () => {
    const turns = [turn({}), turn({}), turn({ status: 'failed', content: '', error: 'boom' })]

    expect(atRoundBoundary(turns, MEMBERS)).toBe(false)
  })

  it('throws rather than guess when the snapshot has no members', () => {
    expect(() => atRoundBoundary([turn({})], 0)).toThrow(/no members/)
  })
})
