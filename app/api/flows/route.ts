import { NextRequest } from 'next/server'
import { getDb } from '../../../lib/db/connection'
import { flows } from '../../../lib/db/schema'
import { rateLimit, defaultRateLimits, getClientIdentifier } from '../../../lib/ratelimit'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const createFlowSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  nodes: z.array(z.any()).default([]),
  edges: z.array(z.any()).default([]),
  category: z.enum(['creative', 'business', 'research']).default('creative'),
})

async function applyRateLimit(req: NextRequest, action: string) {
  const clientId = getClientIdentifier(req)
  const rateLimitResult = await rateLimit(clientId, defaultRateLimits.workflow, action)
  
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

// GET /api/flows - List all flows
export async function GET(req: NextRequest) {
  try {
    const rateLimitResult = await applyRateLimit(req, 'flow-list')
    if (rateLimitResult instanceof Response) return rateLimitResult

    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')

    const db = getDb()
    let flowList
    
    if (category) {
      flowList = await db.select().from(flows).where(eq(flows.category, category))
    } else {
      flowList = await db.select().from(flows).where(eq(flows.isActive, true))
    }
    
    return Response.json({ flows: flowList }, {
      headers: {
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.reset.toString(),
      }
    })
  } catch (error: any) {
    return Response.json({ error: error.message || 'Failed to fetch flows' }, { status: 500 })
  }
}

// POST /api/flows - Create new flow
export async function POST(req: NextRequest) {
  try {
    const rateLimitResult = await applyRateLimit(req, 'flow-create')
    if (rateLimitResult instanceof Response) return rateLimitResult

    const body = await req.json()
    const validationResult = createFlowSchema.safeParse(body)
    
    if (!validationResult.success) {
      return Response.json(
        { error: 'Invalid input', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const db = getDb()
    const [newFlow] = await db.insert(flows).values({
      name: validationResult.data.name,
      description: validationResult.data.description,
      nodes: validationResult.data.nodes,
      edges: validationResult.data.edges,
      category: validationResult.data.category,
    }).returning()
    
    return Response.json({ flow: newFlow }, { 
      status: 201,
      headers: {
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.reset.toString(),
      }
    })
  } catch (error: any) {
    return Response.json({ error: error.message || 'Failed to create flow' }, { status: 500 })
  }
}