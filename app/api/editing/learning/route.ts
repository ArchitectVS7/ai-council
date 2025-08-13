import { NextRequest } from 'next/server';
import { getDb } from '../../../../lib/db/connection';
import { PersonaLearningSystem } from '../../../../lib/learning/persona-learning';
import { rateLimit, defaultRateLimits, getClientIdentifier } from '../../../../lib/ratelimit';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const learningQuerySchema = z.object({
  personaId: z.string().optional(),
  dateRange: z.object({
    start: z.string().datetime().optional(),
    end: z.string().datetime().optional(),
  }).optional(),
  includeInsights: z.boolean().optional().default(true),
});

async function applyRateLimit(req: NextRequest, action: string) {
  const clientId = getClientIdentifier(req);
  const rateLimitResult = await rateLimit(clientId, defaultRateLimits.analytics, action);
  
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

// GET /api/editing/learning - Get persona learning analytics
export async function GET(req: NextRequest) {
  try {
    const rateLimitResult = await applyRateLimit(req, 'get-learning');
    if (rateLimitResult instanceof Response) return rateLimitResult;

    const { searchParams } = new URL(req.url);
    const personaId = searchParams.get('personaId');
    const includeInsights = searchParams.get('includeInsights') !== 'false';
    
    // Parse date range if provided
    let dateRange;
    if (searchParams.get('startDate') || searchParams.get('endDate')) {
      dateRange = {
        start: searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined,
        end: searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined,
      };
    }

    // In a real implementation, this would query the actual database
    // For now, generate mock data based on the learning system

    const mockResponses = [
      {
        id: '1',
        personaId: 'persona-1',
        personaName: 'Creative Director',
        content: 'This is a creative response with detailed insights.',
        rating: 4,
        createdAt: new Date('2025-01-10T10:00:00Z'),
      },
      {
        id: '2',
        personaId: 'persona-1',
        personaName: 'Creative Director',
        content: 'Another creative response that was edited.',
        rating: 3,
        createdAt: new Date('2025-01-11T14:00:00Z'),
      },
      {
        id: '3',
        personaId: 'persona-2',
        personaName: 'Technical Lead',
        content: 'Technical analysis with specific recommendations.',
        rating: 5,
        createdAt: new Date('2025-01-12T09:00:00Z'),
      }
    ];

    const mockEditHistory = [
      {
        id: 'edit-1',
        responseId: '2',
        editedBy: 'user-1',
        editedAt: new Date('2025-01-11T14:30:00Z'),
        previousContent: 'Original content',
        newContent: 'Improved content',
        reason: 'Clarity improvement',
        type: 'manual_edit' as const,
      }
    ];

    const mockFeedback = [
      {
        id: 'feedback-1',
        responseId: '1',
        userId: 'user-1',
        rating: 4,
        category: 'accuracy' as const,
        comment: 'Good accuracy but could be more specific',
        createdAt: new Date('2025-01-10T11:00:00Z'),
      },
      {
        id: 'feedback-2',
        responseId: '2',
        userId: 'user-2',
        rating: 3,
        category: 'tone' as const,
        comment: 'Tone needs adjustment',
        createdAt: new Date('2025-01-11T15:00:00Z'),
      },
      {
        id: 'feedback-3',
        responseId: '3',
        userId: 'user-1',
        rating: 5,
        category: 'clarity' as const,
        comment: 'Excellent clarity and structure',
        createdAt: new Date('2025-01-12T10:00:00Z'),
      }
    ];

    // Filter by date range if provided
    let filteredResponses = mockResponses;
    let filteredEditHistory = mockEditHistory;
    let filteredFeedback = mockFeedback;

    if (dateRange) {
      if (dateRange.start) {
        filteredResponses = filteredResponses.filter(r => r.createdAt >= dateRange.start!);
        filteredEditHistory = filteredEditHistory.filter(e => e.editedAt >= dateRange.start!);
        filteredFeedback = filteredFeedback.filter(f => f.createdAt >= dateRange.start!);
      }
      if (dateRange.end) {
        filteredResponses = filteredResponses.filter(r => r.createdAt <= dateRange.end!);
        filteredEditHistory = filteredEditHistory.filter(e => e.editedAt <= dateRange.end!);
        filteredFeedback = filteredFeedback.filter(f => f.createdAt <= dateRange.end!);
      }
    }

    if (personaId) {
      // Get learning data for specific persona
      const learning = PersonaLearningSystem.analyzePersonaPerformance(
        personaId,
        filteredResponses.filter(r => r.personaId === personaId),
        filteredEditHistory,
        filteredFeedback
      );

      const suggestions = PersonaLearningSystem.generateImprovementSuggestions(learning);
      
      // Calculate improvement score (would use historical data in real implementation)
      const improvementScore = PersonaLearningSystem.calculateImprovementScore(learning);

      return Response.json({
        persona: learning,
        suggestions,
        improvementScore,
        includeInsights,
      }, {
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.reset.toString(),
        }
      });
    } else {
      // Get learning data for all personas
      const uniquePersonas = Array.from(new Set(filteredResponses.map(r => r.personaId)));
      
      const allPersonaLearning = uniquePersonas.map(pId => {
        const learning = PersonaLearningSystem.analyzePersonaPerformance(
          pId,
          filteredResponses.filter(r => r.personaId === pId),
          filteredEditHistory,
          filteredFeedback
        );

        const suggestions = PersonaLearningSystem.generateImprovementSuggestions(learning);
        const improvementScore = PersonaLearningSystem.calculateImprovementScore(learning);

        return {
          ...learning,
          suggestions,
          improvementScore,
        };
      });

      // Overall statistics
      const overallStats = {
        totalResponses: filteredResponses.length,
        totalEdits: filteredEditHistory.length,
        totalFeedback: filteredFeedback.length,
        averageRating: filteredFeedback.length > 0 
          ? filteredFeedback.reduce((sum, f) => sum + f.rating, 0) / filteredFeedback.length
          : 0,
        editRate: filteredResponses.length > 0 
          ? filteredEditHistory.length / filteredResponses.length
          : 0,
        topImprovementAreas: this.getTopImprovementAreas(allPersonaLearning),
      };

      return Response.json({
        personas: allPersonaLearning,
        overallStats,
        includeInsights,
      }, {
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.reset.toString(),
        }
      });
    }
  } catch (error: any) {
    return Response.json(
      { error: error.message || 'Failed to fetch learning data' },
      { status: 500 }
    );
  }

  // Helper method to aggregate improvement areas across personas
  static getTopImprovementAreas(personaLearning: any[]): any[] {
    const areaAggregation: Record<string, { category: string; totalFrequency: number; count: number; examples: string[] }> = {};

    personaLearning.forEach(persona => {
      persona.improvementAreas.forEach((area: any) => {
        if (!areaAggregation[area.category]) {
          areaAggregation[area.category] = {
            category: area.category,
            totalFrequency: 0,
            count: 0,
            examples: [],
          };
        }
        
        areaAggregation[area.category].totalFrequency += area.frequency;
        areaAggregation[area.category].count += 1;
        areaAggregation[area.category].examples.push(...area.examples.slice(0, 2));
      });
    });

    return Object.values(areaAggregation)
      .map(area => ({
        category: area.category,
        averageFrequency: area.totalFrequency / area.count,
        affectedPersonas: area.count,
        examples: [...new Set(area.examples)].slice(0, 3),
      }))
      .sort((a, b) => b.averageFrequency - a.averageFrequency)
      .slice(0, 5);
  }
}

