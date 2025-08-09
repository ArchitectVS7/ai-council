import { NextRequest } from 'next/server'
import { getDb } from '../../../../lib/db/connection'
import { agentTemplates } from '../../../../lib/db/schema'
import { rateLimit, defaultRateLimits, getClientIdentifier } from '../../../../lib/ratelimit'
import { agentTemplateSchema } from '../../../../lib/validation'
import { eq } from 'drizzle-orm'

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

// GET /api/agent-templates/[id] - Get specific agent template
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimitResult = await applyRateLimit(req, 'agent-template-get')
    if (rateLimitResult instanceof Response) return rateLimitResult

    const { id } = await params
    const templateId = parseInt(id)
    if (isNaN(templateId)) {
      return Response.json({ error: 'Invalid template ID' }, { status: 400 })
    }

    const db = getDb()
    const template = await db.select().from(agentTemplates)
      .where(eq(agentTemplates.id, templateId))
      .limit(1)

    if (template.length === 0) {
      return Response.json({ error: 'Agent template not found' }, { status: 404 })
    }
    
    return Response.json({ template: template[0] }, {
      headers: {
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.reset.toString(),
      }
    })
  } catch (error: any) {
    return Response.json({ error: error.message || 'Failed to fetch agent template' }, { status: 500 })
  }
}

// PATCH /api/agent-templates/[id] - Update agent template
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimitResult = await applyRateLimit(req, 'agent-template-update')
    if (rateLimitResult instanceof Response) return rateLimitResult

    const { id } = await params
    const templateId = parseInt(id)
    if (isNaN(templateId)) {
      return Response.json({ error: 'Invalid template ID' }, { status: 400 })
    }

    const body = await req.json()
    const validationResult = agentTemplateSchema.partial().safeParse(body)
    
    if (!validationResult.success) {
      return Response.json(
        { error: 'Invalid input', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const db = getDb()
    
    // Check if template exists
    const existingTemplate = await db.select().from(agentTemplates)
      .where(eq(agentTemplates.id, templateId))
      .limit(1)

    if (existingTemplate.length === 0) {
      return Response.json({ error: 'Agent template not found' }, { status: 404 })
    }

    // Update template
    const updateData = {
      ...validationResult.data,
      updatedAt: new Date(),
    }

    const [updatedTemplate] = await db.update(agentTemplates)
      .set(updateData)
      .where(eq(agentTemplates.id, templateId))
      .returning()
    
    return Response.json({ template: updatedTemplate }, {
      headers: {
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.reset.toString(),
      }
    })
  } catch (error: any) {
    return Response.json({ error: error.message || 'Failed to update agent template' }, { status: 500 })
  }
}

// DELETE /api/agent-templates/[id] - Delete agent template
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimitResult = await applyRateLimit(req, 'agent-template-delete')
    if (rateLimitResult instanceof Response) return rateLimitResult

    const { id } = await params
    const templateId = parseInt(id)
    if (isNaN(templateId)) {
      return Response.json({ error: 'Invalid template ID' }, { status: 400 })
    }

    const db = getDb()
    
    // Check if template exists
    const existingTemplate = await db.select().from(agentTemplates)
      .where(eq(agentTemplates.id, templateId))
      .limit(1)

    if (existingTemplate.length === 0) {
      return Response.json({ error: 'Agent template not found' }, { status: 404 })
    }

    // Soft delete by setting isActive to false
    const [updatedTemplate] = await db.update(agentTemplates)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(agentTemplates.id, templateId))
      .returning()
    
    return Response.json({ 
      message: 'Agent template deleted successfully',
      template: updatedTemplate 
    }, {
      headers: {
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.reset.toString(),
      }
    })
  } catch (error: any) {
    return Response.json({ error: error.message || 'Failed to delete agent template' }, { status: 500 })
  }
}