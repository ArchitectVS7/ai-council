import { PersonaLearningSystem } from '../../lib/learning/persona-learning';
import { ResponseFeedback, EditHistoryEntry, PersonaLearning } from '../../types/editing';

describe('PersonaLearningSystem', () => {
  const mockResponses = [
    {
      id: '1',
      personaId: 'persona-1',
      personaName: 'Creative Director',
      content: 'This is a creative response with good insights.',
    },
    {
      id: '2',
      personaId: 'persona-1',
      personaName: 'Creative Director',
      content: 'Another response that needed editing.',
    },
    {
      id: '3',
      personaId: 'persona-1',
      personaName: 'Creative Director',
      content: 'A well-received response.',
    },
  ];

  const mockEditHistory: EditHistoryEntry[] = [
    {
      id: 'edit-1',
      responseId: '2',
      editedBy: 'user-1',
      editedAt: new Date('2025-01-13T10:00:00Z'),
      previousContent: 'Original content',
      newContent: 'Improved content',
      reason: 'Clarity improvement',
      type: 'manual_edit',
    },
    {
      id: 'edit-2',
      responseId: '2',
      editedBy: 'user-2',
      editedAt: new Date('2025-01-13T11:00:00Z'),
      previousContent: 'Improved content',
      newContent: 'Final content',
      reason: 'Tone adjustment',
      type: 'manual_edit',
    },
  ];

  const mockFeedback: ResponseFeedback[] = [
    {
      id: 'feedback-1',
      responseId: '1',
      userId: 'user-1',
      rating: 4,
      category: 'accuracy',
      comment: 'Good accuracy but could be more specific',
      createdAt: new Date('2025-01-13T09:00:00Z'),
    },
    {
      id: 'feedback-2',
      responseId: '2',
      userId: 'user-2',
      rating: 2,
      category: 'tone',
      comment: 'Tone was inappropriate',
      suggestions: ['Make it more professional', 'Use formal language'],
      createdAt: new Date('2025-01-13T10:30:00Z'),
    },
    {
      id: 'feedback-3',
      responseId: '3',
      userId: 'user-1',
      rating: 5,
      category: 'clarity',
      comment: 'Excellent clarity and structure',
      createdAt: new Date('2025-01-13T12:00:00Z'),
    },
    {
      id: 'feedback-4',
      responseId: '1',
      userId: 'user-3',
      rating: 3,
      category: 'completeness',
      comment: 'Missing some important details',
      createdAt: new Date('2025-01-13T13:00:00Z'),
    },
  ];

  describe('analyzePersonaPerformance', () => {
    it('should calculate basic metrics correctly', () => {
      const learning = PersonaLearningSystem.analyzePersonaPerformance(
        'persona-1',
        mockResponses,
        mockEditHistory,
        mockFeedback
      );

      expect(learning.personaId).toBe('persona-1');
      expect(learning.personaName).toBe('Creative Director');
      expect(learning.totalResponses).toBe(3);
      expect(learning.editedResponses).toBe(2); // Two manual edits on response 2
      expect(learning.averageRating).toBe(3.5); // (4 + 2 + 5 + 3) / 4
    });

    it('should identify improvement areas', () => {
      const learning = PersonaLearningSystem.analyzePersonaPerformance(
        'persona-1',
        mockResponses,
        mockEditHistory,
        mockFeedback
      );

      expect(learning.improvementAreas).toHaveLength(2); // tone and editing_pattern
      
      const toneArea = learning.improvementAreas.find(area => area.category === 'tone');
      expect(toneArea).toBeDefined();
      expect(toneArea?.frequency).toBe(1); // 1 low rating out of 1 tone feedback
      
      const editingArea = learning.improvementAreas.find(area => area.category === 'editing_pattern');
      expect(editingArea).toBeDefined();
    });

    it('should generate learning insights', () => {
      const learning = PersonaLearningSystem.analyzePersonaPerformance(
        'persona-1',
        mockResponses,
        mockEditHistory,
        mockFeedback
      );

      expect(learning.learningInsights.length).toBeGreaterThan(0);
      
      // Should include high edit rate insight
      const editRateInsight = learning.learningInsights.find(
        insight => insight.pattern === 'high_edit_rate'
      );
      expect(editRateInsight).toBeDefined();
      expect(editRateInsight?.confidence).toBeGreaterThan(0.5);
    });

    it('should handle empty data gracefully', () => {
      const learning = PersonaLearningSystem.analyzePersonaPerformance(
        'persona-empty',
        [],
        [],
        []
      );

      expect(learning.totalResponses).toBe(0);
      expect(learning.editedResponses).toBe(0);
      expect(learning.averageRating).toBe(0);
      expect(learning.improvementAreas).toHaveLength(0);
    });
  });

  describe('generateImprovementSuggestions', () => {
    it('should generate appropriate suggestions based on performance', () => {
      const learning: PersonaLearning = {
        personaId: 'persona-1',
        personaName: 'Creative Director',
        totalResponses: 10,
        editedResponses: 6,
        averageRating: 2.5,
        improvementAreas: [
          {
            category: 'tone',
            frequency: 0.6,
            examples: ['Too casual', 'Inappropriate formality'],
          },
          {
            category: 'accuracy',
            frequency: 0.4,
            examples: ['Fact check needed'],
          },
        ],
        learningInsights: [
          {
            pattern: 'tone_inconsistency',
            description: 'Tone issues',
            recommendation: 'Adapt communication style',
            confidence: 0.8,
          },
        ],
        lastUpdated: new Date(),
      };

      const suggestions = PersonaLearningSystem.generateImprovementSuggestions(learning);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions).toContain('Overall performance needs significant improvement. Focus on the primary issues identified.');
      expect(suggestions).toContain('Focus on improving tone - this is a frequent issue area.');
      expect(suggestions).toContain('Adapt communication style');
    });

    it('should limit suggestions to maximum of 5', () => {
      const learning: PersonaLearning = {
        personaId: 'persona-1',
        personaName: 'Test Persona',
        totalResponses: 10,
        editedResponses: 8,
        averageRating: 1,
        improvementAreas: [
          { category: 'tone', frequency: 0.8, examples: [] },
          { category: 'accuracy', frequency: 0.7, examples: [] },
          { category: 'clarity', frequency: 0.6, examples: [] },
          { category: 'completeness', frequency: 0.5, examples: [] },
          { category: 'relevance', frequency: 0.4, examples: [] },
        ],
        learningInsights: [
          { pattern: 'test1', description: '', recommendation: 'Rec 1', confidence: 0.9 },
          { pattern: 'test2', description: '', recommendation: 'Rec 2', confidence: 0.8 },
          { pattern: 'test3', description: '', recommendation: 'Rec 3', confidence: 0.7 },
        ],
        lastUpdated: new Date(),
      };

      const suggestions = PersonaLearningSystem.generateImprovementSuggestions(learning);

      expect(suggestions.length).toBeLessThanOrEqual(5);
    });
  });

  describe('calculateImprovementScore', () => {
    const currentLearning: PersonaLearning = {
      personaId: 'persona-1',
      personaName: 'Test Persona',
      totalResponses: 20,
      editedResponses: 8,
      averageRating: 4.0,
      improvementAreas: [],
      learningInsights: [],
      lastUpdated: new Date(),
    };

    it('should return stable trend when no previous data', () => {
      const result = PersonaLearningSystem.calculateImprovementScore(currentLearning);

      expect(result.trend).toBe('stable');
      expect(result.score).toBe(0.8); // 4.0 / 5
      expect(result.details).toContain('No previous data');
    });

    it('should detect improving trend', () => {
      const previousLearning: PersonaLearning = {
        ...currentLearning,
        totalResponses: 10,
        editedResponses: 6,
        averageRating: 3.0,
      };

      const result = PersonaLearningSystem.calculateImprovementScore(
        currentLearning,
        previousLearning
      );

      expect(result.trend).toBe('improving');
      expect(result.score).toBeGreaterThan(0.8);
    });

    it('should detect declining trend', () => {
      const previousLearning: PersonaLearning = {
        ...currentLearning,
        totalResponses: 10,
        editedResponses: 2,
        averageRating: 4.5,
      };

      const result = PersonaLearningSystem.calculateImprovementScore(
        currentLearning,
        previousLearning
      );

      expect(result.trend).toBe('declining');
      expect(result.details).toContain('declined');
    });

    it('should consider both rating and edit rate improvements', () => {
      const previousLearning: PersonaLearning = {
        ...currentLearning,
        totalResponses: 10,
        editedResponses: 8, // Higher edit rate (worse)
        averageRating: 3.5, // Lower rating (worse)
      };

      const result = PersonaLearningSystem.calculateImprovementScore(
        currentLearning,
        previousLearning
      );

      // Both metrics improved, so should be improving
      expect(result.trend).toBe('improving');
      expect(result.details).toContain('improved');
      expect(result.details).toContain('improved');
    });
  });

  describe('Edge Cases', () => {
    it('should handle persona with no feedback', () => {
      const learning = PersonaLearningSystem.analyzePersonaPerformance(
        'persona-no-feedback',
        mockResponses,
        [],
        []
      );

      expect(learning.averageRating).toBe(0);
      expect(learning.improvementAreas).toHaveLength(0);
    });

    it('should handle persona with only positive feedback', () => {
      const positiveFeedback: ResponseFeedback[] = [
        {
          id: 'feedback-1',
          responseId: '1',
          userId: 'user-1',
          rating: 5,
          category: 'accuracy',
          createdAt: new Date(),
        },
        {
          id: 'feedback-2',
          responseId: '2',
          userId: 'user-2',
          rating: 4,
          category: 'clarity',
          createdAt: new Date(),
        },
      ];

      const learning = PersonaLearningSystem.analyzePersonaPerformance(
        'persona-positive',
        mockResponses,
        [],
        positiveFeedback
      );

      expect(learning.averageRating).toBe(4.5);
      expect(learning.improvementAreas).toHaveLength(0);
    });
  });
});
