import { NextRequest } from 'next/server';
import { Microsoft365Integration } from '../../../../../lib/integrations/microsoft-365';
import { rateLimit, defaultRateLimits, getClientIdentifier } from '../../../../../lib/ratelimit';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const exportSchema = z.object({
  format: z.enum(['word', 'excel', 'powerpoint']),
  title: z.string().min(1).max(200),
  content: z.any(), // Can be string for word, array for excel/powerpoint
  options: z.object({
    folderId: z.string().optional(),
    shareWithEmails: z.array(z.string().email()).optional(),
    permissions: z.enum(['read', 'write', 'owner']).optional(),
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

// POST /api/integrations/microsoft/export - Export content to Microsoft 365
export async function POST(req: NextRequest) {
  try {
    const rateLimitResult = await applyRateLimit(req, 'microsoft-export');
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

    const credentials = {
      clientId: process.env.MICROSOFT_CLIENT_ID || '',
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
      tenantId: process.env.MICROSOFT_TENANT_ID || 'common',
      accessToken: req.headers.get('x-microsoft-access-token') || undefined,
      refreshToken: req.headers.get('x-microsoft-refresh-token') || undefined,
    };

    if (!credentials.accessToken) {
      return Response.json(
        { 
          error: 'Microsoft 365 not connected',
          authRequired: true,
          authUrl: '/api/integrations/microsoft/auth'
        },
        { status: 401 }
      );
    }

    const integration = new Microsoft365Integration(credentials);
    let result;

    switch (format) {
      case 'word':
        if (typeof content !== 'string') {
          return Response.json(
            { error: 'Content must be a string for Word export' },
            { status: 400 }
          );
        }
        result = await integration.exportToWord(title, content, options);
        break;

      case 'excel':
        if (!Array.isArray(content)) {
          return Response.json(
            { error: 'Content must be an array for Excel export' },
            { status: 400 }
          );
        }
        result = await integration.exportToExcel(title, content, options);
        break;

      case 'powerpoint':
        if (!Array.isArray(content)) {
          return Response.json(
            { error: 'Content must be an array for PowerPoint export' },
            { status: 400 }
          );
        }
        result = await integration.exportToPowerPoint(title, content, options);
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
      { error: error.message || 'Failed to export to Microsoft 365' },
      { status: 500 }
    );
  }
}
