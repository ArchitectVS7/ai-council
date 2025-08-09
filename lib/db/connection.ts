import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as schema from './schema'

let db: ReturnType<typeof drizzle>

export function getDb() {
  if (!db) {
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL
    
    if (!connectionString) {
      throw new Error('DATABASE_URL or POSTGRES_URL environment variable is required')
    }

    // Use neon for serverless functions
    const sql = neon(connectionString)
    db = drizzle(sql, { schema })
  }
  
  return db
}