// POST /api/editing/learning - Trigger learning system update
export async function POST(req: NextRequest) {
  try {
    const rateLimitResult = await applyRateLimit(req, 'update-learning');
    if (rateLimitResult instanceof Response) return rateLimitResult;

    const body = await req.json();
    const { action, personaId } = body;

    if (action === 'refresh') {
      // In a real implementation, this would:
      // 1. Fetch latest data from database
      // 2. Recalculate learning metrics
      // 3. Update persona improvement recommendations
      // 4. Store updated learning data

      return Response.json({
        success: true,
        message: personaId 
          ? `Learning data refreshed for persona ${personaId}`
          : 'Learning data refreshed for all personas',
        refreshedAt: new Date(),
      }, {
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.reset.toString(),
        }
      });
    } else if (action === 'reset') {
      // Reset learning data for a persona (admin action)
      if (!personaId) {
        return Response.json(
          { error: 'Persona ID is required for reset action' },
          { status: 400 }
        );
      }

      return Response.json({
        success: true,
        message: `Learning data reset for persona ${personaId}`,
        resetAt: new Date(),
      }, {
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.reset.toString(),
        }
      });
    } else {
      return Response.json(
        { error: 'Invalid action. Use "refresh" or "reset"' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    return Response.json(
      { error: error.message || 'Failed to update learning system' },
      { status: 500 }
    );
  }
}
