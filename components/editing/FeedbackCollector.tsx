"use client"

import { useState } from 'react';
import { FeedbackCollectorProps, ResponseFeedback } from '../../types/editing';

export default function FeedbackCollector({
  responseId,
  onSubmit,
  initialFeedback
}: FeedbackCollectorProps) {
  const [rating, setRating] = useState(initialFeedback?.rating || 0);
  const [category, setCategory] = useState(initialFeedback?.category || '');
  const [comment, setComment] = useState(initialFeedback?.comment || '');
  const [suggestions, setSuggestions] = useState<string[]>(initialFeedback?.suggestions || ['']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = [
    { value: 'accuracy', label: 'Accuracy', description: 'How factually correct is the response?' },
    { value: 'relevance', label: 'Relevance', description: 'How well does it address the topic?' },
    { value: 'tone', label: 'Tone', description: 'Is the tone appropriate for the context?' },
    { value: 'completeness', label: 'Completeness', description: 'Does it cover all necessary points?' },
    { value: 'clarity', label: 'Clarity', description: 'How clear and understandable is it?' },
  ];

  const handleAddSuggestion = () => {
    setSuggestions([...suggestions, '']);
  };

  const handleRemoveSuggestion = (index: number) => {
    setSuggestions(suggestions.filter((_, i) => i !== index));
  };

  const handleSuggestionChange = (index: number, value: string) => {
    const newSuggestions = [...suggestions];
    newSuggestions[index] = value;
    setSuggestions(newSuggestions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!rating || !category) return;

    setIsSubmitting(true);
    
    try {
      await onSubmit({
        userId: 'current-user', // This would be dynamically set
        rating: rating as 1 | 2 | 3 | 4 | 5,
        category: category as any,
        comment: comment.trim() || undefined,
        suggestions: suggestions.filter(s => s.trim()).length > 0 
          ? suggestions.filter(s => s.trim()) 
          : undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = () => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
              star <= rating
                ? 'text-yellow-400 hover:text-yellow-500'
                : 'text-gray-300 hover:text-gray-400'
            }`}
          >
            <svg
              className="w-6 h-6"
              fill={star <= rating ? 'currentColor' : 'none'}
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
          </button>
        ))}
        <span className="ml-2 text-sm text-gray-600">
          {rating > 0 ? `${rating}/5` : 'No rating'}
        </span>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Provide Feedback</h3>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Rating */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Overall Rating
          </label>
          {renderStars()}
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Feedback Category
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {categories.map((cat) => (
              <label
                key={cat.value}
                className={`relative flex cursor-pointer rounded-lg border p-4 focus:outline-none ${
                  category === cat.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 bg-white hover:border-gray-400'
                }`}
              >
                <input
                  type="radio"
                  name="category"
                  value={cat.value}
                  checked={category === cat.value}
                  onChange={(e) => setCategory(e.target.value)}
                  className="sr-only"
                />
                <div className="flex flex-1">
                  <div className="flex flex-col">
                    <span className="block text-sm font-medium text-gray-900">
                      {cat.label}
                    </span>
                    <span className="block text-sm text-gray-500">
                      {cat.description}
                    </span>
                  </div>
                </div>
                {category === cat.value && (
                  <div className="shrink-0">
                    <svg className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                )}
              </label>
            ))}
          </div>
        </div>

        {/* Comment */}
        <div>
          <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
            Additional Comments
          </label>
          <textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Share your thoughts on how this response could be improved..."
          />
        </div>

        {/* Suggestions */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Specific Suggestions (Optional)
            </label>
            <button
              type="button"
              onClick={handleAddSuggestion}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              + Add Suggestion
            </button>
          </div>
          
          <div className="space-y-2">
            {suggestions.map((suggestion, index) => (
              <div key={index} className="flex items-center space-x-2">
                <input
                  type="text"
                  value={suggestion}
                  onChange={(e) => handleSuggestionChange(index, e.target.value)}
                  placeholder="Suggest a specific improvement..."
                  className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {suggestions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveSuggestion(index)}
                    className="p-2 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end space-x-3">
          <span className="text-sm text-gray-500">
            Your feedback helps improve AI responses
          </span>
          <button
            type="submit"
            disabled={!rating || !category || isSubmitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isSubmitting && (
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            <span>{isSubmitting ? 'Submitting...' : 'Submit Feedback'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
