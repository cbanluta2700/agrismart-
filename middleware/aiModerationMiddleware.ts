import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { getModerationFeatureFlag } from '@/lib/vercel/edge-config';
import { getCacheControlHeaders } from '@/lib/vercel/cache-control';
import { trackModerationAction } from '@/lib/vercel/moderation-analytics';

// Create a Redis client if this is used in production
let ratelimit: Ratelimit | null = null;

// In production with Vercel, use their KV store instead of Upstash directly
if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
  const redis = new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
  });
  
  // Use a stricter rate limit for AI moderation to prevent abuse
  ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '10s'),
    analytics: true,
    prefix: 'ai-moderation',
  });
}

// Map to simulate rate limiting in development
const requestCounts = new Map<string, { count: number, resetTime: number }>();

// Simulated rate limit function for development
async function simulateRateLimit(identifier: string): Promise<{ success: boolean; remaining: number; reset: number }> {
  const now = Date.now();
  const windowSize = 10 * 1000; // 10 seconds
  const limit = 10; // 10 requests per window
  
  const entry = requestCounts.get(identifier) || { count: 0, resetTime: now + windowSize };
  
  // Reset counter if the window has passed
  if (now > entry.resetTime) {
    entry.count = 0;
    entry.resetTime = now + windowSize;
  }
  
  entry.count += 1;
  requestCounts.set(identifier, entry);
  
  return {
    success: entry.count <= limit,
    remaining: Math.max(0, limit - entry.count),
    reset: entry.resetTime
  };
}

/**
 * Middleware specifically for AI moderation API routes
 * Implements:
 * 1. Strict rate limiting
 * 2. Request size validation
 * 3. Authentication for admin routes
 * 4. Analytics tracking
 */
export async function aiModerationMiddleware(request: NextRequest) {
  // Apply strict rate limiting at the edge
  const ip = request.ip || 'anonymous';
  const identifier = `ai-moderation-${ip}`;
  
  // Use real rate limit in production, simulated in development
  const result = ratelimit 
    ? await ratelimit.limit(identifier)
    : await simulateRateLimit(identifier);
  
  // If rate limit exceeded, return 429 Too Many Requests
  if (!result.success) {
    return new NextResponse(
      JSON.stringify({
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': result.reset.toString(),
        },
      }
    );
  }
  
  // For POST requests, check content type and length
  if (request.method === 'POST') {
    const contentType = request.headers.get('content-type');
    
    // Ensure content type is JSON
    if (!contentType || !contentType.includes('application/json')) {
      return new NextResponse(
        JSON.stringify({
          error: 'Invalid content type',
          message: 'Content-Type must be application/json',
        }),
        {
          status: 415,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }
    
    // Check content length to prevent abuse (use a smaller limit)
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 100_000) { // 100KB limit
      return new NextResponse(
        JSON.stringify({
          error: 'Content too large',
          message: 'Request body exceeds maximum size of 100KB',
        }),
        {
          status: 413,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }
  }
  
  // For administrative routes, verify authentication
  if (request.nextUrl.pathname.startsWith('/api/admin/moderation/ai')) {
    const token = await getToken({ req: request as any });
    
    if (!token || !['ADMIN', 'MODERATOR'].includes(token.role as string)) {
      return new NextResponse(
        JSON.stringify({
          error: 'Unauthorized',
          message: 'You do not have permission to access this resource',
        }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }
  }
  
  // Track AI moderation usage in analytics
  const enableAnalytics = await getModerationFeatureFlag('trackAIModerationUsage', true);
  
  if (enableAnalytics) {
    // Extract query params for tracking
    const searchParams = request.nextUrl.searchParams;
    const contentType = searchParams.get('contentType') || 'comment';
    const contentId = searchParams.get('contentId') || 'unknown';
    
    // Track the AI moderation request
    trackModerationAction({
      contentId,
      action: 'ai_moderation_request',
      reason: 'api_request',
      userId: 'system',
      automated: true,
      source: 'ai-moderation-middleware',
      additionalData: {
        contentType,
        endpoint: request.nextUrl.pathname
      }
    });
  }
  
  // Add cache control headers for GET requests
  if (request.method === 'GET') {
    const enableEdgeCaching = await getModerationFeatureFlag('enableAIEdgeCaching', true);
    
    if (enableEdgeCaching) {
      const cacheHeaders = await getCacheControlHeaders({
        duration: 'shortTerm',
        staleWhileRevalidate: true
      });
      
      // Set the headers for the response
      const response = NextResponse.next();
      
      Object.entries(cacheHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      
      return response;
    }
  }
  
  // Continue to the API route
  return NextResponse.next();
}
