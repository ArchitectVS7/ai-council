import { NextRequest } from 'next/server'
import { getDb } from '../../../lib/db/connection'
import { personas } from '../../../lib/db/schema'
import { rateLimit, defaultRateLimits, getClientIdentifier } from '../../../lib/ratelimit'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const createPersonaSchema = z.object({
  name: z.string().min(1).max(100),
  role: z.string().min(1).max(200),
  task: z.string().min(1).max(500),
  systemPrompt: z.string().optional(),
  parameters: z.record(z.string(), z.any()).optional(),
})

async function applyRateLimit(req: NextRequest, action: string) {
  const clientId = getClientIdentifier(req)
  const rateLimitResult = await rateLimit(clientId, defaultRateLimits.template, action)
  
  if (!rateLimitResult.success) {
    return Response.json(
      { error: 'Rate limit exceeded' },
      { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.reset.toString(),
        }
      }
    )
  }
  
  return rateLimitResult
}

// GET /api/personas - List all personas
export async function GET(req: NextRequest) {
  try {
    const rateLimitResult = await applyRateLimit(req, 'persona-list')
    if (rateLimitResult instanceof Response) return rateLimitResult

    const db = getDb()
    const personaList = await db.select().from(personas).where(eq(personas.isActive, true))
    
    return Response.json({ personas: personaList }, {
      headers: {
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.reset.toString(),
      }
    })
  } catch (error: any) {
    return Response.json({ error: error.message || 'Failed to fetch personas' }, { status: 500 })
  }
}

// POST /api/personas - Create new persona
export async function POST(req: NextRequest) {
  try {
    const rateLimitResult = await applyRateLimit(req, 'persona-create')
    if (rateLimitResult instanceof Response) return rateLimitResult

    const body = await req.json()
    const validationResult = createPersonaSchema.safeParse(body)
    
    if (!validationResult.success) {
      return Response.json(
        { error: 'Invalid input', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const db = getDb()
    const [newPersona] = await db.insert(personas).values({
      name: validationResult.data.name,
      role: validationResult.data.role,
      task: validationResult.data.task,
      systemPrompt: validationResult.data.systemPrompt,
      parameters: validationResult.data.parameters || {},
    }).returning()
    
    return Response.json({ persona: newPersona }, { 
      status: 201,
      headers: {
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.reset.toString(),
      }
    })
  } catch (error: any) {
    return Response.json({ error: error.message || 'Failed to create persona' }, { status: 500 })
  }
}