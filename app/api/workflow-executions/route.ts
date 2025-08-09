import { NextRequest } from 'next/server'
import { getDb } from '../../../lib/db/connection'
import { workflowExecutions, agentExecutions, workflows, agentTemplates } from '../../../lib/db/schema'
import { rateLimit, defaultRateLimits, getClientIdentifier } from '../../../lib/ratelimit'
import { workflowExecutionSchema, validateAndSanitizePrompt } from '../../../lib/validation'
import { eq, desc } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

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

// GET /api/workflow-executions - List workflow executions
export async function GET(req: NextRequest) {
  try {
    const rateLimitResult = await applyRateLimit(req, 'execution-list')
    if (rateLimitResult instanceof Response) return rateLimitResult

    const { searchParams } = new URL(req.url)
    const workflowId = searchParams.get('workflowId')
    const limit = parseInt(searchParams.get('limit') || '10')

    const db = getDb()
    
    let executions
    if (workflowId) {
      executions = await db.select()
        .from(workflowExecutions)
        .where(eq(workflowExecutions.workflowId, parseInt(workflowId)))
        .orderBy(desc(workflowExecutions.createdAt))
        .limit(Math.min(limit, 50))
    } else {
      executions = await db.select()
        .from(workflowExecutions)
        .orderBy(desc(workflowExecutions.createdAt))
        .limit(Math.min(limit, 50))
    }
    
    return Response.json({ executions }, {
      headers: {
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.reset.toString(),
      }
    })
  } catch (error: any) {
    return Response.json({ error: error.message || 'Failed to fetch executions' }, { status: 500 })
  }
}

// POST /api/workflow-executions - Start a workflow execution
export async function POST(req: NextRequest) {
  try {
    const rateLimitResult = await applyRateLimit(req, 'execution-start')
    if (rateLimitResult instanceof Response) return rateLimitResult

    const body = await req.json()
    const validationResult = workflowExecutionSchema.safeParse(body)
    
    if (!validationResult.success) {
      return Response.json(
        { error: 'Invalid input', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const db = getDb()
    
    // Verify workflow exists
    const workflow = await db.select().from(workflows).where(eq(workflows.id, validationResult.data.workflowId)).limit(1)
    if (workflow.length === 0) {
      return Response.json({ error: 'Workflow not found' }, { status: 404 })
    }

    // Sanitize input
    let sanitizedInput = validationResult.data.input
    if (sanitizedInput && typeof sanitizedInput === 'object') {
      for (const [key, value] of Object.entries(sanitizedInput)) {
        if (typeof value === 'string') {
          sanitizedInput[key] = validateAndSanitizePrompt(value)
        }
      }
    }

    // Create workflow execution
    const [execution] = await db.insert(workflowExecutions).values({
      workflowId: validationResult.data.workflowId,
      status: 'pending',
      input: sanitizedInput,
      executionData: {},
    }).returning()
    
    return Response.json({ execution }, { 
      status: 201,
      headers: {
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.reset.toString(),
      }
    })
  } catch (error: any) {
    return Response.json({ error: error.message || 'Failed to start execution' }, { status: 500 })
  }
}