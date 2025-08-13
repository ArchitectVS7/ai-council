// Integration types for Professional Features (Phase 2)

export type IntegrationType = 'google' | 'microsoft' | 'slack';
export type ExportFormat = 'docs' | 'sheets' | 'slides' | 'word' | 'excel' | 'powerpoint' | 'slack-post';

export interface IntegrationConfig {
  id: string;
  type: IntegrationType;
  name: string;
  description: string;
  isEnabled: boolean;
  credentials?: Record<string, any>;
  settings: Record<string, any>;
}

export interface ExportRequest {
  type: IntegrationType;
  format: ExportFormat;
  deliverableId: string;
  content: any;
  destination?: {
    folderId?: string;
    channelId?: string;
    driveId?: string;
  };
  metadata: {
    title: string;
    description?: string;
    tags?: string[];
    stakeholder?: string;
  };
}

export interface ExportResult {
  success: boolean;
  url?: string;
  id?: string;
  error?: string;
  metadata: {
    exportedAt: Date;
    format: ExportFormat;
    size?: number;
  };
}

// Google Workspace Integration Types
export interface GoogleCredentials {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  accessToken?: string;
  refreshToken?: string;
}

export interface GoogleExportOptions {
  folderId?: string;
  shareWithEmails?: string[];
  permissions?: 'reader' | 'writer' | 'owner';
}

// Microsoft 365 Integration Types
export interface MicrosoftCredentials {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  accessToken?: string;
  refreshToken?: string;
}

export interface MicrosoftExportOptions {
  driveId?: string;
  folderId?: string;
  shareWithEmails?: string[];
  permissions?: 'read' | 'write' | 'owner';
}

// Slack Integration Types
export interface SlackCredentials {
  botToken: string;
  userToken?: string;
  signingSecret: string;
}

export interface SlackExportOptions {
  channelId: string;
  threadTs?: string;
  asSnippet?: boolean;
  mentions?: string[];
}

// Integration Status Types
export interface IntegrationStatus {
  type: IntegrationType;
  isConnected: boolean;
  lastSync?: Date;
  error?: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

// Professional Integration Templates
export interface ProfessionalTemplate {
  id: string;
  name: string;
  type: IntegrationType;
  format: ExportFormat;
  template: string;
  variables: Record<string, any>;
  styling: {
    theme?: string;
    colors?: string[];
    fonts?: string[];
  };
}
