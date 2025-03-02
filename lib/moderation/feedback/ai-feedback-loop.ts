import { PrismaClient, AISystemComponent, FeedbackResult } from '@prisma/client';
import { kv } from '@vercel/kv';
import { fluidCompute } from '@/lib/vercel/fluid-compute';
import { useAnalytics } from '@vercel/analytics/react';

const prisma = new PrismaClient();

/**
 * Interface for feedback submission
 */
export interface AIFeedbackSubmission {
  userId: string;
  systemComponent: AISystemComponent;
  originalQuery: string;
  originalResponse: string;
  userFeedback?: string;
  feedbackResult: FeedbackResult;
  metadata?: Record<string, any>;
}

/**
 * Interface for moderator resolution
 */
export interface AIFeedbackResolution {
  feedbackId: string;
  moderatorId: string;
  resolution: string;
  actionTaken: boolean;
  trainingDataAdded: boolean;
}

/**
 * Submit feedback about an AI interaction
 * This is used to collect data for improving the AI system
 */
export const submitAIFeedback = fluidCompute(
  async (feedback: AIFeedbackSubmission) => {
    try {
      // Create feedback record in database
      const feedbackRecord = await prisma.aIFeedbackLoop.create({
        data: {
          userId: feedback.userId,
          systemComponent: feedback.systemComponent,
          originalQuery: feedback.originalQuery,
          originalResponse: feedback.originalResponse,
          userFeedback: feedback.userFeedback,
          feedbackResult: feedback.feedbackResult,
          metadata: feedback.metadata || {},
        },
      });

      // Cache the feedback for quick analysis
      const cacheKey = `ai-feedback:latest:${feedback.systemComponent}`;
      const cachedFeedbacks = await kv.lrange(cacheKey, 0, 99);
      
      // Add to the list of recent feedback
      await kv.lpush(cacheKey, JSON.stringify({
        id: feedbackRecord.id,
        component: feedback.systemComponent,
        result: feedback.feedbackResult,
        timestamp: new Date().toISOString(),
      }));
      
      // Trim the list to keep only the most recent 100 feedbacks
      await kv.ltrim(cacheKey, 0, 99);
      
      // Update component accuracy metrics
      await updateComponentAccuracyMetrics(feedback.systemComponent);
      
      return feedbackRecord;
    } catch (error) {
      console.error('Error submitting AI feedback:', error);
      throw new Error('Failed to submit AI feedback');
    }
  },
  { cacheKey: (feedback) => `ai-feedback:${feedback.userId}:${Date.now()}` }
);

/**
 * Resolve feedback with moderator action
 * This is used to track the resolution of feedback and its impact on the system
 */
export const resolveAIFeedback = fluidCompute(
  async (resolution: AIFeedbackResolution) => {
    try {
      // Update the feedback record with resolution details
      const updatedFeedback = await prisma.aIFeedbackLoop.update({
        where: { id: resolution.feedbackId },
        data: {
          moderatorId: resolution.moderatorId,
          resolution: resolution.resolution,
          actionTaken: resolution.actionTaken,
          trainingDataAdded: resolution.trainingDataAdded,
        },
      });
      
      // If the feedback led to training data being added, invalidate the component accuracy cache
      if (resolution.trainingDataAdded) {
        await kv.del(`ai-component-accuracy:${updatedFeedback.systemComponent}`);
      }
      
      return updatedFeedback;
    } catch (error) {
      console.error('Error resolving AI feedback:', error);
      throw new Error('Failed to resolve AI feedback');
    }
  },
  { cacheKey: (resolution) => `ai-feedback-resolution:${resolution.feedbackId}` }
);

/**
 * Get feedback history for a specific system component
 */
