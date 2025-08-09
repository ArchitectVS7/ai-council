import { NextRequest } from 'next/server'
import { getDb } from '../../../lib/db/connection'
import { workflowTemplates } from '../../../lib/db/schema'
import { rateLimit, defaultRateLimits, getClientIdentifier } from '../../../lib/ratelimit'
import { workflowNodeSchema, workflowEdgeSchema } from '../../../lib/validation'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const createWorkflowTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  category: z.string().min(1).max(50),
  nodes: z.array(workflowNodeSchema),
  edges: z.array(workflowEdgeSchema),
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

// GET /api/workflow-templates - List all workflow templates
export async function GET(req: NextRequest) {
  try {
    const rateLimitResult = await applyRateLimit(req, 'template-list')
    if (rateLimitResult instanceof Response) return rateLimitResult

    const db = getDb()
    const templates = await db.select().from(workflowTemplates).where(eq(workflowTemplates.isActive, true))
    
    return Response.json({ templates }, {
      headers: {
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.reset.toString(),
      }
    })
  } catch (error: any) {
    return Response.json({ error: error.message || 'Failed to fetch templates' }, { status: 500 })
  }
}

// POST /api/workflow-templates - Create a new workflow template
export async function POST(req: NextRequest) {
  try {
    const rateLimitResult = await applyRateLimit(req, 'template-create')
    if (rateLimitResult instanceof Response) return rateLimitResult

    const body = await req.json()
    const validationResult = createWorkflowTemplateSchema.safeParse(body)
    
    if (!validationResult.success) {
      return Response.json(
        { error: 'Invalid input', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const db = getDb()
    const [newTemplate] = await db.insert(workflowTemplates).values({
      name: validationResult.data.name,
      description: validationResult.data.description,
      category: validationResult.data.category,
      nodes: validationResult.data.nodes,
      edges: validationResult.data.edges,
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
    return Response.json({ error: error.message || 'Failed to create template' }, { status: 500 })
  }
}