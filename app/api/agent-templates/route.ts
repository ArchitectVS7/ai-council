import { NextRequest } from 'next/server'
import { getDb } from '../../../lib/db/connection'
import { agentTemplates } from '../../../lib/db/schema'
import { rateLimit, defaultRateLimits, getClientIdentifier } from '../../../lib/ratelimit'
import { agentTemplateSchema } from '../../../lib/validation'
import { eq, and, SQL } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

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

// GET /api/agent-templates - List all agent templates
export async function GET(req: NextRequest) {
  try {
    const rateLimitResult = await applyRateLimit(req, 'agent-template-list')
    if (rateLimitResult instanceof Response) return rateLimitResult

    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')

    const db = getDb()
    
    let whereCondition: SQL<unknown> = eq(agentTemplates.isActive, true)
    if (category) {
      whereCondition = and(whereCondition, eq(agentTemplates.category, category))!
    }
    
    const templates = await db.select().from(agentTemplates).where(whereCondition)
    
    return Response.json({ templates }, {
      headers: {
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.reset.toString(),
      }
    })
  } catch (error: any) {
    return Response.json({ error: error.message || 'Failed to fetch agent templates' }, { status: 500 })
  }
}

// POST /api/agent-templates - Create a new agent template
export async function POST(req: NextRequest) {
  try {
    const rateLimitResult = await applyRateLimit(req, 'agent-template-create')
    if (rateLimitResult instanceof Response) return rateLimitResult

    const body = await req.json()
    const validationResult = agentTemplateSchema.safeParse(body)
    
    if (!validationResult.success) {
      return Response.json(
        { error: 'Invalid input', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const db = getDb()
    const [newTemplate] = await db.insert(agentTemplates).values({
      name: validationResult.data.name,
      category: validationResult.data.category,
      role: validationResult.data.role,
      task: validationResult.data.task,
      systemPrompt: validationResult.data.systemPrompt,
      parameters: validationResult.data.parameters || {},
    }).returning()
    
    return Response.json({ template: newTemplate }, { 
      status: 201,
      headers: {
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.reset.toString(),
      }
    })
  } catch (error: any) {
    return Response.json({ error: error.message || 'Failed to create agent template' }, { status: 500 })
  }
}