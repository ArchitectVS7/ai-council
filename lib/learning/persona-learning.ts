// Persona Learning System for Human-in-the-Loop Features
import { PersonaLearning, ResponseFeedback, EditHistoryEntry } from '../../types/editing';

export class PersonaLearningSystem {
  
  // Analyze persona performance and generate learning insights
  static analyzePersonaPerformance(
    personaId: string,
    responses: any[],
    editHistory: EditHistoryEntry[],
    feedback: ResponseFeedback[]
  ): PersonaLearning {
    const personaResponses = responses.filter(r => r.personaId === personaId);
    const personaEdits = editHistory.filter(h => 
      personaResponses.some(r => r.id === h.id || r.id === (h as any).responseId)
    );
    const personaFeedback = feedback.filter(f => 
      personaResponses.some(r => r.id === f.responseId)
    );

    // Calculate metrics
    const totalResponses = personaResponses.length;
    const editedResponses = personaEdits.filter(h => h.type === 'manual_edit').length;
    const averageRating = personaFeedback.length > 0 
      ? personaFeedback.reduce((sum, f) => sum + f.rating, 0) / personaFeedback.length
      : 0;

    // Analyze improvement areas
    const improvementAreas = this.analyzeImprovementAreas(personaFeedback, personaEdits);
    
    // Generate learning insights
    const learningInsights = this.generateLearningInsights(
      personaResponses,
      personaEdits,
      personaFeedback,
      improvementAreas
    );

    return {
      personaId,
      personaName: personaResponses[0]?.personaName || 'Unknown',
      totalResponses,
      editedResponses,
      averageRating,
      improvementAreas,
      learningInsights,
      lastUpdated: new Date(),
    };
  }

