import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { getDb } from './index'

const FAKE_URL = 'postgresql://user:pass@ep-example.us-east-1.aws.neon.tech/neondb'

describe('getDb', () => {
  let saved: string | undefined

  beforeEach(() => {
    saved = process.env.DATABASE_URL
  })

  afterEach(() => {
    if (saved === undefined) delete process.env.DATABASE_URL
    else process.env.DATABASE_URL = saved
  })

  it('throws loudly when DATABASE_URL is missing — no fallback (R4)', () => {
    delete process.env.DATABASE_URL
    expect(() => getDb()).toThrowError(/DATABASE_URL/)
  })

  it('returns a memoized client when DATABASE_URL is set', () => {
    // The neon-http driver performs no I/O at construction, so this stays offline.
    process.env.DATABASE_URL = FAKE_URL
    const first = getDb()
    expect(first).toBeTruthy()
    expect(getDb()).toBe(first)
  })
})
