import { NextRequest } from 'next/server';
import { getDb } from '../../../../lib/db/connection';
import { rateLimit, defaultRateLimits, getClientIdentifier } from '../../../../lib/ratelimit';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const editResponseSchema = z.object({
  responseId: z.string().min(1),
  newContent: z.string().min(1),
  reason: z.string().optional(),
  comment: z.string().optional(),
});

const approveResponseSchema = z.object({
  responseId: z.string().min(1),
  comment: z.string().optional(),
});

async function applyRateLimit(req: NextRequest, action: string) {
  const clientId = getClientIdentifier(req);
  const rateLimitResult = await rateLimit(clientId, defaultRateLimits.workflow, action);
  
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
    );
  }
  
  return rateLimitResult;
}

// GET /api/editing/responses - Get editable responses
export async function GET(req: NextRequest) {
  try {
    const rateLimitResult = await applyRateLimit(req, 'get-responses');
    if (rateLimitResult instanceof Response) return rateLimitResult;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const personaId = searchParams.get('personaId');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // In a real implementation, this would query the actual database
    // For now, return mock data that matches the EditableResponse interface
    const mockResponses = [
      {
        id: '1',
        messageId: 'msg-1',
        personaId: 'persona-1',
        personaName: 'Creative Director',
        originalContent: 'This is an original response from the persona.',
        currentContent: 'This is the current edited version of the response.',
        isEdited: true,
        editHistory: [
          {
            id: 'edit-1',
            editedBy: 'user-1',
            editedAt: new Date('2025-01-13T10:00:00Z'),
            previousContent: 'This is an original response from the persona.',
            newContent: 'This is the current edited version of the response.',
            reason: 'Improved clarity',
            type: 'manual_edit' as const,
          }
        ],
        status: 'approved' as const,
        createdAt: new Date('2025-01-13T09:00:00Z'),
        updatedAt: new Date('2025-01-13T10:00:00Z'),
      },
      {
        id: '2',
        messageId: 'msg-2',
        personaId: 'persona-2',
        personaName: 'Technical Lead',
        originalContent: 'Here is a technical analysis of the requirements.',
        currentContent: 'Here is a technical analysis of the requirements.',
        isEdited: false,
        editHistory: [],
        status: 'pending' as const,
        createdAt: new Date('2025-01-13T11:00:00Z'),
        updatedAt: new Date('2025-01-13T11:00:00Z'),
      }
    ];

    let filteredResponses = mockResponses;

    if (status) {
      filteredResponses = filteredResponses.filter(r => r.status === status);
    }

    if (personaId) {
      filteredResponses = filteredResponses.filter(r => r.personaId === personaId);
    }

    const paginatedResponses = filteredResponses.slice(offset, offset + limit);

    return Response.json({
      responses: paginatedResponses,
      total: filteredResponses.length,
      hasMore: offset + limit < filteredResponses.length,
    }, {
      headers: {
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.reset.toString(),
      }
    });
  } catch (error: any) {
    return Response.json(
      { error: error.message || 'Failed to fetch responses' },
      { status: 500 }
    );
  }
}

// POST /api/editing/responses - Edit a response
export async function POST(req: NextRequest) {
  try {
    const rateLimitResult = await applyRateLimit(req, 'edit-response');
    if (rateLimitResult instanceof Response) return rateLimitResult;

    const body = await req.json();
    const validationResult = editResponseSchema.safeParse(body);
    
    if (!validationResult.success) {
      return Response.json(
        { error: 'Invalid input', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { responseId, newContent, reason, comment } = validationResult.data;

    // In a real implementation, this would:
    // 1. Fetch the current response from the database
    // 2. Create an edit history entry
    // 3. Update the response content
    // 4. Store in the database
    
    const editHistoryEntry = {
      id: `edit-${Date.now()}`,
      editedBy: 'current-user', // This would be the actual user ID
      editedAt: new Date(),
      previousContent: 'Previous content would be fetched from database',
      newContent,
      reason,
      comment,
      type: 'manual_edit' as const,
    };

    const updatedResponse = {
      id: responseId,
      messageId: `msg-${responseId}`,
      personaId: 'persona-1',
      personaName: 'Creative Director',
      originalContent: 'Original content from database',
      currentContent: newContent,
      isEdited: true,
      editHistory: [editHistoryEntry],
      status: 'needs_review' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return Response.json({
      success: true,
      response: updatedResponse,
      editHistory: editHistoryEntry,
    }, {
      headers: {
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.reset.toString(),
      }
    });
  } catch (error: any) {
    return Response.json(
      { error: error.message || 'Failed to edit response' },
      { status: 500 }
    );
  }
}

// PUT /api/editing/responses - Approve/reject a response
export async function PUT(req: NextRequest) {
  try {
    const rateLimitResult = await applyRateLimit(req, 'approve-response');
    if (rateLimitResult instanceof Response) return rateLimitResult;

    const body = await req.json();
    const { action } = body; // 'approve' or 'reject'
    
    if (action === 'approve') {
      const validationResult = approveResponseSchema.safeParse(body);
      
      if (!validationResult.success) {
        return Response.json(
          { error: 'Invalid input', details: validationResult.error.issues },
          { status: 400 }
        );
      }

      const { responseId, comment } = validationResult.data;

      // In a real implementation, this would update the response status in the database
      
      return Response.json({
        success: true,
        message: 'Response approved successfully',
        responseId,
        status: 'approved',
        approvedAt: new Date(),
        approvedBy: 'current-user',
        comment,
      }, {
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.reset.toString(),
        }
      });
    } else if (action === 'reject') {
      const { responseId, reason } = body;
      
      if (!responseId || !reason) {
        return Response.json(
          { error: 'Response ID and reason are required for rejection' },
          { status: 400 }
        );
      }

      return Response.json({
        success: true,
        message: 'Response rejected',
        responseId,
        status: 'rejected',
        rejectedAt: new Date(),
        rejectedBy: 'current-user',
        reason,
      }, {
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.reset.toString(),
        }
      });
    } else {
      return Response.json(
        { error: 'Invalid action. Use "approve" or "reject"' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    return Response.json(
      { error: error.message || 'Failed to process response action' },
      { status: 500 }
    );
  }
}
