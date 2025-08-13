"use client"

import { useState, useRef, useEffect } from 'react';
import { ResponseEditorProps, EditSuggestion } from '../../types/editing';

export default function ResponseEditor({
  response,
  onEdit,
  onApprove,
  onReject,
  onFeedback,
  suggestions = [],
  mode = 'view',
  showHistory = false,
}: ResponseEditorProps) {
  const [isEditing, setIsEditing] = useState(mode === 'edit');
  const [editContent, setEditContent] = useState(response.currentContent);
  const [editReason, setEditReason] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<EditSuggestion | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      // Auto-resize textarea
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    setIsEditing(true);
    setEditContent(response.currentContent);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(response.currentContent);
    setEditReason('');
  };

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent !== response.currentContent) {
      onEdit(editContent.trim(), editReason.trim() || undefined);
      setIsEditing(false);
      setEditReason('');
    }
  };

  const handleApplySuggestion = (suggestion: EditSuggestion) => {
    setEditContent(suggestion.suggestion);
    setSelectedSuggestion(suggestion);
  };

  const getStatusBadge = () => {
    const statusColors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      needs_review: 'bg-blue-100 text-blue-800',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[response.status]}`}>
        {response.status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
            {response.personaName.charAt(0)}
          </div>
          <div>
            <h3 className="font-medium text-gray-900">{response.personaName}</h3>
            <p className="text-sm text-gray-500">
              {response.isEdited ? 'Edited' : 'Original'} • {response.updatedAt.toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {getStatusBadge()}
          {suggestions.length > 0 && (
            <button
              onClick={() => setShowSuggestions(!showSuggestions)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {suggestions.length} suggestion{suggestions.length > 1 ? 's' : ''}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="mb-4">
        {isEditing ? (
          <div className="space-y-3">
            <textarea
              ref={textareaRef}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={6}
              placeholder="Edit the response..."
            />
            <input
              type="text"
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
              placeholder="Reason for edit (optional)"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        ) : (
          <div className="prose max-w-none">
            <div className="p-3 bg-gray-50 rounded-md whitespace-pre-wrap">
              {response.currentContent}
            </div>
            {response.isEdited && response.originalContent !== response.currentContent && (
              <details className="mt-2">
                <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800">
                  Show original content
                </summary>
                <div className="mt-2 p-3 bg-red-50 rounded-md whitespace-pre-wrap text-sm">
                  {response.originalContent}
                </div>
              </details>
            )}
          </div>
        )}
      </div>

      {/* Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 rounded-md">
          <h4 className="font-medium text-blue-900 mb-2">AI Suggestions</h4>
          <div className="space-y-2">
            {suggestions.map((suggestion) => (
              <div key={suggestion.id} className="p-2 bg-white rounded border">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 capitalize">
                      {suggestion.type} ({Math.round(suggestion.confidence * 100)}% confidence)
                    </p>
                    <p className="text-sm text-gray-600 mt-1">{suggestion.reasoning}</p>
                    <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                      {suggestion.suggestion}
                    </div>
                  </div>
                  {isEditing && (
                    <button
                      onClick={() => handleApplySuggestion(suggestion)}
                      className="ml-2 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                    >
                      Apply
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {mode === 'review' && !isEditing && (
            <>
              <button
                onClick={onApprove}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center space-x-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Approve</span>
              </button>
              <button
                onClick={() => onReject('Needs improvement')}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center space-x-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>Reject</span>
              </button>
            </>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {isEditing ? (
            <>
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={!editContent.trim() || editContent === response.currentContent}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Changes
              </button>
            </>
          ) : (
            <>
              {mode !== 'view' && (
                <button
                  onClick={handleStartEdit}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 flex items-center space-x-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>Edit</span>
                </button>
              )}
              <button
                onClick={() => onFeedback({ userId: 'current-user', rating: 4, category: 'accuracy' })}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 flex items-center space-x-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10m0 0V6a2 2 0 00-2-2H9a2 2 0 00-2 2v2m10 0v10a2 2 0 01-2 2H9a2 2 0 01-2-2V8m0 0V6a2 2 0 012-2h10a2 2 0 012 2v2" />
                </svg>
                <span>Feedback</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Edit History Preview */}
      {response.editHistory.length > 0 && showHistory && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="font-medium text-gray-900 mb-2">Recent Changes</h4>
          <div className="space-y-2">
            {response.editHistory.slice(0, 3).map((entry) => (
              <div key={entry.id} className="text-sm text-gray-600">
                <span className="font-medium">{entry.type.replace('_', ' ')}</span>
                {' '}by {entry.editedBy} on {entry.editedAt.toLocaleDateString()}
                {entry.comment && <span className="text-gray-500"> - {entry.comment}</span>}
              </div>
            ))}
            {response.editHistory.length > 3 && (
              <button className="text-sm text-blue-600 hover:text-blue-800">
                View all {response.editHistory.length} changes
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
