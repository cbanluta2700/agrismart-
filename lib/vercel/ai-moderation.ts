import { wrapLanguageModel, LanguageModelV1Middleware } from '@ai-sdk/core';
import { z } from 'zod';
import { logger } from '@/lib/utils/logger';
import { trackModerationAction } from './moderation-analytics';
import { cleanCache } from './cache-control';

/**
 * AI content moderation configuration
 */
export interface AIModerationConfig {
  /**
   * Moderation sensitivity level (0-1)
   * - 0: Less sensitive (allows more content through)
   * - 1: Highly sensitive (stricter moderation)
   */
  sensitivityLevel?: number;
  
  /**
   * Categories to check for moderation
   */
  categories?: string[];
  
  /**
   * Whether to track moderation decisions in analytics
   */
  trackAnalytics?: boolean;
  
  /**
   * User ID for analytics tracking
   */
  userId?: string;
  
  /**
   * Content ID for analytics tracking
   */
  contentId?: string;
}

/**
 * Default moderation categories to check
 */
const DEFAULT_MODERATION_CATEGORIES = [
  'hate',
  'harassment',
  'sexual',
  'self-harm',
  'violence'
];

/**
 * Schema for moderation result
 */
const moderationResultSchema = z.object({
  isFlagged: z.boolean(),
  categories: z.record(z.boolean()).optional(),
  categoryScores: z.record(z.number()).optional(),
  flaggedCategories: z.array(z.string()).optional()
});

type ModerationResult = z.infer<typeof moderationResultSchema>;

/**
 * Creates an AI moderation middleware that can be used with any language model
 * to add content moderation capabilities
 */
export function createModerationMiddleware(config: AIModerationConfig = {}): LanguageModelV1Middleware {
  const sensitivityLevel = config.sensitivityLevel ?? 0.7;
  const categories = config.categories ?? DEFAULT_MODERATION_CATEGORIES;
  const trackingEnabled = config.trackAnalytics ?? true;
  
  return {
    /**
     * Middleware to check content before generation
     */
    transformParams: async ({ params }) => {
      // Extract text to check from the prompt parameter
      let textToCheck = '';
      
      if (typeof params.prompt === 'string') {
        textToCheck = params.prompt;
      } else if (Array.isArray(params.prompt)) {
        // Extract the last user message for moderation check
        const userMessages = params.prompt.filter(
          msg => typeof msg === 'string' || (typeof msg === 'object' && msg.role === 'user')
        );
        
        if (userMessages.length > 0) {
          const lastUserMessage = userMessages[userMessages.length - 1];
          if (typeof lastUserMessage === 'string') {
            textToCheck = lastUserMessage;
          } else if (typeof lastUserMessage === 'object' && lastUserMessage.content) {
            textToCheck = typeof lastUserMessage.content === 'string' 
              ? lastUserMessage.content
              : JSON.stringify(lastUserMessage.content);
          }
        }
      }
      
      if (!textToCheck.trim()) {
        // No text to check, proceed as normal
        return params;
      }
      
      try {
        // Check content using the moderation function
        const result = await moderateContent(textToCheck, sensitivityLevel, categories);
        
        if (result.isFlagged) {
          // Track the moderation action if tracking is enabled
          if (trackingEnabled && config.contentId) {
            await trackModerationAction({
              contentId: config.contentId,
              action: 'blocked',
              reason: result.flaggedCategories?.join(', ') || 'policy_violation',
              userId: config.userId,
              automated: true,
              source: 'ai-moderation'
            });
          }
          
          // Throw error to prevent the content from being processed
          throw new Error(
            `Content was flagged for moderation due to: ${result.flaggedCategories?.join(', ') || 'policy violation'}`
          );
        }
        
        // Content passed moderation, continue as normal
        return params;
      } catch (error) {
        if ((error as Error).message.includes('flagged for moderation')) {
          // Propagate moderation errors
          throw error;
        }
        
        // Log other errors but don't block the request
        logger.error('Error in AI moderation middleware', { error });
        
        // Continue with the original parameters
        return params;
      }
    },
    
    /**
     * Post-processing middleware to check generated content
     */
    wrapGenerate: async ({ doGenerate, params }) => {
      const result = await doGenerate();
      
      if (!result.text?.trim()) {
        return result;
      }
      
      try {
        // Check the generated content using the moderation function
        const moderationResult = await moderateContent(
          result.text, 
          sensitivityLevel, 
          categories
        );
        
        if (moderationResult.isFlagged) {
          // Track the moderation action if tracking is enabled
          if (trackingEnabled && config.contentId) {
            await trackModerationAction({
              contentId: config.contentId,
              action: 'blocked',
              reason: moderationResult.flaggedCategories?.join(', ') || 'policy_violation',
              userId: config.userId,
              automated: true,
              source: 'ai-moderation-output'
            });
          }
          
          // Return a sanitized response
          return {
            ...result,
            text: '[Content removed due to policy violation]'
          };
        }
        
        return result;
      } catch (error) {
        // Log errors but don't block the response
        logger.error('Error in AI moderation output check', { error });
        
        // Return the original result
        return result;
      }
    }
  };
}