  // Analyze common improvement areas based on feedback and edits
  private static analyzeImprovementAreas(
    feedback: ResponseFeedback[],
    edits: EditHistoryEntry[]
  ): PersonaLearning['improvementAreas'] {
    const categories = ['accuracy', 'relevance', 'tone', 'completeness', 'clarity'];
    const areas: PersonaLearning['improvementAreas'] = [];

    categories.forEach(category => {
      const categoryFeedback = feedback.filter(f => f.category === category);
      const lowRatings = categoryFeedback.filter(f => f.rating <= 2);
      
      if (lowRatings.length > 0) {
        const frequency = lowRatings.length / categoryFeedback.length;
        const examples = lowRatings.slice(0, 3).map(f => f.comment || 'No specific comment');
        
        areas.push({
          category,
          frequency,
          examples: examples.filter(e => e !== 'No specific comment'),
        });
      }
    });

    // Analyze edit patterns
    const editReasons = edits
      .filter(e => e.reason)
      .map(e => e.reason!)
      .reduce((acc, reason) => {
        acc[reason] = (acc[reason] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    Object.entries(editReasons).forEach(([reason, count]) => {
      if (count >= 2) { // If a reason appears multiple times
        areas.push({
          category: 'editing_pattern',
          frequency: count / edits.length,
          examples: [reason],
        });
      }
    });

    return areas.sort((a, b) => b.frequency - a.frequency);
  }

  // Generate actionable learning insights
  private static generateLearningInsights(
    responses: any[],
    edits: EditHistoryEntry[],
    feedback: ResponseFeedback[],
    improvementAreas: PersonaLearning['improvementAreas']
  ): PersonaLearning['learningInsights'] {
    const insights: PersonaLearning['learningInsights'] = [];

    // Insight 1: Response Length Analysis
    const averageLength = responses.reduce((sum, r) => sum + r.content.length, 0) / responses.length;
    const editedLengths = edits
      .filter(e => e.type === 'manual_edit')
      .map(e => e.newContent.length - e.previousContent.length);
    
    if (editedLengths.length > 0) {
      const averageLengthChange = editedLengths.reduce((sum, l) => sum + l, 0) / editedLengths.length;
      
      if (Math.abs(averageLengthChange) > 50) {
        insights.push({
          pattern: 'response_length',
          description: averageLengthChange > 0 
            ? 'Responses tend to be too brief and require expansion'
            : 'Responses tend to be too verbose and require condensing',
          recommendation: averageLengthChange > 0
            ? 'Provide more detailed explanations and examples'
            : 'Focus on concise, direct responses',
          confidence: Math.min(0.9, Math.abs(averageLengthChange) / 200),
        });
      }
    }

    // Insight 2: Tone Consistency
    const toneFeedback = feedback.filter(f => f.category === 'tone');
    if (toneFeedback.length >= 3) {
      const lowToneRatings = toneFeedback.filter(f => f.rating <= 2).length;
      const toneIssueRate = lowToneRatings / toneFeedback.length;
      
      if (toneIssueRate > 0.3) {
        insights.push({
          pattern: 'tone_inconsistency',
          description: 'Tone is often inappropriate for the context',
          recommendation: 'Adapt communication style to match the situation and audience',
          confidence: toneIssueRate,
        });
      }
    }

    // Insight 3: Accuracy Patterns
    const accuracyFeedback = feedback.filter(f => f.category === 'accuracy');
    if (accuracyFeedback.length >= 3) {
      const lowAccuracyRatings = accuracyFeedback.filter(f => f.rating <= 2).length;
      const accuracyIssueRate = lowAccuracyRatings / accuracyFeedback.length;
      
      if (accuracyIssueRate > 0.2) {
        insights.push({
          pattern: 'accuracy_concerns',
          description: 'Responses sometimes contain inaccurate information',
          recommendation: 'Verify facts and cite sources when making claims',
          confidence: accuracyIssueRate,
        });
      }
    }

    // Insight 4: Edit Frequency Analysis
    const editRate = edits.length / responses.length;
    if (editRate > 0.5) {
      insights.push({
        pattern: 'high_edit_rate',
        description: 'More than half of responses require editing',
        recommendation: 'Review successful responses to identify patterns for improvement',
        confidence: Math.min(0.9, editRate),
      });
    }

    // Insight 5: Improvement Areas Priority
    if (improvementAreas.length > 0) {
      const topArea = improvementAreas[0];
      insights.push({
        pattern: 'primary_improvement_area',
        description: `Most frequent issue is related to ${topArea.category}`,
        recommendation: this.getRecommendationForCategory(topArea.category),
        confidence: topArea.frequency,
      });
    }

    return insights.sort((a, b) => b.confidence - a.confidence);
  }

  // Get specific recommendations for improvement categories
  private static getRecommendationForCategory(category: string): string {
    const recommendations = {
      accuracy: 'Double-check facts and provide sources for claims',
      relevance: 'Stay focused on the specific question or topic',
      tone: 'Match the communication style to the context and audience',
      completeness: 'Ensure all important aspects of the topic are covered',
      clarity: 'Use clear, simple language and logical structure',
      editing_pattern: 'Review common editing patterns to improve initial responses',
    };

    return recommendations[category as keyof typeof recommendations] || 'Focus on improving this area based on user feedback';
  }

  // Generate suggestions for persona improvement
  static generateImprovementSuggestions(learning: PersonaLearning): string[] {
    const suggestions: string[] = [];

    // Based on average rating
    if (learning.averageRating < 3) {
      suggestions.push('Overall performance needs significant improvement. Focus on the primary issues identified.');
    } else if (learning.averageRating < 4) {
      suggestions.push('Good performance with room for improvement. Address the most frequent feedback categories.');
    }

    // Based on edit rate
    const editRate = learning.editedResponses / learning.totalResponses;
    if (editRate > 0.4) {
      suggestions.push('High edit rate indicates responses often need modification. Review successful responses for patterns.');
    }

    // Based on top improvement areas
    learning.improvementAreas.slice(0, 2).forEach(area => {
      if (area.frequency > 0.3) {
        suggestions.push(`Focus on improving ${area.category} - this is a frequent issue area.`);
      }
    });

    // Based on learning insights
    learning.learningInsights.slice(0, 3).forEach(insight => {
      if (insight.confidence > 0.5) {
        suggestions.push(insight.recommendation);
      }
    });

    return suggestions.slice(0, 5); // Limit to top 5 suggestions
  }

  // Calculate persona improvement score
  static calculateImprovementScore(
    currentLearning: PersonaLearning,
    previousLearning?: PersonaLearning
  ): {
    score: number;
    trend: 'improving' | 'declining' | 'stable';
    details: string;
  } {
    if (!previousLearning) {
      return {
        score: currentLearning.averageRating / 5,
        trend: 'stable',
        details: 'No previous data for comparison'
      };
    }

    const ratingImprovement = currentLearning.averageRating - previousLearning.averageRating;
    const editRateCurrent = currentLearning.editedResponses / currentLearning.totalResponses;
    const editRatePrevious = previousLearning.editedResponses / previousLearning.totalResponses;
    const editRateImprovement = editRatePrevious - editRateCurrent; // Lower edit rate is better

    const overallImprovement = (ratingImprovement * 0.7) + (editRateImprovement * 0.3);
    
    let trend: 'improving' | 'declining' | 'stable';
    if (overallImprovement > 0.1) {
      trend = 'improving';
    } else if (overallImprovement < -0.1) {
      trend = 'declining';
    } else {
      trend = 'stable';
    }

    const score = Math.max(0, Math.min(1, currentLearning.averageRating / 5 + overallImprovement));

    return {
      score,
      trend,
      details: `Rating ${ratingImprovement > 0 ? 'improved' : 'declined'} by ${Math.abs(ratingImprovement).toFixed(2)}, edit rate ${editRateImprovement > 0 ? 'improved' : 'worsened'} by ${Math.abs(editRateImprovement * 100).toFixed(1)}%`
    };
  }
}
