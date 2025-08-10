require('dotenv').config({ path: '.env.local' })
const { execSync } = require('child_process')

if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
  console.error('❌ DATABASE_URL or POSTGRES_URL environment variable is required')
  console.log('Please check your .env.local file contains:')
  console.log('DATABASE_URL=postgresql://username:password@hostname/database?sslmode=require')
  process.exit(1)
}

console.log('✅ Database URL found, running migration...')
execSync('drizzle-kit migrate', { stdio: 'inherit' })