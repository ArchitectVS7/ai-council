import { NextRequest } from 'next/server';
import { getDb } from '../../../../lib/db/connection';
import { rateLimit, defaultRateLimits, getClientIdentifier } from '../../../../lib/ratelimit';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const submitFeedbackSchema = z.object({
  responseId: z.string().min(1),
  rating: z.number().min(1).max(5),
  category: z.enum(['accuracy', 'relevance', 'tone', 'completeness', 'clarity']),
  comment: z.string().optional(),
  suggestions: z.array(z.string()).optional(),
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

// GET /api/editing/feedback - Get feedback for responses
export async function GET(req: NextRequest) {
  try {
    const rateLimitResult = await applyRateLimit(req, 'get-feedback');
    if (rateLimitResult instanceof Response) return rateLimitResult;

    const { searchParams } = new URL(req.url);
    const responseId = searchParams.get('responseId');
    const personaId = searchParams.get('personaId');
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // In a real implementation, this would query the actual database
    // For now, return mock feedback data
    const mockFeedback = [
      {
        id: 'feedback-1',
        responseId: '1',
        userId: 'user-1',
        rating: 4,
        category: 'accuracy',
        comment: 'The response was mostly accurate but could use more specific examples.',
        suggestions: ['Add more concrete examples', 'Include data sources'],
        createdAt: new Date('2025-01-13T10:30:00Z'),
      },
      {
        id: 'feedback-2',
        responseId: '1',
        userId: 'user-2',
        rating: 3,
        category: 'tone',
        comment: 'The tone was a bit too formal for the context.',
        suggestions: ['Make it more conversational'],
        createdAt: new Date('2025-01-13T11:00:00Z'),
      },
      {
        id: 'feedback-3',
        responseId: '2',
        userId: 'user-1',
        rating: 5,
        category: 'clarity',
        comment: 'Very clear and well-structured response.',
        createdAt: new Date('2025-01-13T11:30:00Z'),
      }
    ];

    let filteredFeedback = mockFeedback;

    if (responseId) {
      filteredFeedback = filteredFeedback.filter(f => f.responseId === responseId);
    }

    if (category) {
      filteredFeedback = filteredFeedback.filter(f => f.category === category);
    }

    const paginatedFeedback = filteredFeedback.slice(offset, offset + limit);

    // Calculate aggregate statistics
    const stats = {
      totalCount: filteredFeedback.length,
      averageRating: filteredFeedback.length > 0 
        ? filteredFeedback.reduce((sum, f) => sum + f.rating, 0) / filteredFeedback.length
        : 0,
      categoryBreakdown: filteredFeedback.reduce((acc, f) => {
        acc[f.category] = (acc[f.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      ratingDistribution: filteredFeedback.reduce((acc, f) => {
        acc[f.rating] = (acc[f.rating] || 0) + 1;
        return acc;
      }, {} as Record<number, number>),
    };

    return Response.json({
      feedback: paginatedFeedback,
      stats,
      total: filteredFeedback.length,
      hasMore: offset + limit < filteredFeedback.length,
    }, {
      headers: {
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.reset.toString(),
      }
    });
  } catch (error: any) {
    return Response.json(
      { error: error.message || 'Failed to fetch feedback' },
      { status: 500 }
    );
  }
}

// POST /api/editing/feedback - Submit feedback for a response
export async function POST(req: NextRequest) {
  try {
    const rateLimitResult = await applyRateLimit(req, 'submit-feedback');
    if (rateLimitResult instanceof Response) return rateLimitResult;

    const body = await req.json();
    const validationResult = submitFeedbackSchema.safeParse(body);
    
    if (!validationResult.success) {
      return Response.json(
        { error: 'Invalid input', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { responseId, rating, category, comment, suggestions } = validationResult.data;

    // In a real implementation, this would:
    // 1. Validate that the response exists
    // 2. Store the feedback in the database
    // 3. Update persona learning metrics
    // 4. Trigger any learning system updates

    const feedback = {
      id: `feedback-${Date.now()}`,
      responseId,
      userId: 'current-user', // This would be the actual user ID from auth
      rating,
      category,
      comment,
      suggestions,
      createdAt: new Date(),
    };

    // Simulate storing in database and updating learning system
    // In reality, this would trigger the PersonaLearningSystem to update metrics

    return Response.json({
      success: true,
      feedback,
      message: 'Feedback submitted successfully',
    }, {
      headers: {
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.reset.toString(),
      }
    });
  } catch (error: any) {
    return Response.json(
      { error: error.message || 'Failed to submit feedback' },
      { status: 500 }
    );
  }
}

// DELETE /api/editing/feedback - Delete feedback (for the user who submitted it)
export async function DELETE(req: NextRequest) {
  try {
    const rateLimitResult = await applyRateLimit(req, 'delete-feedback');
    if (rateLimitResult instanceof Response) return rateLimitResult;

    const { searchParams } = new URL(req.url);
    const feedbackId = searchParams.get('feedbackId');

    if (!feedbackId) {
      return Response.json(
        { error: 'Feedback ID is required' },
        { status: 400 }
      );
    }

    // In a real implementation, this would:
    // 1. Verify the user owns this feedback
    // 2. Delete from database
    // 3. Update learning metrics if necessary

    return Response.json({
      success: true,
      message: 'Feedback deleted successfully',
      feedbackId,
    }, {
      headers: {
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.reset.toString(),
      }
    });
  } catch (error: any) {
    return Response.json(
      { error: error.message || 'Failed to delete feedback' },
      { status: 500 }
    );
  }
}
