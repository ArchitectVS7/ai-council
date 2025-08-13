export type DeliverableType =
  | 'creative-brief'
  | 'strategic-plan'
  | 'research-summary'
  | 'implementation-roadmap';

export type DeliverableFormat =
  | 'pdf'
  | 'docx'
  | 'markdown'
  | 'json';

export type StakeholderType =
  | 'executive'
  | 'technical'
  | 'creative'
  | 'general';

export interface DeliverableConfig {
  type: DeliverableType;
  format: DeliverableFormat;
  stakeholder: StakeholderType;
  sessionId: string;
  customizations?: {
    includeCharts?: boolean;
    includeAppendices?: boolean;
    branding?: {
      logo?: string;
      colors?: string[];
      font?: string;
    };
  };
}

export interface DeliverableContent {
  title: string;
  executiveSummary: string;
  mainContent: string;
  recommendations: string[];
  appendices?: string[];
  metadata: {
    generatedAt: Date;
    sessionDuration: number;
    participants: string[];
    tags: string[];
  };
}

export interface DeliverableTemplate {
  type: DeliverableType;
  stakeholder: StakeholderType;
  structure: {
    sections: DeliverableSection[];
    formatting: FormattingOptions;
  };
}

export interface DeliverableSection {
  id: string;
  title: string;
  content: string;
  subsections?: DeliverableSection[];
  includeFor: StakeholderType[];
  required: boolean;
}

export interface FormattingOptions {
  headerStyle: {
    fontSize: number;
    fontWeight: 'normal' | 'bold';
    color: string;
  };
  bodyStyle: {
    fontSize: number;
    lineHeight: number;
    fontFamily: string;
  };
  pageLayout: {
    margins: {
      top: number;
      bottom: number;
      left: number;
      right: number;
    };
    orientation: 'portrait' | 'landscape';
  };
  branding?: {
    includeHeader: boolean;
    includeLogo: boolean;
    colorScheme: string[];
  };
}

export interface GeneratedDeliverable {
  id: string;
  config: DeliverableConfig;
  content: DeliverableContent;
  generatedFile?: {
    filename: string;
    mimeType: string;
    size: number;
    url?: string;
  };
  status: 'generating' | 'completed' | 'failed';
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface DeliverableGenerationRequest {
  config: DeliverableConfig;
  content: DeliverableContent;
  template?: DeliverableTemplate;
}

export interface DeliverableGenerationResult {
  success: boolean;
  deliverable?: GeneratedDeliverable;
  error?: string;
  buffer?: Buffer;
  filename?: string;
  mimeType?: string;
}

// Chart and visualization types for advanced deliverables
export interface ChartData {
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'table';
  title: string;
  data: any[];
  options?: {
    colors?: string[];
    legend?: boolean;
    grid?: boolean;
    axes?: {
      x?: { label: string; type: 'category' | 'numeric' | 'datetime' };
      y?: { label: string; type: 'category' | 'numeric' | 'datetime' };
    };
  };
}

export interface DeliverableChartConfig {
  includeCharts: boolean;
  charts: ChartData[];
  chartPlacement: 'inline' | 'appendix' | 'separate';
}

// Session data extraction interfaces
export interface SessionData {
  id: string;
  topic: string;
  participants: SessionParticipant[];
  messages: SessionMessage[];
  duration: number;
  status: string;
  summary?: string;
  insights?: string[];
  startedAt: Date;
  completedAt?: Date;
}

export interface SessionParticipant {
  id: string;
  name: string;
  role: string;
  expertise: string;
  messageCount: number;
}

export interface SessionMessage {
  id: string;
  participantId: string;
  content: string;
  timestamp: Date;
  round: number;
}

// Export utilities type
export interface ExportUtility {
  generatePDF(content: DeliverableContent, template: DeliverableTemplate): Promise<Buffer>;
  generateDOCX(content: DeliverableContent, template: DeliverableTemplate): Promise<Buffer>;
  generateMarkdown(content: DeliverableContent, template: DeliverableTemplate): Promise<string>;
  generateJSON(content: DeliverableContent): Promise<string>;
}
