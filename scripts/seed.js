import { seedDatabase } from '../lib/db/seed.js'

async function main() {
  try {
    console.log('Starting database seed...')
    await seedDatabase()
    console.log('Database seeded successfully!')
    process.exit(0)
  } catch (error) {
    console.error('Seed failed:', error)
    process.exit(1)
  }
}

main()