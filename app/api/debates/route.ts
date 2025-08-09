import { NextRequest } from 'next/server'
import { getDb } from '../../../lib/db/connection'
import { debates, workflows, personas, flows } from '../../../lib/db/schema'
import { rateLimit, defaultRateLimits, getClientIdentifier } from '../../../lib/ratelimit'
import { validateAndSanitizePrompt } from '../../../lib/validation'
import { eq, desc } from 'drizzle-orm'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const createDebateSchema = z.object({
  topic: z.string().min(1).max(1000),
  workflowId: z.number().optional(),
  flowId: z.number().optional(), // For PRD-compliant flows
})

const updateDebateSchema = z.object({
  status: z.enum(['active', 'completed', 'paused']).optional(),
  context: z.string().optional(),
  currentStep: z.number().optional(),
  currentRound: z.number().optional(),
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

// GET /api/debates - List debates
export async function GET(req: NextRequest) {
  try {
    const rateLimitResult = await applyRateLimit(req, 'debate-list')
    if (rateLimitResult instanceof Response) return rateLimitResult

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '20')

    const db = getDb()
    
    let debateList
    if (status && ['active', 'completed', 'paused'].includes(status)) {
      debateList = await db.select()
        .from(debates)
        .where(eq(debates.status, status))
        .orderBy(desc(debates.createdAt))
        .limit(Math.min(limit, 100))
    } else {
      debateList = await db.select()
        .from(debates)
        .orderBy(desc(debates.createdAt))
        .limit(Math.min(limit, 100))
    }
    
    return Response.json({ debates: debateList }, {
      headers: {
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.reset.toString(),
      }
    })
  } catch (error: any) {
    return Response.json({ error: error.message || 'Failed to fetch debates' }, { status: 500 })
  }
}

// POST /api/debates - Create new debate
export async function POST(req: NextRequest) {
  try {
    const rateLimitResult = await applyRateLimit(req, 'debate-create')
    if (rateLimitResult instanceof Response) return rateLimitResult

    const body = await req.json()
    const validationResult = createDebateSchema.safeParse(body)
    
    if (!validationResult.success) {
      return Response.json(
        { error: 'Invalid input', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const db = getDb()
    
    // Sanitize topic
    const sanitizedTopic = validateAndSanitizePrompt(validationResult.data.topic)
    
    // Validate workflow or flow exists
    if (validationResult.data.workflowId) {
      const workflow = await db.select().from(workflows)
        .where(eq(workflows.id, validationResult.data.workflowId))
        .limit(1)
      if (workflow.length === 0) {
        return Response.json({ error: 'Workflow not found' }, { status: 404 })
      }
    }
    
    if (validationResult.data.flowId) {
      const flow = await db.select().from(flows)
        .where(eq(flows.id, validationResult.data.flowId))
        .limit(1)
      if (flow.length === 0) {
        return Response.json({ error: 'Flow not found' }, { status: 404 })
      }
    }

    // Create debate session
    const [newDebate] = await db.insert(debates).values({
      topic: sanitizedTopic,
      workflowId: validationResult.data.workflowId,
      status: 'active',
      currentStep: 0,
      currentRound: 1,
      context: '',
    }).returning()
    
    return Response.json({ debate: newDebate }, { 
      status: 201,
      headers: {
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.reset.toString(),
      }
    })
  } catch (error: any) {
    return Response.json({ error: error.message || 'Failed to create debate' }, { status: 500 })
  }
}