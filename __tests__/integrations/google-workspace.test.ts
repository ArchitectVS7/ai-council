import { GoogleWorkspaceIntegration } from '../../lib/integrations/google-workspace';
import { GoogleCredentials } from '../../types/integrations';

// Mock Google APIs
jest.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: jest.fn().mockImplementation(() => ({
        generateAuthUrl: jest.fn(() => 'https://mock-auth-url.com'),
        getToken: jest.fn(() => Promise.resolve({
          tokens: {
            access_token: 'mock-access-token',
            refresh_token: 'mock-refresh-token',
          }
        })),
        setCredentials: jest.fn(),
      })),
    },
    docs: jest.fn(() => ({
      documents: {
        create: jest.fn(() => Promise.resolve({
          data: { documentId: 'mock-doc-id' }
        })),
        batchUpdate: jest.fn(() => Promise.resolve({})),
      },
    })),
    sheets: jest.fn(() => ({
      spreadsheets: {
        create: jest.fn(() => Promise.resolve({
          data: { spreadsheetId: 'mock-sheet-id' }
        })),
        values: {
          update: jest.fn(() => Promise.resolve({})),
        },
      },
    })),
    slides: jest.fn(() => ({
      presentations: {
        create: jest.fn(() => Promise.resolve({
          data: { presentationId: 'mock-slides-id' }
        })),
        batchUpdate: jest.fn(() => Promise.resolve({})),
      },
    })),
    drive: jest.fn(() => ({
      files: {
        update: jest.fn(() => Promise.resolve({})),
      },
      permissions: {
        create: jest.fn(() => Promise.resolve({})),
      },
      about: {
        get: jest.fn(() => Promise.resolve({
          data: { user: { emailAddress: 'test@example.com' } }
        })),
      },
    })),
  },
}));

describe('GoogleWorkspaceIntegration', () => {
  const mockCredentials: GoogleCredentials = {
    clientId: 'mock-client-id',
    clientSecret: 'mock-client-secret',
    redirectUri: 'http://localhost:3000/callback',
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
  };

  let integration: GoogleWorkspaceIntegration;

  beforeEach(() => {
    integration = new GoogleWorkspaceIntegration(mockCredentials);
  });

  describe('Authentication', () => {
    it('should generate auth URL', () => {
      const authUrl = integration.getAuthUrl();
      expect(authUrl).toBe('https://mock-auth-url.com');
    });

    it('should exchange code for tokens', async () => {
      const tokens = await integration.exchangeCodeForTokens('mock-code');
      
      expect(tokens).toEqual({
        ...mockCredentials,
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      });
    });
  });

  describe('Google Docs Export', () => {
    it('should export content to Google Docs', async () => {
      const result = await integration.exportToGoogleDocs(
        'Test Document',
        'This is test content'
      );

      expect(result.success).toBe(true);
      expect(result.id).toBe('mock-doc-id');
      expect(result.url).toContain('mock-doc-id');
      expect(result.metadata.format).toBe('docs');
    });

    it('should handle export errors gracefully', async () => {
      // Mock an error
      const mockError = new Error('API Error');
      jest.spyOn(integration as any, 'auth').mockImplementation(() => {
        throw mockError;
      });

      const result = await integration.exportToGoogleDocs('Test', 'Content');

      expect(result.success).toBe(false);
      expect(result.error).toBe('API Error');
    });
  });

  describe('Google Sheets Export', () => {
    it('should export data to Google Sheets', async () => {
      const testData = [
        ['Name', 'Value'],
        ['Test 1', '100'],
        ['Test 2', '200'],
      ];

      const result = await integration.exportToGoogleSheets(
        'Test Spreadsheet',
        testData
      );

      expect(result.success).toBe(true);
      expect(result.id).toBe('mock-sheet-id');
      expect(result.metadata.format).toBe('sheets');
    });
  });

  describe('Google Slides Export', () => {
    it('should export slides to Google Slides', async () => {
      const testSlides = [
        { title: 'Slide 1', content: 'Content 1' },
        { title: 'Slide 2', content: 'Content 2' },
      ];

      const result = await integration.exportToGoogleSlides(
        'Test Presentation',
        testSlides
      );

      expect(result.success).toBe(true);
      expect(result.id).toBe('mock-slides-id');
      expect(result.metadata.format).toBe('slides');
    });
  });

  describe('Connection Status', () => {
    it('should check connection status', async () => {
      const isConnected = await integration.checkConnection();
      expect(isConnected).toBe(true);
    });

    it('should get user info', async () => {
      const userInfo = await integration.getUserInfo();
      expect(userInfo).toEqual({ emailAddress: 'test@example.com' });
    });
  });
});
