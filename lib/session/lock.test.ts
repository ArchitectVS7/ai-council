import { describe, expect, it } from 'vitest'

import { acquireSessionLock, withSessionLock } from './lock'

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

describe('acquireSessionLock', () => {
  it('hands out a release the first time and null while it is held', () => {
    const release = acquireSessionLock('acquire-held')
    expect(release).not.toBeNull()
    expect(acquireSessionLock('acquire-held')).toBeNull()

    release?.()
    const second = acquireSessionLock('acquire-held')
    expect(second).not.toBeNull()
    second?.()
  })

  it('is idempotent, so a double release cannot free a later caller’s lock', () => {
    const release = acquireSessionLock('acquire-idempotent')
    release?.()
    // The stale handle must not evict the lock the next caller just took.
    const next = acquireSessionLock('acquire-idempotent')
    release?.()

    expect(next).not.toBeNull()
    expect(acquireSessionLock('acquire-idempotent')).toBeNull()
    next?.()
  })

  it('locks each session independently', () => {
    const a = acquireSessionLock('acquire-a')
    const b = acquireSessionLock('acquire-b')

    expect(a).not.toBeNull()
    expect(b).not.toBeNull()

    a?.()
    b?.()
  })
})

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
