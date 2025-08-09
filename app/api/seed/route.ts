import { getDb } from '../../../lib/db/connection'
import { seedDatabase } from '../../../lib/db/seed'

export const dynamic = 'force-dynamic'

// POST /api/seed - Seed the database with initial data
export async function POST(req: Request) {
  try {
    // Check if we have database credentials
    const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL
    if (!dbUrl) {
      return Response.json({ 
        error: 'Database not configured. Set DATABASE_URL or POSTGRES_URL in .env.local' 
      }, { status: 500 })
    }

    await seedDatabase()
    
    return Response.json({ 
      message: 'Database seeded successfully',
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    return Response.json({ 
      error: error.message || 'Failed to seed database',
      details: error.toString()
    }, { status: 500 })
  }
}