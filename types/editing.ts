// Human-in-the-Loop Editing Types

export interface EditableResponse {
  id: string;
  messageId: string;
  personaId: string;
  personaName: string;
  originalContent: string;
  currentContent: string;
  isEdited: boolean;
  editHistory: EditHistoryEntry[];
  status: 'pending' | 'approved' | 'rejected' | 'needs_review';
  feedback?: ResponseFeedback;
  createdAt: Date;
  updatedAt: Date;
}

export interface EditHistoryEntry {
  id: string;
  editedBy: string; // user ID
  editedAt: Date;
  previousContent: string;
  newContent: string;
  reason?: string;
  comment?: string;
  type: 'manual_edit' | 'suggestion_applied' | 'ai_improvement' | 'rollback';
}

export interface ResponseFeedback {
  id: string;
  responseId: string;
  userId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  category: 'accuracy' | 'relevance' | 'tone' | 'completeness' | 'clarity';
  comment?: string;
  suggestions?: string[];
  createdAt: Date;
}

export interface EditSuggestion {
  id: string;
  responseId: string;
  type: 'grammar' | 'tone' | 'content' | 'structure' | 'factual';
  suggestion: string;
  confidence: number; // 0-1
  reasoning: string;
  appliedAt?: Date;
  rejectedAt?: Date;
}

export interface PersonaLearning {
  personaId: string;
  personaName: string;
  totalResponses: number;
  editedResponses: number;
  averageRating: number;
  improvementAreas: {
    category: string;
    frequency: number;
    examples: string[];
  }[];
  learningInsights: {
    pattern: string;
    description: string;
    recommendation: string;
    confidence: number;
  }[];
  lastUpdated: Date;
}

export interface ApprovalWorkflow {
  id: string;
  responseId: string;
  workflowType: 'automatic' | 'manual' | 'hybrid';
  steps: ApprovalStep[];
  currentStep: number;
  status: 'pending' | 'approved' | 'rejected' | 'escalated';
  createdAt: Date;
  completedAt?: Date;
}

export interface ApprovalStep {
  id: string;
  stepNumber: number;
  type: 'review' | 'edit' | 'approve' | 'quality_check';
  assignedTo?: string;
  status: 'pending' | 'completed' | 'skipped';
  action?: 'approve' | 'reject' | 'edit' | 'escalate';
  comment?: string;
  completedAt?: Date;
}

export interface EditingPreferences {
  userId: string;
  autoApproveThreshold: number; // 0-1, auto-approve if persona confidence is above this
  preferredEditingMode: 'inline' | 'side_by_side' | 'modal';
  showSuggestions: boolean;
  enableAutoCorrect: boolean;
  notificationSettings: {
    onEdit: boolean;
    onApproval: boolean;
    onFeedback: boolean;
  };
}

// UI Component Props
export interface ResponseEditorProps {
  response: EditableResponse;
  onEdit: (newContent: string, reason?: string) => void;
  onApprove: () => void;
  onReject: (reason: string) => void;
  onFeedback: (feedback: Omit<ResponseFeedback, 'id' | 'responseId' | 'createdAt'>) => void;
  suggestions?: EditSuggestion[];
  mode?: 'view' | 'edit' | 'review';
  showHistory?: boolean;
}

export interface EditHistoryProps {
  history: EditHistoryEntry[];
  onRevert?: (entryId: string) => void;
  showDiff?: boolean;
}

export interface FeedbackCollectorProps {
  responseId: string;
  onSubmit: (feedback: Omit<ResponseFeedback, 'id' | 'responseId' | 'createdAt'>) => void;
  initialFeedback?: ResponseFeedback;
}

// API Request/Response Types
export interface EditResponseRequest {
  responseId: string;
  newContent: string;
  reason?: string;
  comment?: string;
}

export interface ApproveResponseRequest {
  responseId: string;
  comment?: string;
}

export interface SubmitFeedbackRequest {
  responseId: string;
  rating: number;
  category: string;
  comment?: string;
  suggestions?: string[];
}

export interface GetEditHistoryRequest {
  responseId: string;
  limit?: number;
  offset?: number;
}

export interface PersonaLearningRequest {
  personaId?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  includeInsights?: boolean;
}
