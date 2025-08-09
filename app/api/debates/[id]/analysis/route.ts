import { NextRequest } from 'next/server'
import { getDb } from '../../../../../lib/db/connection'
import { debates, debateMessages, debateSummaries } from '../../../../../lib/db/schema'
import { buildFinalAnalysisPrompt, extractBullets, parseFinalAnalysis } from '../../../../../lib/stateMachine'
import { rateLimit, defaultRateLimits, getClientIdentifier } from '../../../../../lib/ratelimit'
import { eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

async function complete({ prompt, system }: { prompt: string; system: string }) {
  const res = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/complete`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prompt, system }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error || 'Completion failed')
  return (data?.text as string) || ''
}

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

// GET /api/debates/[id]/analysis - Get existing analysis
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimitResult = await applyRateLimit(req, 'analysis-get')
    if (rateLimitResult instanceof Response) return rateLimitResult

    const { id } = await params
    const debateId = parseInt(id)
    if (isNaN(debateId)) {
      return Response.json({ error: 'Invalid debate ID' }, { status: 400 })
    }

    const db = getDb()
    
    // Get existing analysis
    const analysis = await db.select().from(debateSummaries)
      .where(eq(debateSummaries.debateId, debateId))
      .limit(1)

    if (analysis.length === 0) {
      return Response.json({ error: 'No analysis found for this debate' }, { status: 404 })
    }
    
    return Response.json({ analysis: analysis[0] }, {
      headers: {
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.reset.toString(),
      }
    })
  } catch (error: any) {
    return Response.json({ error: error.message || 'Failed to fetch analysis' }, { status: 500 })
  }
}

// POST /api/debates/[id]/analysis - Generate final analysis
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimitResult = await applyRateLimit(req, 'analysis-generate')
    if (rateLimitResult instanceof Response) return rateLimitResult

    const { id } = await params
    const debateId = parseInt(id)
    if (isNaN(debateId)) {
      return Response.json({ error: 'Invalid debate ID' }, { status: 400 })
    }

    const db = getDb()
    
    // Get debate and verify it exists and is completed
    const debate = await db.select().from(debates)
      .where(eq(debates.id, debateId))
      .limit(1)

    if (debate.length === 0) {
      return Response.json({ error: 'Debate not found' }, { status: 404 })
    }

    if (debate[0].status !== 'completed') {
      return Response.json({ error: 'Cannot generate analysis for incomplete debate' }, { status: 400 })
    }

    // Get all messages for the debate
    const messages = await db.select().from(debateMessages)
      .where(eq(debateMessages.debateId, debateId))
      .orderBy(debateMessages.timestamp)

    if (messages.length === 0) {
      return Response.json({ error: 'No messages found for this debate' }, { status: 400 })
    }

    // Extract bullet points from moderator messages
    const bulletPoints: string[] = []
    for (const message of messages) {
      if (message.personaName.toLowerCase().includes('moderator')) {
        const bullets = extractBullets(message.content)
        bulletPoints.push(...bullets)
      }
    }

    // Build prompt for final analysis
    const { system, user } = buildFinalAnalysisPrompt({
      topic: debate[0].topic,
      messages: messages.map(m => ({
        persona: m.personaName,
        personaId: m.personaId,
        content: m.content,
        timestamp: m.timestamp?.toISOString() || '',
        round: m.round
      })),
      bulletPoints
    })

    // Generate final analysis
    const analysisText = await complete({ prompt: user, system })
    
    // Parse the structured analysis
    const parsedAnalysis = parseFinalAnalysis(analysisText)

    // Check if analysis already exists
    const existingAnalysis = await db.select().from(debateSummaries)
      .where(eq(debateSummaries.debateId, debateId))
      .limit(1)

    let savedAnalysis
    if (existingAnalysis.length > 0) {
      // Update existing analysis
      [savedAnalysis] = await db.update(debateSummaries)
        .set({
          summary: analysisText,
          bulletPoints: bulletPoints,
          keyInsights: parsedAnalysis.executiveSummary,
          consensusPoints: parsedAnalysis.consensusPoints.join('\n'),
          outstandingQuestions: parsedAnalysis.outstandingQuestions.join('\n'),
          recommendations: parsedAnalysis.recommendations.join('\n'),
        })
        .where(eq(debateSummaries.debateId, debateId))
        .returning()
    } else {
      // Create new analysis
      [savedAnalysis] = await db.insert(debateSummaries).values({
        debateId,
        summary: analysisText,
        bulletPoints: bulletPoints,
        keyInsights: parsedAnalysis.executiveSummary,
        consensusPoints: parsedAnalysis.consensusPoints.join('\n'),
        outstandingQuestions: parsedAnalysis.outstandingQuestions.join('\n'),
        recommendations: parsedAnalysis.recommendations.join('\n'),
      }).returning()
    }
    
    return Response.json({ 
      analysis: savedAnalysis,
      parsedAnalysis 
    }, { 
      status: 201,
      headers: {
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.reset.toString(),
      }
    })
  } catch (error: any) {
    return Response.json({ error: error.message || 'Failed to generate analysis' }, { status: 500 })
  }
}