export const getSystemComponentFeedback = fluidCompute(
  async (component: AISystemComponent, limit = 100, offset = 0) => {
    try {
      const feedback = await prisma.aIFeedbackLoop.findMany({
        where: { systemComponent: component },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
          moderator: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      });
      
      const totalCount = await prisma.aIFeedbackLoop.count({
        where: { systemComponent: component },
      });
      
      return { feedback, totalCount };
    } catch (error) {
      console.error(`Error getting feedback for component ${component}:`, error);
      throw new Error(`Failed to get feedback for component ${component}`);
    }
  },
  { 
    cacheKey: (component, limit, offset) => 
      `ai-component-feedback:${component}:${limit}:${offset}`,
    cacheTtl: 300 // 5 minutes
  }
);

/**
 * Get accuracy metrics for a specific system component
 */
export const getComponentAccuracyMetrics = fluidCompute(
  async (component: AISystemComponent) => {
    const cacheKey = `ai-component-accuracy:${component}`;
    
    // Try to get from cache first
    const cachedMetrics = await kv.get(cacheKey);
    if (cachedMetrics) {
      return JSON.parse(cachedMetrics as string);
    }
    
    // Calculate metrics from database
    try {
      const totalFeedback = await prisma.aIFeedbackLoop.count({
        where: { systemComponent: component },
      });
      
      const accurateFeedback = await prisma.aIFeedbackLoop.count({
        where: { 
          systemComponent: component,
          feedbackResult: 'ACCURATE',
        },
      });
      
      const partiallyAccurateFeedback = await prisma.aIFeedbackLoop.count({
        where: { 
          systemComponent: component,
          feedbackResult: 'PARTIALLY_ACCURATE',
        },
      });
      
      const inaccurateFeedback = await prisma.aIFeedbackLoop.count({
        where: { 
          systemComponent: component,
          feedbackResult: 'INACCURATE',
        },
      });
      
      // Calculate percentages
      const metrics = {
        totalFeedback,
        accurateFeedback,
        partiallyAccurateFeedback,
        inaccurateFeedback,
        accuracyRate: totalFeedback > 0 ? (accurateFeedback / totalFeedback) * 100 : 0,
        partialAccuracyRate: totalFeedback > 0 ? (partiallyAccurateFeedback / totalFeedback) * 100 : 0,
        inaccuracyRate: totalFeedback > 0 ? (inaccurateFeedback / totalFeedback) * 100 : 0,
        lastUpdated: new Date().toISOString(),
      };
      
      // Cache the results
      await kv.set(cacheKey, JSON.stringify(metrics));
      await kv.expire(cacheKey, 86400); // 24 hours
      
      return metrics;
    } catch (error) {
      console.error(`Error getting accuracy metrics for component ${component}:`, error);
      throw new Error(`Failed to get accuracy metrics for component ${component}`);
    }
  }
);

/**
 * Update the accuracy metrics for a system component
 * This is called after new feedback is submitted
 */
async function updateComponentAccuracyMetrics(component: AISystemComponent) {
  // Invalidate the cache
  await kv.del(`ai-component-accuracy:${component}`);
  
  // Recalculate metrics
  await getComponentAccuracyMetrics(component);
}

/**
 * Get trending issues based on recent feedback
 * This helps identify patterns in user feedback
 */
