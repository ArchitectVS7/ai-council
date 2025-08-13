// Slack Integration Implementation
import { WebClient } from '@slack/web-api';
import { SlackCredentials, SlackExportOptions, ExportResult } from '../../types/integrations';

export class SlackIntegration {
  private credentials: SlackCredentials;
  private client: WebClient;

  constructor(credentials: SlackCredentials) {
    this.credentials = credentials;
    this.client = new WebClient(credentials.botToken);
  }

  // Post deliverable to Slack channel
  async postToChannel(
    content: string,
    options: SlackExportOptions
  ): Promise<ExportResult> {
    try {
      let response;
      
      if (options.asSnippet) {
        // Post as a code snippet
        response = await this.client.files.upload({
          channels: options.channelId,
          content: content,
          filetype: 'text',
          title: 'AI Council Deliverable',
          thread_ts: options.threadTs,
        });
      } else {
        // Post as a regular message
        const text = options.mentions 
          ? `${options.mentions.map(mention => `<@${mention}>`).join(' ')} ${content}`
          : content;

        response = await this.client.chat.postMessage({
          channel: options.channelId,
          text: text,
          thread_ts: options.threadTs,
          blocks: this.formatContentAsBlocks(content),
        });
      }

      if (!response.ok) {
        throw new Error(response.error || 'Failed to post to Slack');
      }

      return {
        success: true,
        id: response.ts as string,
        url: this.generateMessageUrl(options.channelId, response.ts as string),
        metadata: {
          exportedAt: new Date(),
          format: 'slack-post',
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          exportedAt: new Date(),
          format: 'slack-post',
        },
      };
    }
  }

  // Send direct message to user
  async sendDirectMessage(
    userId: string,
    content: string,
    attachments?: any[]
  ): Promise<ExportResult> {
    try {
      const response = await this.client.chat.postMessage({
        channel: userId,
        text: content,
        attachments: attachments,
      });

      if (!response.ok) {
        throw new Error(response.error || 'Failed to send direct message');
      }

      return {
        success: true,
        id: response.ts as string,
        metadata: {
          exportedAt: new Date(),
          format: 'slack-post',
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          exportedAt: new Date(),
          format: 'slack-post',
        },
      };
    }
  }

  // Post workflow status update
  async postWorkflowUpdate(
    channelId: string,
    workflowName: string,
    status: 'started' | 'completed' | 'failed',
    details?: string
  ): Promise<ExportResult> {
    try {
      const emoji = {
        started: ':hourglass_flowing_sand:',
        completed: ':white_check_mark:',
        failed: ':x:'
      };

      const color = {
        started: '#36a64f',
        completed: '#2eb886',
        failed: '#ff6b6b'
      };

      const blocks = [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `${emoji[status]} *${workflowName}* workflow ${status}`
          }
        }
      ];

      if (details) {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: details
          }
        });
      }

      const response = await this.client.chat.postMessage({
        channel: channelId,
        text: `Workflow ${status}: ${workflowName}`,
        blocks: blocks,
        attachments: [
          {
            color: color[status],
            fields: [
              {
                title: 'Status',
                value: status.charAt(0).toUpperCase() + status.slice(1),
                short: true
              },
              {
                title: 'Time',
                value: new Date().toLocaleString(),
                short: true
              }
            ]
          }
        ]
      });

      if (!response.ok) {
        throw new Error(response.error || 'Failed to post workflow update');
      }

      return {
        success: true,
        id: response.ts as string,
        url: this.generateMessageUrl(channelId, response.ts as string),
        metadata: {
          exportedAt: new Date(),
          format: 'slack-post',
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          exportedAt: new Date(),
          format: 'slack-post',
        },
      };
    }
  }

  // Get channel list
  async getChannels(): Promise<any[]> {
    try {
      const response = await this.client.conversations.list({
        exclude_archived: true,
        types: 'public_channel,private_channel'
      });

      if (!response.ok) {
        throw new Error(response.error || 'Failed to get channels');
      }

      return response.channels || [];
    } catch (error) {
      throw error;
    }
  }

  // Get user list
  async getUsers(): Promise<any[]> {
    try {
      const response = await this.client.users.list();

      if (!response.ok) {
        throw new Error(response.error || 'Failed to get users');
      }

      return (response.members || []).filter((user: any) => !user.deleted && !user.is_bot);
    } catch (error) {
      throw error;
    }
  }

  // Check connection status
  async checkConnection(): Promise<boolean> {
    try {
      const response = await this.client.auth.test();
      return response.ok || false;
    } catch (error) {
      return false;
    }
  }

  // Get bot information
  async getBotInfo(): Promise<any> {
    try {
      const response = await this.client.auth.test();
      
      if (!response.ok) {
        throw new Error(response.error || 'Failed to get bot info');
      }

      return {
        userId: response.user_id,
        teamId: response.team_id,
        teamName: response.team,
        user: response.user,
      };
    } catch (error) {
      throw error;
    }
  }

  // Format content as Slack blocks
  private formatContentAsBlocks(content: string): any[] {
    // Split content into sections and format as blocks
    const sections = content.split('\n\n');
    const blocks: any[] = [];

    sections.forEach((section, index) => {
      if (section.trim()) {
        // Check if section is a header (starts with #)
        if (section.startsWith('#')) {
          blocks.push({
            type: 'header',
            text: {
              type: 'plain_text',
              text: section.replace(/^#+\s*/, ''),
            }
          });
        } else {
          blocks.push({
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: section.trim()
            }
          });
        }

        // Add divider between sections (except for the last one)
        if (index < sections.length - 1) {
          blocks.push({
            type: 'divider'
          });
        }
      }
    });

    return blocks;
  }

  // Generate message URL
  private generateMessageUrl(channelId: string, messageTs: string): string {
    // Note: This would need the actual team domain to generate a proper URL
    // For now, return a placeholder that could be enhanced with team info
    return `https://slack.com/app_redirect?channel=${channelId}&message_ts=${messageTs}`;
  }

  // Upload file to Slack
  async uploadFile(
    channelId: string,
    fileBuffer: Buffer,
    filename: string,
    title?: string,
    comment?: string
  ): Promise<ExportResult> {
    try {
      const response = await this.client.files.upload({
        channels: channelId,
        file: fileBuffer,
        filename: filename,
        title: title || filename,
        initial_comment: comment,
      });

      if (!response.ok) {
        throw new Error(response.error || 'Failed to upload file');
      }

      return {
        success: true,
        id: response.file?.id || '',
        url: response.file?.permalink || '',
        metadata: {
          exportedAt: new Date(),
          format: 'slack-post',
          size: fileBuffer.length,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          exportedAt: new Date(),
          format: 'slack-post',
        },
      };
    }
  }
}
