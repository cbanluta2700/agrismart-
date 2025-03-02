/**
 * AI-powered content moderation using OpenAI's moderation API
 * Supports automatic moderation of text content
 */
import { Redis } from '@upstash/redis';
import { OpenAI } from 'openai';
import { fluidCompute, runPostResponseTask } from './fluid-compute';
import { logger } from '@/lib/utils/logger';

// Initialize Redis client if credentials are available
let redis: Redis | null = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

// Initialize OpenAI client if credentials are available
let openai: OpenAI | null = null;

if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

/**
 * Categories for moderation
 */
export type ModerationCategory = 
  | 'hate'
  | 'harassment'
  | 'self-harm'
  | 'sexual'
  | 'violent'
  | 'graphic';

/**
 * Moderation result from AI service
 */
export interface ModerationResult {
  isFlagged: boolean;
  categories: Record<string, boolean>;
  categoryScores: Record<string, number>;
  flaggedCategories: ModerationCategory[];
}

/**
 * Processed moderation result with additional data
 */
export interface ProcessedModerationResult extends ModerationResult {
  timestamp: string;
  id: string;
  confidence: number;
}

/**
 * Decision tracking data
 */
export interface ModerationDecisionTrackingData {
  id: string;
  timestamp: string;
  content: string;
  isFlagged: boolean;
  flaggedCategories: ModerationCategory[];
  contentType: string;
  userId?: string;
  confidence: number;
}

/**
 * Fluid compute optimized moderation function
 * Includes caching and concurrency control
 */
export const moderateContent = fluidCompute(
  async (content: string, contentType: string = 'text'): Promise<ProcessedModerationResult> => {
    // Check if OpenAI client is available
    if (!openai) {
      logger.error('OpenAI client not initialized');
      // Return a non-flagged response when OpenAI is unavailable
      return {
        isFlagged: false,
        categories: {
          hate: false,
          harassment: false,
          'self-harm': false,
          sexual: false,
          violent: false,
          graphic: false
        },
        categoryScores: {
          hate: 0,
          harassment: 0,
          'self-harm': 0,
          sexual: 0,
          violent: 0,
          graphic: 0
        },
        flaggedCategories: [],
        timestamp: new Date().toISOString(),
        id: `fallback-${Date.now()}`,
        confidence: 0
      };
    }
    
    try {
      // Call OpenAI's moderation API
      const response = await openai.moderations.create({
        input: content
      });
      
      const result = response.results[0];
      
      // Extract flagged categories
      const flaggedCategories: ModerationCategory[] = Object.keys(result.categories)
        .filter(key => result.categories[key as keyof typeof result.categories])
        .map(key => key as ModerationCategory);
      
      // Return processed result
      return {
        isFlagged: result.flagged,
        categories: result.categories as Record<string, boolean>,
        categoryScores: result.category_scores as Record<string, number>,
        flaggedCategories,
        timestamp: new Date().toISOString(),
        id: response.id,
        confidence: Math.max(...Object.values(result.category_scores))
      };
    } catch (error) {
      logger.error('Error calling OpenAI moderation API', { error });
      
      // Fallback to a simple check for known offensive terms
      const sensitiveTerms = [
        'offensive', 'racist', 'sexist', 'hate', 'kill', 'explicit'
      ];
      
      const lowerContent = content.toLowerCase();
      const foundTerms = sensitiveTerms.filter(term => lowerContent.includes(term));
      const isFlagged = foundTerms.length > 0;
      
      // Create a manual moderation result with limited info
      return {
        isFlagged,
        categories: {
          hate: lowerContent.includes('hate') || lowerContent.includes('racist'),
          harassment: lowerContent.includes('offensive') || lowerContent.includes('sexist'),
          'self-harm': false,
          sexual: lowerContent.includes('explicit'),
          violent: lowerContent.includes('kill'),
          graphic: false
        },
        categoryScores: {
          hate: lowerContent.includes('hate') || lowerContent.includes('racist') ? 0.8 : 0,
          harassment: lowerContent.includes('offensive') || lowerContent.includes('sexist') ? 0.8 : 0,
          'self-harm': 0,
          sexual: lowerContent.includes('explicit') ? 0.8 : 0,
          violent: lowerContent.includes('kill') ? 0.8 : 0,
          graphic: 0
        },
        flaggedCategories: foundTerms.length > 0 ? ['harassment'] : [],
        timestamp: new Date().toISOString(),
        id: `fallback-${Date.now()}`,
        confidence: foundTerms.length > 0 ? 0.7 : 0
      };
    }
  },
  {
    keyPrefix: 'ai-moderation',
    concurrency: 10,
    cacheTTL: 3600, // Cache for 1 hour
    keepWarm: true,
  }
);

/**
 * Track moderation decision in background
 */
export async function trackModerationDecision(
  data: Omit<ModerationDecisionTrackingData, 'timestamp'>
): Promise<void> {
  // Skip if Redis is not available
  if (!redis) {
    logger.warn('Redis not available for tracking moderation decision');
    return;
  }
  
  await runPostResponseTask(
    async () => {
      const trackingData: ModerationDecisionTrackingData = {
        ...data,
        timestamp: new Date().toISOString(),
      };
      
      try {
        // Store decision in Redis
        const key = `moderation:decision:${data.id}`;
        await redis!.set(key, JSON.stringify(trackingData));
        await redis!.expire(key, 60 * 60 * 24 * 30); // 30 days TTL
        
        // Update counters
        await redis!.incr('moderation:stats:total');
        
        if (data.isFlagged) {
          await redis!.incr('moderation:stats:flagged');
          
          // Track by category
          for (const category of data.flaggedCategories) {
            await redis!.incr(`moderation:stats:category:${category}`);
          }
        }
        
        // Track by content type
        await redis!.incr(`moderation:stats:type:${data.contentType}`);
        
        // Add to recent list (limited to 1000 entries)
        await redis!.lpush('moderation:recent', JSON.stringify({
          id: data.id,
          timestamp: trackingData.timestamp,
          flagged: data.isFlagged,
          categories: data.flaggedCategories,
          contentType: data.contentType,
        }));
        await redis!.ltrim('moderation:recent', 0, 999);
        
        logger.info('Tracked moderation decision', { id: data.id, flagged: data.isFlagged });
      } catch (error) {
        logger.error('Error tracking moderation decision', { error, id: data.id });
      }
    },
    {
      key: `track-moderation:${data.id}`,
      timeout: 10000, // 10 seconds
    }
  );
}

/**
 * Get moderation statistics
 */
export async function getModerationStats(): Promise<Record<string, number> | null> {
  // Skip if Redis is not available
  if (!redis) return null;
  
  try {
    const stats = {
      total: Number(await redis.get('moderation:stats:total') || 0),
      flagged: Number(await redis.get('moderation:stats:flagged') || 0),
    };
    
    // Get category stats
    const categories: ModerationCategory[] = ['hate', 'harassment', 'self-harm', 'sexual', 'violent', 'graphic'];
    for (const category of categories) {
      stats[`category:${category}`] = Number(await redis.get(`moderation:stats:category:${category}`) || 0);
    }
    
    return stats;
  } catch (error) {
    logger.error('Error getting moderation stats', { error });
    return null;
  }
}