export const getTrendingIssues = fluidCompute(
  async (days = 7) => {
    const cacheKey = `ai-feedback:trending-issues:${days}`;
    
    // Try to get from cache first
    const cachedIssues = await kv.get(cacheKey);
    if (cachedIssues) {
      return JSON.parse(cachedIssues as string);
    }
    
    try {
      // Get feedback from the last X days
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const recentFeedback = await prisma.aIFeedbackLoop.findMany({
        where: { 
          createdAt: { gte: startDate },
          feedbackResult: { in: ['INACCURATE', 'PARTIALLY_ACCURATE'] }
        },
        select: {
          id: true,
          systemComponent: true,
          feedbackResult: true,
          userFeedback: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      
      // Group by system component
      const componentIssues: Record<string, any> = {};
      
      for (const component of Object.values(AISystemComponent)) {
        const componentFeedback = recentFeedback.filter(
          feedback => feedback.systemComponent === component
        );
        
        componentIssues[component] = {
          component,
          count: componentFeedback.length,
          inaccurateCount: componentFeedback.filter(f => f.feedbackResult === 'INACCURATE').length,
          partiallyAccurateCount: componentFeedback.filter(f => f.feedbackResult === 'PARTIALLY_ACCURATE').length,
          recentFeedback: componentFeedback.slice(0, 5), // Include 5 most recent feedback items
        };
      }
      
      // Sort components by issue count
      const trendingIssues = Object.values(componentIssues)
        .filter(issue => issue.count > 0)
        .sort((a, b) => b.count - a.count);
      
      // Cache the results
      await kv.set(cacheKey, JSON.stringify(trendingIssues));
      await kv.expire(cacheKey, 3600); // 1 hour
      
      return trendingIssues;
    } catch (error) {
      console.error('Error getting trending issues:', error);
      throw new Error('Failed to get trending issues');
    }
  }
);

/**
 * Generate recommendations for improving AI components based on feedback
 */
export const generateImprovementRecommendations = fluidCompute(
  async (component: AISystemComponent) => {
    try {
      // Get recent feedback for this component
      const { feedback } = await getSystemComponentFeedback(component, 30, 0);
      
      // Get accuracy metrics
      const metrics = await getComponentAccuracyMetrics(component);
      
      // Generate recommendations based on feedback patterns
      const recommendations = {
        component,
        accuracyMetrics: metrics,
        recommendedActions: [] as string[],
        highPriorityIssues: [] as string[],
        feedbackSamples: feedback.slice(0, 5),
      };
      
      // Add recommendations based on accuracy rates
      if (metrics.inaccuracyRate > 20) {
        recommendations.recommendedActions.push(
          'High inaccuracy rate detected. Consider retraining the model for this component.'
        );
        recommendations.highPriorityIssues.push(
          'Critical accuracy issues requiring immediate attention'
        );
      } else if (metrics.inaccuracyRate > 10) {
        recommendations.recommendedActions.push(
          'Moderate inaccuracy rate. Review recent feedback to identify patterns.'
        );
      }
      
      if (metrics.partialAccuracyRate > 30) {
        recommendations.recommendedActions.push(
          'High partially accurate rate. Consider enhancing the component to provide more complete responses.'
        );
      }
      
      // Look for common patterns in user feedback
      const userFeedbackTexts = feedback
        .filter(f => f.userFeedback)
        .map(f => f.userFeedback);
      
      if (userFeedbackTexts.length > 0) {
        // This is a simplified pattern detection - in a real system, you'd use NLP
        const commonPhrases = findCommonPhrases(userFeedbackTexts as string[]);
        if (commonPhrases.length > 0) {
          recommendations.recommendedActions.push(
            `Common feedback themes: ${commonPhrases.join(', ')}`
          );
        }
      }
      
      return recommendations;
    } catch (error) {
      console.error(`Error generating recommendations for component ${component}:`, error);
      throw new Error(`Failed to generate recommendations for component ${component}`);
    }
  },
  {
    cacheKey: (component) => `ai-improvement-recommendations:${component}`,
    cacheTtl: 3600 // 1 hour
  }
);

/**
 * Simple utility to find common phrases in feedback
 * In a production system, this would use more sophisticated NLP
 */
function findCommonPhrases(texts: string[]) {
  // Simple implementation - look for repeated whole words
  const wordCounts: Record<string, number> = {};
  
  texts.forEach(text => {
    if (!text) return;
    
    const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 3);
    words.forEach(word => {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    });
  });
  
  // Find words that appear in multiple feedback items
  return Object.entries(wordCounts)
    .filter(([_, count]) => count > 1)
    .sort(([_, countA], [__, countB]) => countB - countA)
    .slice(0, 5)
    .map(([word]) => word);
}
