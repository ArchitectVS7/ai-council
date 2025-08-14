import { NextRequest } from 'next/server';
import { GoogleWorkspaceIntegration } from '../../../../../lib/integrations/google-workspace';
import { rateLimit, defaultRateLimits, getClientIdentifier } from '../../../../../lib/ratelimit';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const exportSchema = z.object({
  format: z.enum(['docs', 'sheets', 'slides']),
  title: z.string().min(1).max(200),
  content: z.any(), // Can be string for docs, array for sheets/slides
  options: z.object({
    folderId: z.string().optional(),
    shareWithEmails: z.array(z.string().email()).optional(),
    permissions: z.enum(['reader', 'writer', 'owner']).optional(),
  }).optional(),
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

// POST /api/integrations/google/export - Export content to Google Workspace
export async function POST(req: NextRequest) {
  try {
    const rateLimitResult = await applyRateLimit(req, 'google-export');
    if (rateLimitResult instanceof Response) return rateLimitResult;

    const body = await req.json();
    const validationResult = exportSchema.safeParse(body);
    
    if (!validationResult.success) {
      return Response.json(
        { error: 'Invalid input', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { format, title, content, options = {} } = validationResult.data;

    // In a real app, you would get stored tokens from the database for the current user
    // For now, we'll return an error indicating authentication is needed
    const credentials = {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/integrations/google/callback',
      // These would come from the user's stored tokens
      accessToken: req.headers.get('x-google-access-token') || undefined,
      refreshToken: req.headers.get('x-google-refresh-token') || undefined,
    };

    if (!credentials.accessToken) {
      return Response.json(
        { 
          error: 'Google Workspace not connected',
          authRequired: true,
          authUrl: '/api/integrations/google/auth'
        },
        { status: 401 }
      );
    }

    const integration = new GoogleWorkspaceIntegration(credentials);
    let result;

    switch (format) {
      case 'docs':
        if (typeof content !== 'string') {
          return Response.json(
            { error: 'Content must be a string for Google Docs export' },
            { status: 400 }
          );
        }
        result = await integration.exportToGoogleDocs(title, content, options);
        break;

      case 'sheets':
        if (!Array.isArray(content)) {
          return Response.json(
            { error: 'Content must be an array for Google Sheets export' },
            { status: 400 }
          );
        }
        result = await integration.exportToGoogleSheets(title, content, options);
        break;

      case 'slides':
        if (!Array.isArray(content)) {
          return Response.json(
            { error: 'Content must be an array for Google Slides export' },
            { status: 400 }
          );
        }
        result = await integration.exportToGoogleSlides(title, content, options);
        break;

      default:
        return Response.json(
          { error: 'Unsupported export format' },
          { status: 400 }
        );
    }

    return Response.json(result, {
      headers: {
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.reset.toString(),
      }
    });
  } catch (error: any) {
    return Response.json(
      { error: error.message || 'Failed to export to Google Workspace' },
      { status: 500 }
    );
  }
}
