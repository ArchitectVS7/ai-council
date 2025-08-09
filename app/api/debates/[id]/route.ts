import { NextRequest } from 'next/server'
import { getDb } from '../../../../lib/db/connection'
import { debates } from '../../../../lib/db/schema'
import { rateLimit, defaultRateLimits, getClientIdentifier } from '../../../../lib/ratelimit'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

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

// GET /api/debates/[id] - Get specific debate
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimitResult = await applyRateLimit(req, 'debate-get')
    if (rateLimitResult instanceof Response) return rateLimitResult

    const { id } = await params
    const debateId = parseInt(id)
    if (isNaN(debateId)) {
      return Response.json({ error: 'Invalid debate ID' }, { status: 400 })
    }

    const db = getDb()
    const debate = await db.select().from(debates)
      .where(eq(debates.id, debateId))
      .limit(1)

    if (debate.length === 0) {
      return Response.json({ error: 'Debate not found' }, { status: 404 })
    }
    
    return Response.json({ debate: debate[0] }, {
      headers: {
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.reset.toString(),
      }
    })
  } catch (error: any) {
    return Response.json({ error: error.message || 'Failed to fetch debate' }, { status: 500 })
  }
}

// PATCH /api/debates/[id] - Update debate
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimitResult = await applyRateLimit(req, 'debate-update')
    if (rateLimitResult instanceof Response) return rateLimitResult

    const { id } = await params
    const debateId = parseInt(id)
    if (isNaN(debateId)) {
      return Response.json({ error: 'Invalid debate ID' }, { status: 400 })
    }

    const body = await req.json()
    const validationResult = updateDebateSchema.safeParse(body)
    
    if (!validationResult.success) {
      return Response.json(
        { error: 'Invalid input', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const db = getDb()
    
    // Check if debate exists
    const existingDebate = await db.select().from(debates)
      .where(eq(debates.id, debateId))
      .limit(1)

    if (existingDebate.length === 0) {
      return Response.json({ error: 'Debate not found' }, { status: 404 })
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date(),
    }

    if (validationResult.data.status !== undefined) {
      updateData.status = validationResult.data.status
      if (validationResult.data.status === 'completed') {
        updateData.completedAt = new Date()
      }
    }

    if (validationResult.data.context !== undefined) {
      updateData.context = validationResult.data.context
    }

    if (validationResult.data.currentStep !== undefined) {
      updateData.currentStep = validationResult.data.currentStep
    }

    if (validationResult.data.currentRound !== undefined) {
      updateData.currentRound = validationResult.data.currentRound
    }

    // Update debate
    const [updatedDebate] = await db.update(debates)
      .set(updateData)
      .where(eq(debates.id, debateId))
      .returning()
    
    return Response.json({ debate: updatedDebate }, {
      headers: {
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.reset.toString(),
      }
    })
  } catch (error: any) {
    return Response.json({ error: error.message || 'Failed to update debate' }, { status: 500 })
  }
}

// DELETE /api/debates/[id] - Delete debate
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimitResult = await applyRateLimit(req, 'debate-delete')
    if (rateLimitResult instanceof Response) return rateLimitResult

    const { id } = await params
    const debateId = parseInt(id)
    if (isNaN(debateId)) {
      return Response.json({ error: 'Invalid debate ID' }, { status: 400 })
    }

    const db = getDb()
    
    // Check if debate exists
    const existingDebate = await db.select().from(debates)
      .where(eq(debates.id, debateId))
      .limit(1)

    if (existingDebate.length === 0) {
      return Response.json({ error: 'Debate not found' }, { status: 404 })
    }

    // Delete debate (cascade will handle related messages and summaries)
    await db.delete(debates).where(eq(debates.id, debateId))
    
    return Response.json({ message: 'Debate deleted successfully' }, {
      headers: {
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.reset.toString(),
      }
    })
  } catch (error: any) {
    return Response.json({ error: error.message || 'Failed to delete debate' }, { status: 500 })
  }
}