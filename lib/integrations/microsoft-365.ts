// Microsoft 365 Integration Implementation
import { Client } from '@microsoft/microsoft-graph-client';
import { AuthenticationProvider } from '@microsoft/microsoft-graph-client';
import { MicrosoftCredentials, MicrosoftExportOptions, ExportResult } from '../../types/integrations';

class CustomAuthProvider implements AuthenticationProvider {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  async getAccessToken(): Promise<string> {
    return this.accessToken;
  }
}

export class Microsoft365Integration {
  private credentials: MicrosoftCredentials;
  private graphClient: Client | null = null;

  constructor(credentials: MicrosoftCredentials) {
    this.credentials = credentials;
    this.setupGraphClient();
  }

  private setupGraphClient() {
    if (this.credentials.accessToken) {
      const authProvider = new CustomAuthProvider(this.credentials.accessToken);
      this.graphClient = Client.initWithMiddleware({ authProvider });
    }
  }

  // Get OAuth2 authorization URL
  getAuthUrl(): string {
    const scopes = [
      'Files.ReadWrite',
      'Sites.ReadWrite.All',
      'User.Read',
      'offline_access'
    ].join(' ');

    return `https://login.microsoftonline.com/${this.credentials.tenantId}/oauth2/v2.0/authorize?` +
      `client_id=${this.credentials.clientId}&` +
      `response_type=code&` +
      `redirect_uri=${encodeURIComponent('http://localhost:3000/api/integrations/microsoft/callback')}&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `response_mode=query`;
  }

  // Exchange authorization code for tokens
  async exchangeCodeForTokens(code: string): Promise<MicrosoftCredentials> {
    const tokenEndpoint = `https://login.microsoftonline.com/${this.credentials.tenantId}/oauth2/v2.0/token`;
    
    const params = new URLSearchParams();
    params.append('client_id', this.credentials.clientId);
    params.append('client_secret', this.credentials.clientSecret);
    params.append('code', code);
    params.append('grant_type', 'authorization_code');
    params.append('redirect_uri', 'http://localhost:3000/api/integrations/microsoft/callback');

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error_description || 'Failed to exchange code for tokens');
    }

    const updatedCredentials = {
      ...this.credentials,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    };

    this.credentials = updatedCredentials;
    this.setupGraphClient();

    return updatedCredentials;
  }

  // Export to Word document
  async exportToWord(
    title: string,
    content: string,
    options: MicrosoftExportOptions = {}
  ): Promise<ExportResult> {
    try {
      if (!this.graphClient) {
        throw new Error('Microsoft Graph client not initialized');
      }

      // Create Word document content in OOXML format
      const wordContent = this.generateWordXML(title, content);
      
      // Convert content to buffer
      const buffer = Buffer.from(wordContent, 'utf8');

      // Upload to OneDrive
      const driveItem = await this.graphClient
        .api('/me/drive/root/children')
        .post({
          name: `${title}.docx`,
          '@microsoft.graph.conflictBehavior': 'rename',
          file: {}
        });

      // Upload content
      await this.graphClient
        .api(`/me/drive/items/${driveItem.id}/content`)
        .put(buffer);

      // Move to specified folder if provided
      if (options.folderId) {
        await this.graphClient
          .api(`/me/drive/items/${driveItem.id}`)
          .patch({
            parentReference: {
              id: options.folderId
            }
          });
      }

      // Share with specified emails if provided
      if (options.shareWithEmails) {
        await this.shareDocument(driveItem.id, options.shareWithEmails, options.permissions);
      }

      return {
        success: true,
        id: driveItem.id,
        url: driveItem.webUrl,
        metadata: {
          exportedAt: new Date(),
          format: 'word',
          size: buffer.length,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          exportedAt: new Date(),
          format: 'word',
        },
      };
    }
  }

  // Export to Excel spreadsheet
  async exportToExcel(
    title: string,
    data: any[][],
    options: MicrosoftExportOptions = {}
  ): Promise<ExportResult> {
    try {
      if (!this.graphClient) {
        throw new Error('Microsoft Graph client not initialized');
      }

      // Create workbook
      const workbook = await this.graphClient
        .api('/me/drive/root/children')
        .post({
          name: `${title}.xlsx`,
          '@microsoft.graph.conflictBehavior': 'rename',
          file: {}
        });

      // Add data to worksheet if provided
      if (data && data.length > 0) {
        const range = `A1:${this.getColumnLetter(data[0].length)}${data.length}`;
        
        await this.graphClient
          .api(`/me/drive/items/${workbook.id}/workbook/worksheets/Sheet1/range(address='${range}')`)
          .patch({
            values: data
          });
      }

      return {
        success: true,
        id: workbook.id,
        url: workbook.webUrl,
        metadata: {
          exportedAt: new Date(),
          format: 'excel',
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          exportedAt: new Date(),
          format: 'excel',
        },
      };
    }
  }

  // Export to PowerPoint presentation
  async exportToPowerPoint(
    title: string,
    slides: Array<{ title: string; content: string }>,
    options: MicrosoftExportOptions = {}
  ): Promise<ExportResult> {
    try {
      if (!this.graphClient) {
        throw new Error('Microsoft Graph client not initialized');
      }

      // Create presentation
      const presentation = await this.graphClient
        .api('/me/drive/root/children')
        .post({
          name: `${title}.pptx`,
          '@microsoft.graph.conflictBehavior': 'rename',
          file: {}
        });

      // Note: Microsoft Graph API has limited PowerPoint manipulation capabilities
      // This would require more complex OOXML generation for full slide creation

      return {
        success: true,
        id: presentation.id,
        url: presentation.webUrl,
        metadata: {
          exportedAt: new Date(),
          format: 'powerpoint',
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          exportedAt: new Date(),
          format: 'powerpoint',
        },
      };
    }
  }

  // Share document with emails
  private async shareDocument(
    itemId: string,
    emails: string[],
    permission: 'read' | 'write' | 'owner' = 'read'
  ): Promise<void> {
    if (!this.graphClient) return;

    for (const email of emails) {
      await this.graphClient
        .api(`/me/drive/items/${itemId}/invite`)
        .post({
          recipients: [
            {
              email: email
            }
          ],
          message: 'Document shared from AI Council',
          requireSignIn: true,
          sendInvitation: true,
          roles: [permission]
        });
    }
  }

  // Generate Word XML content
  private generateWordXML(title: string, content: string): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:sz w:val="28"/>
        </w:rPr>
        <w:t>${title}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>${content}</w:t>
      </w:r>
    </w:p>
  </w:body>
</w:document>`;
  }

  // Helper function to convert column number to letter
  private getColumnLetter(columnNumber: number): string {
    let result = '';
    while (columnNumber > 0) {
      columnNumber--;
      result = String.fromCharCode(65 + (columnNumber % 26)) + result;
      columnNumber = Math.floor(columnNumber / 26);
    }
    return result;
  }

  // Check connection status
  async checkConnection(): Promise<boolean> {
    try {
      if (!this.graphClient) return false;
      await this.graphClient.api('/me').get();
      return true;
    } catch (error) {
      return false;
    }
  }

  // Get user information
  async getUserInfo(): Promise<any> {
    if (!this.graphClient) {
      throw new Error('Microsoft Graph client not initialized');
    }
    
    try {
      const user = await this.graphClient.api('/me').get();
      return user;
    } catch (error) {
      throw error;
    }
  }
}
