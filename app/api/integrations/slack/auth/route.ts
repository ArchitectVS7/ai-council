import { NextRequest } from 'next/server';
import { SlackIntegration } from '../../../../../lib/integrations/slack';
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

// GET /api/integrations/slack/auth - Get Slack OAuth URL
export async function GET(req: NextRequest) {
  try {
    const rateLimitResult = await applyRateLimit(req, 'slack-auth-url');
    if (rateLimitResult instanceof Response) return rateLimitResult;

    const clientId = process.env.SLACK_CLIENT_ID;
    const redirectUri = process.env.SLACK_REDIRECT_URI || 'http://localhost:3000/api/integrations/slack/callback';

    if (!clientId) {
      return Response.json(
        { error: 'Slack credentials not configured' },
        { status: 500 }
      );
    }

    const scopes = [
      'chat:write',
      'files:write',
      'channels:read',
      'users:read',
      'chat:write.public'
    ].join(',');

    const authUrl = `https://slack.com/oauth/v2/authorize?` +
      `client_id=${clientId}&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code`;

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

// POST /api/integrations/slack/auth - Exchange code for tokens
export async function POST(req: NextRequest) {
  try {
    const rateLimitResult = await applyRateLimit(req, 'slack-auth-exchange');
    if (rateLimitResult instanceof Response) return rateLimitResult;

    const { code } = await req.json();

    if (!code) {
      return Response.json(
        { error: 'Authorization code is required' },
        { status: 400 }
      );
    }

    const clientId = process.env.SLACK_CLIENT_ID;
    const clientSecret = process.env.SLACK_CLIENT_SECRET;
    const redirectUri = process.env.SLACK_REDIRECT_URI || 'http://localhost:3000/api/integrations/slack/callback';

    if (!clientId || !clientSecret) {
      return Response.json(
        { error: 'Slack credentials not configured' },
        { status: 500 }
      );
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.ok) {
      return Response.json(
        { error: tokenData.error || 'Failed to exchange code for token' },
        { status: 400 }
      );
    }

    // Test the connection
    const credentials = {
      botToken: tokenData.access_token,
      signingSecret: process.env.SLACK_SIGNING_SECRET || '',
    };

    const integration = new SlackIntegration(credentials);
    const isConnected = await integration.checkConnection();

    if (!isConnected) {
      return Response.json(
        { error: 'Failed to verify Slack connection' },
        { status: 400 }
      );
    }

    // In a real app, you would store these tokens securely in the database
    
    return Response.json(
      { 
        success: true,
        message: 'Slack connected successfully',
        team: tokenData.team,
        scope: tokenData.scope,
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
