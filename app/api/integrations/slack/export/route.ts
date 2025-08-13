import { NextRequest } from 'next/server';
import { SlackIntegration } from '../../../../../lib/integrations/slack';
import { rateLimit, defaultRateLimits, getClientIdentifier } from '../../../../../lib/ratelimit';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const exportSchema = z.object({
  type: z.enum(['message', 'file', 'workflow-update']),
  channelId: z.string().min(1),
  content: z.string().min(1),
  options: z.object({
    threadTs: z.string().optional(),
    asSnippet: z.boolean().optional(),
    mentions: z.array(z.string()).optional(),
    filename: z.string().optional(),
    title: z.string().optional(),
    workflowName: z.string().optional(),
    status: z.enum(['started', 'completed', 'failed']).optional(),
  }).optional(),
});

async function applyRateLimit(req: NextRequest, action: string) {
  const clientId = getClientIdentifier(req);
  const rateLimitResult = await rateLimit(clientId, defaultRateLimits.export, action);
  
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

// POST /api/integrations/slack/export - Post content to Slack
export async function POST(req: NextRequest) {
  try {
    const rateLimitResult = await applyRateLimit(req, 'slack-export');
    if (rateLimitResult instanceof Response) return rateLimitResult;

    const body = await req.json();
    const validationResult = exportSchema.safeParse(body);
    
    if (!validationResult.success) {
      return Response.json(
        { error: 'Invalid input', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { type, channelId, content, options = {} } = validationResult.data;

    const botToken = req.headers.get('x-slack-bot-token');
    const signingSecret = process.env.SLACK_SIGNING_SECRET || '';

    if (!botToken) {
      return Response.json(
        { 
          error: 'Slack not connected',
          authRequired: true,
          authUrl: '/api/integrations/slack/auth'
        },
        { status: 401 }
      );
    }

    const credentials = {
      botToken,
      signingSecret,
    };

    const integration = new SlackIntegration(credentials);
    let result;

    switch (type) {
      case 'message':
        result = await integration.postToChannel(content, {
          channelId,
          threadTs: options.threadTs,
          asSnippet: options.asSnippet,
          mentions: options.mentions,
        });
        break;

      case 'file':
        const fileBuffer = Buffer.from(content, 'utf8');
        result = await integration.uploadFile(
          channelId,
          fileBuffer,
          options.filename || 'deliverable.txt',
          options.title,
          'Deliverable from AI Council'
        );
        break;

      case 'workflow-update':
        if (!options.workflowName || !options.status) {
          return Response.json(
            { error: 'Workflow name and status are required for workflow updates' },
            { status: 400 }
          );
        }
        result = await integration.postWorkflowUpdate(
          channelId,
          options.workflowName,
          options.status,
          content
        );
        break;

      default:
        return Response.json(
          { error: 'Unsupported export type' },
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
      { error: error.message || 'Failed to post to Slack' },
      { status: 500 }
    );
  }
}

// GET /api/integrations/slack/export - Get Slack channels and users
export async function GET(req: NextRequest) {
  try {
    const rateLimitResult = await applyRateLimit(req, 'slack-info');
    if (rateLimitResult instanceof Response) return rateLimitResult;

    const botToken = req.headers.get('x-slack-bot-token');

    if (!botToken) {
      return Response.json(
        { 
          error: 'Slack not connected',
          authRequired: true
        },
        { status: 401 }
      );
    }

    const credentials = {
      botToken,
      signingSecret: process.env.SLACK_SIGNING_SECRET || '',
    };

    const integration = new SlackIntegration(credentials);
    
    const [channels, users] = await Promise.all([
      integration.getChannels(),
      integration.getUsers(),
    ]);

    return Response.json(
      { 
        channels: channels.map(channel => ({
          id: channel.id,
          name: channel.name,
          isPrivate: channel.is_private,
        })),
        users: users.map(user => ({
          id: user.id,
          name: user.name,
          realName: user.real_name,
        })),
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
      { error: error.message || 'Failed to get Slack information' },
      { status: 500 }
    );
  }
}
