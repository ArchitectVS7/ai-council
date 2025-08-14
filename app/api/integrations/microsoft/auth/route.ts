import { NextRequest } from 'next/server';
import { Microsoft365Integration } from '../../../../../lib/integrations/microsoft-365';
import { rateLimit, defaultRateLimits, getClientIdentifier } from '../../../../../lib/ratelimit';

export const dynamic = 'force-dynamic';

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

// GET /api/integrations/microsoft/auth - Get Microsoft OAuth URL
export async function GET(req: NextRequest) {
  try {
    const rateLimitResult = await applyRateLimit(req, 'microsoft-auth-url');
    if (rateLimitResult instanceof Response) return rateLimitResult;

    const credentials = {
      clientId: process.env.MICROSOFT_CLIENT_ID || '',
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
      tenantId: process.env.MICROSOFT_TENANT_ID || 'common',
    };

    if (!credentials.clientId || !credentials.clientSecret) {
      return Response.json(
        { error: 'Microsoft 365 credentials not configured' },
        { status: 500 }
      );
    }

    const integration = new Microsoft365Integration(credentials);
    const authUrl = integration.getAuthUrl();

    return Response.json(
      { authUrl },
      {
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.reset.toString(),
        }
      }
    );
  } catch (error: any) {
    return Response.json(
      { error: error.message || 'Failed to generate auth URL' },
      { status: 500 }
    );
  }
}

// POST /api/integrations/microsoft/auth - Exchange code for tokens
export async function POST(req: NextRequest) {
  try {
    const rateLimitResult = await applyRateLimit(req, 'microsoft-auth-exchange');
    if (rateLimitResult instanceof Response) return rateLimitResult;

    const { code } = await req.json();

    if (!code) {
      return Response.json(
        { error: 'Authorization code is required' },
        { status: 400 }
      );
    }

    const credentials = {
      clientId: process.env.MICROSOFT_CLIENT_ID || '',
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
      tenantId: process.env.MICROSOFT_TENANT_ID || 'common',
    };

    const integration = new Microsoft365Integration(credentials);
    const tokens = await integration.exchangeCodeForTokens(code);

    // In a real app, you would store these tokens securely in the database
    // associated with the user's account
    
    return Response.json(
      { 
        success: true,
        message: 'Microsoft 365 connected successfully',
        hasTokens: !!(tokens.accessToken && tokens.refreshToken)
      },
      {
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.reset.toString(),
        }
      }
    );
  } catch (error: any) {
    return Response.json(
      { error: error.message || 'Failed to exchange authorization code' },
      { status: 500 }
    );
  }
}
