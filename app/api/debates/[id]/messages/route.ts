import { NextRequest } from 'next/server'
import { getDb } from '../../../../../lib/db/connection'
import { debates, debateMessages } from '../../../../../lib/db/schema'
import { rateLimit, defaultRateLimits, getClientIdentifier } from '../../../../../lib/ratelimit'
import { validateAndSanitizePrompt } from '../../../../../lib/validation'
import { eq, desc } from 'drizzle-orm'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const createMessageSchema = z.object({
  personaName: z.string().min(1).max(100),
  personaId: z.number(),
  round: z.number(),
  content: z.string().min(1).max(10000),
})

async function applyRateLimit(req: NextRequest, action: string) {
  const clientId = getClientIdentifier(req)
  const rateLimitResult = await rateLimit(clientId, defaultRateLimits.completion, action)
  
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

// GET /api/debates/[id]/messages - Get debate messages
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimitResult = await applyRateLimit(req, 'messages-list')
    if (rateLimitResult instanceof Response) return rateLimitResult

    const { id } = await params
    const debateId = parseInt(id)
    if (isNaN(debateId)) {
      return Response.json({ error: 'Invalid debate ID' }, { status: 400 })
    }

    const db = getDb()
    
    // Verify debate exists
    const debate = await db.select().from(debates)
      .where(eq(debates.id, debateId))
      .limit(1)

    if (debate.length === 0) {
      return Response.json({ error: 'Debate not found' }, { status: 404 })
    }

    // Get messages
    const messages = await db.select().from(debateMessages)
      .where(eq(debateMessages.debateId, debateId))
      .orderBy(debateMessages.timestamp)
    
    return Response.json({ messages }, {
      headers: {
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.reset.toString(),
      }
    })
  } catch (error: any) {
    return Response.json({ error: error.message || 'Failed to fetch messages' }, { status: 500 })
  }
}

// POST /api/debates/[id]/messages - Add message to debate
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimitResult = await applyRateLimit(req, 'message-create')
    if (rateLimitResult instanceof Response) return rateLimitResult

    const { id } = await params
    const debateId = parseInt(id)
    if (isNaN(debateId)) {
      return Response.json({ error: 'Invalid debate ID' }, { status: 400 })
    }

    const body = await req.json()
    const validationResult = createMessageSchema.safeParse(body)
    
    if (!validationResult.success) {
      return Response.json(
        { error: 'Invalid input', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const db = getDb()
    
    // Verify debate exists and is active
    const debate = await db.select().from(debates)
      .where(eq(debates.id, debateId))
      .limit(1)

    if (debate.length === 0) {
      return Response.json({ error: 'Debate not found' }, { status: 404 })
    }

    if (debate[0].status !== 'active') {
      return Response.json({ error: 'Cannot add messages to inactive debate' }, { status: 400 })
    }

    // Sanitize content
    const sanitizedContent = validateAndSanitizePrompt(validationResult.data.content)

    // Create message
    const [newMessage] = await db.insert(debateMessages).values({
      debateId,
      personaName: validationResult.data.personaName,
      personaId: validationResult.data.personaId,
      round: validationResult.data.round,
      content: sanitizedContent,
    }).returning()
    
    return Response.json({ message: newMessage }, { 
      status: 201,
      headers: {
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.reset.toString(),
      }
    })
  } catch (error: any) {
    return Response.json({ error: error.message || 'Failed to create message' }, { status: 500 })
  }
}