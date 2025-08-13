"use client"

import { useState } from 'react';
import { EditHistoryProps, EditHistoryEntry } from '../../types/editing';

export default function EditHistory({ 
  history, 
  onRevert, 
  showDiff = true 
}: EditHistoryProps) {
  const [selectedEntry, setSelectedEntry] = useState<EditHistoryEntry | null>(null);
  const [showFullHistory, setShowFullHistory] = useState(false);

  const displayHistory = showFullHistory ? history : history.slice(0, 5);

  const getTypeIcon = (type: EditHistoryEntry['type']) => {
    switch (type) {
      case 'manual_edit':
        return (
          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        );
      case 'suggestion_applied':
        return (
          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        );
      case 'ai_improvement':
        return (
          <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
      case 'rollback':
        return (
          <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const renderDiff = (previous: string, current: string) => {
    // Simple word-level diff implementation
    const previousWords = previous.split(/(\s+)/);
    const currentWords = current.split(/(\s+)/);
    
    const diff = [];
    let i = 0, j = 0;
    
    while (i < previousWords.length || j < currentWords.length) {
      if (i >= previousWords.length) {
        // Additions at the end
        diff.push({ type: 'added', text: currentWords[j] });
        j++;
      } else if (j >= currentWords.length) {
        // Deletions at the end
        diff.push({ type: 'removed', text: previousWords[i] });
        i++;
      } else if (previousWords[i] === currentWords[j]) {
        // No change
        diff.push({ type: 'unchanged', text: previousWords[i] });
        i++;
        j++;
      } else {
        // Find the next matching word
        let found = false;
        for (let k = j + 1; k < currentWords.length; k++) {
          if (previousWords[i] === currentWords[k]) {
            // Words were added
            for (let l = j; l < k; l++) {
              diff.push({ type: 'added', text: currentWords[l] });
            }
            diff.push({ type: 'unchanged', text: previousWords[i] });
            i++;
            j = k + 1;
            found = true;
            break;
          }
        }
        
        if (!found) {
          for (let k = i + 1; k < previousWords.length; k++) {
            if (previousWords[k] === currentWords[j]) {
              // Words were removed
              for (let l = i; l < k; l++) {
                diff.push({ type: 'removed', text: previousWords[l] });
              }
              diff.push({ type: 'unchanged', text: currentWords[j] });
              i = k + 1;
              j++;
              found = true;
              break;
            }
          }
        }
        
        if (!found) {
          // Replacement
          diff.push({ type: 'removed', text: previousWords[i] });
          diff.push({ type: 'added', text: currentWords[j] });
          i++;
          j++;
        }
      }
    }
    
    return diff;
  };

  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p>No edit history available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Edit History</h3>
        {history.length > 5 && (
          <button
            onClick={() => setShowFullHistory(!showFullHistory)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {showFullHistory ? 'Show Less' : `Show All ${history.length} Changes`}
          </button>
        )}
      </div>

      <div className="space-y-3">
        {displayHistory.map((entry, index) => (
          <div key={entry.id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                {getTypeIcon(entry.type)}
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900 capitalize">
                      {entry.type.replace('_', ' ')}
                    </span>
                    <span className="text-sm text-gray-500">
                      by {entry.editedBy}
                    </span>
                    <span className="text-sm text-gray-400">
                      {entry.editedAt.toLocaleString()}
                    </span>
                  </div>
                  
                  {entry.comment && (
                    <p className="text-sm text-gray-600 mt-1">{entry.comment}</p>
                  )}
                  
                  {entry.reason && (
                    <p className="text-sm text-blue-600 mt-1">
                      <span className="font-medium">Reason:</span> {entry.reason}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setSelectedEntry(selectedEntry?.id === entry.id ? null : entry)}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  {selectedEntry?.id === entry.id ? 'Hide' : 'View'} Changes
                </button>
                {onRevert && index < history.length - 1 && (
                  <button
                    onClick={() => onRevert(entry.id)}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Revert
                  </button>
                )}
              </div>
            </div>

            {selectedEntry?.id === entry.id && showDiff && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Changes</h4>
                <div className="bg-gray-50 rounded-md p-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="text-xs font-medium text-gray-700 mb-1">Previous</h5>
                      <div className="bg-red-50 border border-red-200 rounded p-2 text-sm">
                        <pre className="whitespace-pre-wrap text-red-700">
                          {entry.previousContent}
                        </pre>
                      </div>
                    </div>
                    <div>
                      <h5 className="text-xs font-medium text-gray-700 mb-1">Updated</h5>
                      <div className="bg-green-50 border border-green-200 rounded p-2 text-sm">
                        <pre className="whitespace-pre-wrap text-green-700">
                          {entry.newContent}
                        </pre>
                      </div>
                    </div>
                  </div>
                  
                  {/* Inline diff view */}
                  <div className="mt-4">
                    <h5 className="text-xs font-medium text-gray-700 mb-1">Diff View</h5>
                    <div className="bg-white border border-gray-200 rounded p-2 text-sm">
                      {renderDiff(entry.previousContent, entry.newContent).map((part, i) => (
                        <span
                          key={i}
                          className={
                            part.type === 'added'
                              ? 'bg-green-100 text-green-800'
                              : part.type === 'removed'
                              ? 'bg-red-100 text-red-800 line-through'
                              : ''
                          }
                        >
                          {part.text}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