/**
 * Helper function to check content for policy violations
 * This is a placeholder implementation that can be replaced with actual moderation API calls
 */
async function moderateContent(
  text: string, 
  sensitivityLevel: number = 0.7,
  categoriesToCheck: string[] = DEFAULT_MODERATION_CATEGORIES
): Promise<ModerationResult> {
  // Simulation mode for development (will be replaced with actual API calls)
  const SIMULATED_MODE = process.env.NODE_ENV === 'development' && !process.env.OPENAI_API_KEY;
  
  if (SIMULATED_MODE) {
    // Simulate moderation in development
    const containsObviousProfanity = /\b(fuck|shit|ass|damn|bitch)\b/i.test(text);
    
    if (containsObviousProfanity) {
      return {
        isFlagged: true,
        categories: { hate: false, harassment: true, sexual: false, 'self-harm': false, violence: false },
        categoryScores: { hate: 0.1, harassment: 0.8, sexual: 0.1, 'self-harm': 0, violence: 0.1 },
        flaggedCategories: ['harassment']
      };
    }
    
    return {
      isFlagged: false,
      categories: { hate: false, harassment: false, sexual: false, 'self-harm': false, violence: false },
      categoryScores: { hate: 0.1, harassment: 0.1, sexual: 0.1, 'self-harm': 0, violence: 0.1 }
    };
  }
  
  // If OpenAI API key is available, use the OpenAI moderation API
  if (process.env.OPENAI_API_KEY) {
    try {
      // This would be implemented using OpenAI's moderation API
      // For now, we'll mock the implementation
      const containsObviousProfanity = /\b(fuck|shit|ass|damn|bitch)\b/i.test(text);
      
      if (containsObviousProfanity) {
        return {
          isFlagged: true,
          categories: { hate: false, harassment: true, sexual: false, 'self-harm': false, violence: false },
          categoryScores: { hate: 0.1, harassment: 0.8, sexual: 0.1, 'self-harm': 0, violence: 0.1 },
          flaggedCategories: ['harassment']
        };
      }
      
      return {
        isFlagged: false,
        categories: { hate: false, harassment: false, sexual: false, 'self-harm': false, violence: false },
        categoryScores: { hate: 0.1, harassment: 0.1, sexual: 0.1, 'self-harm': 0, violence: 0.1 }
      };
    } catch (error) {
      logger.error('Error calling OpenAI moderation API', { error });
      
      // In case of error, be conservative and don't flag the content
      return {
        isFlagged: false,
        categories: {},
        categoryScores: {}
      };
    }
  }
  
  // Implement a basic keyword-based check as fallback
  const sensitiveKeywords: Record<string, RegExp> = {
    hate: /\b(hate|racist|bigot)\b/i,
    harassment: /\b(harass|bully|threaten)\b/i,
    sexual: /\b(sex|porn|nude|explicit)\b/i,
    'self-harm': /\b(suicide|kill myself|self harm|cut myself)\b/i,
    violence: /\b(kill|murder|attack|bomb|shoot)\b/i
  };
  
  const results: Record<string, boolean> = {};
  const scores: Record<string, number> = {};
  const flaggedCategories: string[] = [];
  
  for (const category of categoriesToCheck) {
    if (sensitiveKeywords[category] && sensitiveKeywords[category].test(text)) {
      results[category] = true;
      scores[category] = 0.8; // Simulate a high confidence score
      flaggedCategories.push(category);
    } else {
      results[category] = false;
      scores[category] = 0.1; // Simulate a low confidence score
    }
  }
  
  return {
    isFlagged: flaggedCategories.length > 0,
    categories: results,
    categoryScores: scores,
    flaggedCategories
  };
}

/**
 * Apply AI moderation to any language model
 */
export function applyAIModeration(model: any, config: AIModerationConfig = {}) {
  const middleware = createModerationMiddleware(config);
  return wrapLanguageModel(model, middleware);
}

/**
 * Add a comment to the moderation queue manually
 */
export async function queueCommentForModeration(params: {
  contentId: string;
  content: string;
  userId?: string;
  reason?: string;
}) {
  const { contentId, content, userId, reason } = params;
  
  try {
    // Moderate the content
    const result = await moderateContent(content);
    
    if (result.isFlagged) {
      // Automatically flag the content
      await trackModerationAction({
        contentId,
        action: 'flagged',
        reason: result.flaggedCategories?.join(', ') || reason || 'policy_violation',
        userId,
        automated: true,
        source: 'ai-moderation'
      });
      
      // Invalidate any related caches
      await cleanCache(`content:${contentId}`);
      
      return {
        moderated: true,
        flagged: true,
        categories: result.flaggedCategories
      };
    }
    
    // Content passed automatic checks, but still add to moderation queue for manual review
    await trackModerationAction({
      contentId,
      action: 'queued',
      reason: reason || 'routine_check',
      userId,
      automated: false,
      source: 'system'
    });
    
    return {
      moderated: true,
      flagged: false
    };
  } catch (error) {
    logger.error('Error queuing comment for moderation', { error, contentId });
    
    // Handle errors gracefully
    return {
      moderated: false,
      error: 'Failed to process moderation request'
    };
  }
}
