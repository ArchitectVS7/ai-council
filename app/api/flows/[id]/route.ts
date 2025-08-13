import { NextRequest } from 'next/server'
import { getDb } from '../../../../lib/db/connection'
import { flows } from '../../../../lib/db/schema'
import { rateLimit, defaultRateLimits, getClientIdentifier } from '../../../../lib/ratelimit'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const updateFlowSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  nodes: z.array(z.any()).optional(),
  edges: z.array(z.any()).optional(),
  category: z.enum(['creative', 'business', 'research']).optional(),
  isActive: z.boolean().optional(),
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

// GET /api/flows/[id] - Get specific flow
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const rateLimitResult = await applyRateLimit(req, 'flow-get')
    if (rateLimitResult instanceof Response) return rateLimitResult

    const db = getDb()
    const flow = await db.select().from(flows).where(eq(flows.id, parseInt(params.id))).limit(1)
    
    if (flow.length === 0) {
      return Response.json({ error: 'Flow not found' }, { status: 404 })
    }
    
    return Response.json({ flow: flow[0] }, {
      headers: {
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.reset.toString(),
      }
    })
  } catch (error: any) {
    return Response.json({ error: error.message || 'Failed to fetch flow' }, { status: 500 })
  }
}

// PUT /api/flows/[id] - Update specific flow
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const rateLimitResult = await applyRateLimit(req, 'flow-update')
    if (rateLimitResult instanceof Response) return rateLimitResult

    const body = await req.json()
    const validationResult = updateFlowSchema.safeParse(body)
    
    if (!validationResult.success) {
      return Response.json(
        { error: 'Invalid input', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const db = getDb()
    const [updatedFlow] = await db.update(flows)
      .set({
        ...validationResult.data,
        updatedAt: new Date(),
      })
      .where(eq(flows.id, parseInt(params.id)))
      .returning()
    
    if (!updatedFlow) {
      return Response.json({ error: 'Flow not found' }, { status: 404 })
    }
    
    return Response.json({ flow: updatedFlow }, {
      headers: {
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.reset.toString(),
      }
    })
  } catch (error: any) {
    return Response.json({ error: error.message || 'Failed to update flow' }, { status: 500 })
  }
}

// DELETE /api/flows/[id] - Delete specific flow
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const rateLimitResult = await applyRateLimit(req, 'flow-delete')
    if (rateLimitResult instanceof Response) return rateLimitResult

    const db = getDb()
    const [deletedFlow] = await db.delete(flows)
      .where(eq(flows.id, parseInt(params.id)))
      .returning()
    
    if (!deletedFlow) {
      return Response.json({ error: 'Flow not found' }, { status: 404 })
    }
    
    return Response.json({ message: 'Flow deleted successfully' }, {
      headers: {
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.reset.toString(),
      }
    })
  } catch (error: any) {
    return Response.json({ error: error.message || 'Failed to delete flow' }, { status: 500 })
  }
}
