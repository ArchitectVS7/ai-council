// Google Workspace Integration Implementation
import { google } from 'googleapis';
import { GoogleCredentials, GoogleExportOptions, ExportResult } from '../../types/integrations';

export class GoogleWorkspaceIntegration {
  private credentials: GoogleCredentials;
  private auth: any;

  constructor(credentials: GoogleCredentials) {
    this.credentials = credentials;
    this.setupAuth();
  }

  private setupAuth() {
    this.auth = new google.auth.OAuth2(
      this.credentials.clientId,
      this.credentials.clientSecret,
      this.credentials.redirectUri
    );

    if (this.credentials.accessToken) {
      this.auth.setCredentials({
        access_token: this.credentials.accessToken,
        refresh_token: this.credentials.refreshToken,
      });
    }
  }

  // Get OAuth2 authorization URL
  getAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/documents',
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/presentations',
      'https://www.googleapis.com/auth/drive.file'
    ];

    return this.auth.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
    });
  }

  // Exchange authorization code for tokens
  async exchangeCodeForTokens(code: string): Promise<GoogleCredentials> {
    const { tokens } = await this.auth.getToken(code);
    this.auth.setCredentials(tokens);

    return {
      ...this.credentials,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
    };
  }

  // Export to Google Docs
  async exportToGoogleDocs(
    title: string,
    content: string,
    options: GoogleExportOptions = {}
  ): Promise<ExportResult> {
    try {
      const docs = google.docs({ version: 'v1', auth: this.auth });
      
      // Create a new document
      const createResponse = await docs.documents.create({
        requestBody: {
          title: title,
        },
      });

      const documentId = createResponse.data.documentId!;

      // Insert content into the document
      if (content) {
        await docs.documents.batchUpdate({
          documentId: documentId,
          requestBody: {
            requests: [
              {
                insertText: {
                  location: {
                    index: 1,
                  },
                  text: content,
                },
              },
            ],
          },
        });
      }

      // Move to specified folder if provided
      if (options.folderId) {
        const drive = google.drive({ version: 'v3', auth: this.auth });
        await drive.files.update({
          fileId: documentId,
          addParents: options.folderId,
        });
      }

      // Share with specified emails if provided
      if (options.shareWithEmails) {
        await this.shareDocument(documentId, options.shareWithEmails, options.permissions);
      }

      return {
        success: true,
        id: documentId,
        url: `https://docs.google.com/document/d/${documentId}/edit`,
        metadata: {
          exportedAt: new Date(),
          format: 'docs',
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          exportedAt: new Date(),
          format: 'docs',
        },
      };
    }
  }

  // Export to Google Sheets
  async exportToGoogleSheets(
    title: string,
    data: any[][],
    options: GoogleExportOptions = {}
  ): Promise<ExportResult> {
    try {
      const sheets = google.sheets({ version: 'v4', auth: this.auth });
      
      // Create a new spreadsheet
      const createResponse = await sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title: title,
          },
        },
      });

      const spreadsheetId = createResponse.data.spreadsheetId!;

      // Insert data into the spreadsheet
      if (data && data.length > 0) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: spreadsheetId,
          range: 'A1',
          valueInputOption: 'RAW',
          requestBody: {
            values: data,
          },
        });
      }

      // Move to specified folder if provided
      if (options.folderId) {
        const drive = google.drive({ version: 'v3', auth: this.auth });
        await drive.files.update({
          fileId: spreadsheetId,
          addParents: options.folderId,
        });
      }

      return {
        success: true,
        id: spreadsheetId,
        url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
        metadata: {
          exportedAt: new Date(),
          format: 'sheets',
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          exportedAt: new Date(),
          format: 'sheets',
        },
      };
    }
  }

  // Export to Google Slides
  async exportToGoogleSlides(
    title: string,
    slides: Array<{ title: string; content: string }>,
    options: GoogleExportOptions = {}
  ): Promise<ExportResult> {
    try {
      const slidesApi = google.slides({ version: 'v1', auth: this.auth });
      
      // Create a new presentation
      const createResponse = await slidesApi.presentations.create({
        requestBody: {
          title: title,
        },
      });

      const presentationId = createResponse.data.presentationId!;

      // Add slides with content
      const requests: any[] = [];
      
      slides.forEach((slide, index) => {
        if (index > 0) { // First slide already exists
          requests.push({
            createSlide: {
              objectId: `slide_${index}`,
              insertionIndex: index,
              slideLayoutReference: {
                predefinedLayout: 'TITLE_AND_BODY',
              },
            },
          });
        }

        // Add title and content
        requests.push({
          insertText: {
            objectId: index === 0 ? 'p' : `slide_${index}`,
            text: slide.title,
          },
        });
      });

      if (requests.length > 0) {
        await slidesApi.presentations.batchUpdate({
          presentationId: presentationId,
          requestBody: {
            requests: requests,
          },
        });
      }

      return {
        success: true,
        id: presentationId,
        url: `https://docs.google.com/presentation/d/${presentationId}/edit`,
        metadata: {
          exportedAt: new Date(),
          format: 'slides',
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          exportedAt: new Date(),
          format: 'slides',
        },
      };
    }
  }

  // Share document with emails
  private async shareDocument(
    fileId: string,
    emails: string[],
    permission: 'reader' | 'writer' | 'owner' = 'reader'
  ): Promise<void> {
    const drive = google.drive({ version: 'v3', auth: this.auth });
    
    for (const email of emails) {
      await drive.permissions.create({
        fileId: fileId,
        requestBody: {
          role: permission,
          type: 'user',
          emailAddress: email,
        },
      });
    }
  }

  // Check connection status
  async checkConnection(): Promise<boolean> {
    try {
      const drive = google.drive({ version: 'v3', auth: this.auth });
      await drive.about.get({ fields: 'user' });
      return true;
    } catch (error) {
      return false;
    }
  }

  // Get user information
  async getUserInfo(): Promise<any> {
    try {
      const drive = google.drive({ version: 'v3', auth: this.auth });
      const response = await drive.about.get({ fields: 'user' });
      return response.data.user;
    } catch (error) {
      throw error;
    }
  }
}
