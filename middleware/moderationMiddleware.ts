import { NextFetchEvent, NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';
import { ProcessedModerationResult, moderateContent } from '@/lib/vercel/ai-moderation';
import { runPostResponseTask } from '@/lib/vercel/fluid-compute';
import { logger } from '@/lib/utils/logger';

// Initialize Redis client if credentials are available
let redis: Redis | null = null;
let ratelimit: Ratelimit | null = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  
  // Set up rate limiting
  ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1m'),
    analytics: true,
    prefix: 'moderation:ratelimit',
  });
}

type ModerationContentData = {
  content: string;
  contentType: string;
  userId?: string;
  entityId?: string;
};

type ModerationMiddlewareConfig = {
  /**
   * Function to extract content from request
   */
  extractContent: (req: NextRequest) => Promise<ModerationContentData | null>;
  
  /**
   * Function to handle flagged content
   */
  handleFlaggedContent?: (
    req: NextRequest, 
    result: ProcessedModerationResult,
    content: ModerationContentData
  ) => Promise<NextResponse | null>;
  
  /**
   * Whether to bypass moderation in development
   * @default false
   */
  bypassInDevelopment?: boolean;
  
  /**
   * Whether to track moderation decisions
   * @default true
   */
  trackModerationDecisions?: boolean;
};

/**
 * Process moderation result and handle response
 */
async function processModerationResult(
  req: NextRequest,
  contentData: ModerationContentData,
  result: ProcessedModerationResult,
  config: ModerationMiddlewareConfig
): Promise<NextResponse | null> {
  // Track moderation decision if enabled
  if (config.trackModerationDecisions !== false && redis) {
    try {
      await runPostResponseTask(
        async () => {
          const moderationRecord = {
            timestamp: new Date().toISOString(),
            content: contentData.content.slice(0, 100) + (contentData.content.length > 100 ? '...' : ''),
            contentType: contentData.contentType,
            userId: contentData.userId || 'anonymous',
            entityId: contentData.entityId,
            result: {
              isFlagged: result.isFlagged,
              flaggedCategories: result.flaggedCategories,
            }
          };
          
          // Store in Redis with TTL
          const key = `moderation:history:${Date.now()}`;
          await redis!.set(key, JSON.stringify(moderationRecord));
          await redis!.expire(key, 60 * 60 * 24 * 30); // 30 days
          
          // Update counter
          await redis!.incr('moderation:count:total');
          if (result.isFlagged) {
            await redis!.incr('moderation:count:flagged');
            
            // Increment category counters
            for (const category of result.flaggedCategories || []) {
              await redis!.incr(`moderation:count:category:${category}`);
            }
          }
        },
        {
          key: `track-moderation:${contentData.entityId || contentData.userId || Date.now()}`,
          timeout: 10000, // 10 seconds
        }
      );
    } catch (error) {
      logger.error('Error tracking moderation decision', { error });
    }
  }
  
  // If content is flagged, handle it
  if (result.isFlagged) {
    // Use custom handler if provided
    if (config.handleFlaggedContent) {
      return await config.handleFlaggedContent(req, result, contentData);
    }
    
    // Default handler - return 451 Unavailable For Legal Reasons
    const responseData = {
      error: 'Content moderation',
      message: 'The provided content has been flagged by our moderation system',
      categories: result.flaggedCategories,
    };
    
    return NextResponse.json(responseData, { status: 451 });
  }
  
  // Content passed moderation, allow request to proceed
  return null;
}

/**
 * Create moderation middleware with provided configuration
 */
export function createModerationMiddleware(config: ModerationMiddlewareConfig) {
  return async function moderationMiddleware(
    request: NextRequest,
    event: NextFetchEvent
  ) {
    // Bypass moderation in development if configured
    if (config.bypassInDevelopment && process.env.NODE_ENV === 'development') {
      return NextResponse.next();
    }
    
    // Apply rate limiting if enabled
    if (ratelimit) {
      const identifier = request.ip || 'anonymous';
      const { success, limit, reset, remaining } = await ratelimit.limit(identifier);
      
      if (!success) {
        return NextResponse.json(
          { error: 'Too many requests', reset },
          { 
            status: 429,
            headers: {
              'X-RateLimit-Limit': limit.toString(),
              'X-RateLimit-Remaining': remaining.toString(),
              'X-RateLimit-Reset': reset.toString(),
            }
          }
        );
      }
    }
    
    try {
      // Extract content from request
      const contentData = await config.extractContent(request);
      
      // If no content to moderate, just proceed
      if (!contentData || !contentData.content) {
        return NextResponse.next();
      }
      
      // Moderate the content
      const moderationResult = await moderateContent(contentData.content, contentData.contentType);
      
      // Process result
      const response = await processModerationResult(request, contentData, moderationResult, config);
      
      // Return custom response or proceed
      return response || NextResponse.next();
    } catch (error) {
      logger.error('Error in moderation middleware', { error });
      
      // On error, let the request through to avoid blocking legitimate traffic
      // In a real production system, you might want to fail closed instead
      return NextResponse.next();
    }
  };
}

// Export config for Vercel Edge Runtime
export const config = {
  matcher: [
    '/api/moderation/:path*',
    '/api/admin/moderation/:path*',
    '/api/forum/comments/:path*'
  ],
  runtime: 'edge'
};
