import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'

import * as schema from './schema'

type Db = ReturnType<typeof createDb>

function createDb(url: string) {
  return drizzle(neon(url), { schema })
}

const clients = new Map<string, Db>()

/**
 * The single database handle. Throws loudly when `DATABASE_URL` is absent —
 * there is no in-memory or mock fallback (PRD R4). Construction is lazy so that
 * importing this module (typecheck, lint, unit tests, `next build`) never
 * requires a database.
 */
export function getDb(): Db {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. Set it in .env.local (Neon Postgres connection string). There is no fallback database.',
    )
  }
  let db = clients.get(url)
  if (!db) {
    db = createDb(url)
    clients.set(url, db)
  }
  return db
}
