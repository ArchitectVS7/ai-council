import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ResponseEditor from '../../components/editing/ResponseEditor';
import { EditableResponse, EditSuggestion } from '../../types/editing';

// Mock data
const mockResponse: EditableResponse = {
  id: '1',
  messageId: 'msg-1',
  personaId: 'persona-1',
  personaName: 'Creative Director',
  originalContent: 'This is the original response.',
  currentContent: 'This is the current response.',
  isEdited: false,
  editHistory: [],
  status: 'pending',
  createdAt: new Date('2025-01-13T10:00:00Z'),
  updatedAt: new Date('2025-01-13T10:00:00Z'),
};

const mockSuggestions: EditSuggestion[] = [
  {
    id: 'suggestion-1',
    responseId: '1',
    type: 'tone',
    suggestion: 'Make this more professional',
    confidence: 0.8,
    reasoning: 'The tone could be more formal for this context',
  },
  {
    id: 'suggestion-2',
    responseId: '1',
    type: 'clarity',
    suggestion: 'Add more specific examples',
    confidence: 0.9,
    reasoning: 'Examples would improve understanding',
  },
];

describe('ResponseEditor', () => {
  const mockOnEdit = jest.fn();
  const mockOnApprove = jest.fn();
  const mockOnReject = jest.fn();
  const mockOnFeedback = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render response content', () => {
      render(
        <ResponseEditor
          response={mockResponse}
          onEdit={mockOnEdit}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          onFeedback={mockOnFeedback}
        />
      );

      expect(screen.getByText('Creative Director')).toBeInTheDocument();
      expect(screen.getByText(mockResponse.currentContent)).toBeInTheDocument();
      expect(screen.getByText('PENDING')).toBeInTheDocument();
    });

    it('should show edit and feedback buttons in default mode', () => {
      render(
        <ResponseEditor
          response={mockResponse}
          onEdit={mockOnEdit}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          onFeedback={mockOnFeedback}
          mode="edit"
        />
      );

      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByText('Feedback')).toBeInTheDocument();
    });

    it('should show approve/reject buttons in review mode', () => {
      render(
        <ResponseEditor
          response={mockResponse}
          onEdit={mockOnEdit}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          onFeedback={mockOnFeedback}
          mode="review"
        />
      );

      expect(screen.getByText('Approve')).toBeInTheDocument();
      expect(screen.getByText('Reject')).toBeInTheDocument();
    });

    it('should display suggestions when provided', () => {
      render(
        <ResponseEditor
          response={mockResponse}
          onEdit={mockOnEdit}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          onFeedback={mockOnFeedback}
          suggestions={mockSuggestions}
        />
      );

      expect(screen.getByText('2 suggestions')).toBeInTheDocument();
    });
  });

  describe('Editing Functionality', () => {
    it('should enter edit mode when edit button is clicked', () => {
      render(
        <ResponseEditor
          response={mockResponse}
          onEdit={mockOnEdit}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          onFeedback={mockOnFeedback}
          mode="edit"
        />
      );

      fireEvent.click(screen.getByText('Edit'));

      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should call onEdit when save changes is clicked', async () => {
      render(
        <ResponseEditor
          response={mockResponse}
          onEdit={mockOnEdit}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          onFeedback={mockOnFeedback}
          mode="edit"
        />
      );

      fireEvent.click(screen.getByText('Edit'));
      
      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'Updated content' } });

      fireEvent.click(screen.getByText('Save Changes'));

      expect(mockOnEdit).toHaveBeenCalledWith('Updated content', undefined);
    });

    it('should include reason when provided', async () => {
      render(
        <ResponseEditor
          response={mockResponse}
          onEdit={mockOnEdit}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          onFeedback={mockOnFeedback}
          mode="edit"
        />
      );

      fireEvent.click(screen.getByText('Edit'));
      
      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'Updated content' } });

      const reasonInput = screen.getByPlaceholderText('Reason for edit (optional)');
      fireEvent.change(reasonInput, { target: { value: 'Improved clarity' } });

      fireEvent.click(screen.getByText('Save Changes'));

      expect(mockOnEdit).toHaveBeenCalledWith('Updated content', 'Improved clarity');
    });

    it('should cancel edit mode without saving', () => {
      render(
        <ResponseEditor
          response={mockResponse}
          onEdit={mockOnEdit}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          onFeedback={mockOnFeedback}
          mode="edit"
        />
      );

      fireEvent.click(screen.getByText('Edit'));
      
      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'Updated content' } });

      fireEvent.click(screen.getByText('Cancel'));

      expect(mockOnEdit).not.toHaveBeenCalled();
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });
  });

  describe('Suggestions', () => {
    it('should show suggestions when toggle is clicked', () => {
      render(
        <ResponseEditor
          response={mockResponse}
          onEdit={mockOnEdit}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          onFeedback={mockOnFeedback}
          suggestions={mockSuggestions}
        />
      );

      fireEvent.click(screen.getByText('2 suggestions'));

      expect(screen.getByText('AI Suggestions')).toBeInTheDocument();
      expect(screen.getByText('tone (80% confidence)')).toBeInTheDocument();
      expect(screen.getByText('clarity (90% confidence)')).toBeInTheDocument();
    });

    it('should apply suggestion when apply button is clicked', () => {
      render(
        <ResponseEditor
          response={mockResponse}
          onEdit={mockOnEdit}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          onFeedback={mockOnFeedback}
          suggestions={mockSuggestions}
          mode="edit"
        />
      );

      // Enter edit mode and show suggestions
      fireEvent.click(screen.getByText('Edit'));
      fireEvent.click(screen.getByText('2 suggestions'));

      // Apply first suggestion
      const applyButtons = screen.getAllByText('Apply');
      fireEvent.click(applyButtons[0]);

      // Check that the content was updated
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveValue('Make this more professional');
    });
  });

  describe('Approval Workflow', () => {
    it('should call onApprove when approve button is clicked', () => {
      render(
        <ResponseEditor
          response={mockResponse}
          onEdit={mockOnEdit}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          onFeedback={mockOnFeedback}
          mode="review"
        />
      );

      fireEvent.click(screen.getByText('Approve'));

      expect(mockOnApprove).toHaveBeenCalled();
    });

    it('should call onReject when reject button is clicked', () => {
      render(
        <ResponseEditor
          response={mockResponse}
          onEdit={mockOnEdit}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          onFeedback={mockOnFeedback}
          mode="review"
        />
      );

      fireEvent.click(screen.getByText('Reject'));

      expect(mockOnReject).toHaveBeenCalledWith('Needs improvement');
    });
  });

  describe('Edit History', () => {
    const responseWithHistory: EditableResponse = {
      ...mockResponse,
      isEdited: true,
      editHistory: [
        {
          id: 'edit-1',
          editedBy: 'user-1',
          editedAt: new Date('2025-01-13T11:00:00Z'),
          previousContent: 'Old content',
          newContent: 'New content',
          reason: 'Improved clarity',
          type: 'manual_edit',
        },
        {
          id: 'edit-2',
          editedBy: 'user-2',
          editedAt: new Date('2025-01-13T12:00:00Z'),
          previousContent: 'New content',
          newContent: 'Final content',
          type: 'suggestion_applied',
        },
      ],
    };

    it('should show edit history when showHistory is true', () => {
      render(
        <ResponseEditor
          response={responseWithHistory}
          onEdit={mockOnEdit}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          onFeedback={mockOnFeedback}
          showHistory={true}
        />
      );

      expect(screen.getByText('Recent Changes')).toBeInTheDocument();
      expect(screen.getByText('manual edit')).toBeInTheDocument();
      expect(screen.getByText('suggestion applied')).toBeInTheDocument();
    });

    it('should show original content when expanded', () => {
      render(
        <ResponseEditor
          response={responseWithHistory}
          onEdit={mockOnEdit}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          onFeedback={mockOnFeedback}
        />
      );

      const showOriginalButton = screen.getByText('Show original content');
      fireEvent.click(showOriginalButton);

      expect(screen.getByText(responseWithHistory.originalContent)).toBeInTheDocument();
    });
  });
});
