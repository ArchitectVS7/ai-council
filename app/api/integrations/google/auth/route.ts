import { NextRequest } from 'next/server';
import { GoogleWorkspaceIntegration } from '../../../../../lib/integrations/google-workspace';
import { rateLimit, defaultRateLimits, getClientIdentifier } from '../../../../../lib/ratelimit';

export const dynamic = 'force-dynamic';

async function applyRateLimit(req: NextRequest, action: string) {
  const clientId = getClientIdentifier(req);
  const rateLimitResult = await rateLimit(clientId, defaultRateLimits.auth, action);
  
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

// GET /api/integrations/google/auth - Get Google OAuth URL
export async function GET(req: NextRequest) {
  try {
    const rateLimitResult = await applyRateLimit(req, 'google-auth-url');
    if (rateLimitResult instanceof Response) return rateLimitResult;

    // These would typically come from environment variables
    const credentials = {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/integrations/google/callback',
    };

    if (!credentials.clientId || !credentials.clientSecret) {
      return Response.json(
        { error: 'Google credentials not configured' },
        { status: 500 }
      );
    }

    const integration = new GoogleWorkspaceIntegration(credentials);
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

// POST /api/integrations/google/auth - Exchange code for tokens
export async function POST(req: NextRequest) {
  try {
    const rateLimitResult = await applyRateLimit(req, 'google-auth-exchange');
    if (rateLimitResult instanceof Response) return rateLimitResult;

    const { code } = await req.json();

    if (!code) {
      return Response.json(
        { error: 'Authorization code is required' },
        { status: 400 }
      );
    }

    const credentials = {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/integrations/google/callback',
    };

    const integration = new GoogleWorkspaceIntegration(credentials);
    const tokens = await integration.exchangeCodeForTokens(code);

    // In a real app, you would store these tokens securely in the database
    // associated with the user's account
    
    return Response.json(
      { 
        success: true,
        message: 'Google Workspace connected successfully',
        // Don't return the actual tokens for security
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
