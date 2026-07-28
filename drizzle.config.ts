import { config as loadEnv } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

loadEnv({ path: '.env.local' })
loadEnv()

export default defineConfig({
  dialect: 'postgresql',
  schema: './lib/db/schema.ts',
  out: './drizzle',
  // `db:generate` runs fully offline and never opens a connection, but drizzle-kit's
  // config schema still requires a url field. With DATABASE_URL absent, `db:migrate`
  // fails loudly at connect time rather than falling back to anything (R4).
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
  strict: true,
  verbose: true,
})
