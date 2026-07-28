import { describe, expect, it } from 'vitest'

import { withSessionLock } from './lock'

/** A promise plus the handles to settle it, so a test can hold a lock open. */
function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void; reject: (e: unknown) => void } {
  let resolve!: (value: T) => void
  let reject!: (e: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('withSessionLock', () => {
  it('runs the work and returns its value when the session is free', async () => {
    const outcome = await withSessionLock('session-free', async () => 'generated')
    expect(outcome).toEqual({ locked: false, value: 'generated' })
  })

  it('refuses a second acquire while the first is still running', async () => {
    const gate = deferred<string>()
    let ran = 0

    const first = withSessionLock('session-busy', async () => {
      ran += 1
      return gate.promise
    })
    // Let the first runner start before the second attempt.
    await Promise.resolve()

    const second = await withSessionLock('session-busy', async () => {
      ran += 1
      return 'should not run'
    })

    expect(second).toEqual({ locked: true })
    // The refused caller never reached the work — no duplicate generation.
    expect(ran).toBe(1)

    gate.resolve('first result')
    expect(await first).toEqual({ locked: false, value: 'first result' })
  })

  it('releases the lock once the work resolves', async () => {
    await withSessionLock('session-sequential', async () => 'one')
    expect(await withSessionLock('session-sequential', async () => 'two')).toEqual({
      locked: false,
      value: 'two',
    })
  })

  it('releases the lock when the work throws, and lets the error through', async () => {
    await expect(
      withSessionLock('session-throws', async () => {
        throw new Error('provider exploded')
      }),
    ).rejects.toThrow('provider exploded')

    expect(await withSessionLock('session-throws', async () => 'recovered')).toEqual({
      locked: false,
      value: 'recovered',
    })
  })

  it('locks each session independently', async () => {
    const gate = deferred<string>()
    const held = withSessionLock('session-a', async () => gate.promise)
    await Promise.resolve()

    expect(await withSessionLock('session-b', async () => 'b ran')).toEqual({
      locked: false,
      value: 'b ran',
    })

    gate.resolve('a done')
    await held
  })
})
