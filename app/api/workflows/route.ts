import { NextRequest } from 'next/server'
import { getDb } from '../../../lib/db/connection'
import { workflows, workflowTemplates, workflowExecutions } from '../../../lib/db/schema'
import { rateLimit, defaultRateLimits, getClientIdentifier } from '../../../lib/ratelimit'
import { workflowNodeSchema, workflowEdgeSchema } from '../../../lib/validation'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const createWorkflowSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  nodes: z.array(workflowNodeSchema),
  edges: z.array(workflowEdgeSchema),
  templateId: z.number().optional(),
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

// GET /api/workflows - List all workflows
export async function GET(req: NextRequest) {
  try {
    const rateLimitResult = await applyRateLimit(req, 'workflow-list')
    if (rateLimitResult instanceof Response) return rateLimitResult

    const db = getDb()
    const allWorkflows = await db.select().from(workflows)
    
    return Response.json({ workflows: allWorkflows }, {
      headers: {
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.reset.toString(),
      }
    })
  } catch (error: any) {
    return Response.json({ error: error.message || 'Failed to fetch workflows' }, { status: 500 })
  }
}

// POST /api/workflows - Create a new workflow
export async function POST(req: NextRequest) {
  try {
    const rateLimitResult = await applyRateLimit(req, 'workflow-create')
    if (rateLimitResult instanceof Response) return rateLimitResult

    const body = await req.json()
    const validationResult = createWorkflowSchema.safeParse(body)
    
    if (!validationResult.success) {
      return Response.json(
        { error: 'Invalid input', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const db = getDb()
    const [newWorkflow] = await db.insert(workflows).values({
      name: validationResult.data.name,
      description: validationResult.data.description,
      nodes: validationResult.data.nodes,
      edges: validationResult.data.edges,
      templateId: validationResult.data.templateId,
    }).returning()
    
    return Response.json({ workflow: newWorkflow }, { 
      status: 201,
      headers: {
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.reset.toString(),
      }
    })
  } catch (error: any) {
    return Response.json({ error: error.message || 'Failed to create workflow' }, { status: 500 })
  }
}