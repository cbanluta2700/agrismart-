import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { getModerationFeatureFlag } from '@/lib/vercel/edge-config';
import { getCacheControlHeaders } from '@/lib/vercel/cache-control';
import { trackModerationQueueView } from '@/lib/vercel/moderation-analytics';

// Create a Redis client if this is used in production
let ratelimit: Ratelimit | null = null;

// In production with Vercel, use their KV store instead of Upstash directly
// This allows us to leverage Vercel's infrastructure more effectively
if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
  const redis = new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
  });
  ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, '10s'),
    analytics: true,
  });
}

// Map to simulate rate limiting in development
const requestCounts = new Map<string, { count: number, resetTime: number }>();

// Simulated rate limit function for development
async function simulateRateLimit(identifier: string): Promise<{ success: boolean; remaining: number; reset: number }> {
  const now = Date.now();
  const windowSize = 10 * 1000; // 10 seconds
  const limit = 20; // 20 requests per window
  
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

// Function to check if user has moderation permissions
async function hasModerationPermission(token: any): Promise<boolean> {
  if (!token) return false;
  
  // Check for admin role
  if (token.role === 'ADMIN') return true;
  
  // Check for moderator role
  if (token.role === 'MODERATOR') return true;
  
  // Check for specific permissions in token
  if (token.permissions && 
      (token.permissions.includes('MODERATE_CONTENT') || 
       token.permissions.includes('MODERATE_ALL'))) {
    return true;
  }
  
  return false;
}

/**
 * Middleware specifically for moderation API routes
 * Optimized for Vercel Edge Runtime
 * Implements:
 * 1. Edge-based authorization checks
 * 2. Rate limiting
 * 3. Basic content validation
 * 4. Edge caching
 * 5. Vercel Analytics integration
 */
export async function moderationMiddleware(request: NextRequest) {
  // Apply rate limiting at the edge
  const ip = request.ip || 'anonymous';
  const identifier = `moderation-api-${ip}`;
  
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
          'X-RateLimit-Limit': '20',
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': result.reset.toString(),
        },
      }
    );
  }
  
  // For POST/PUT requests, check content type and length
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    const contentType = request.headers.get('content-type');
    
    // Ensure content type is JSON for moderation API
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
    
    // Check content length to prevent abuse
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 1_000_000) { // 1MB limit
      return new NextResponse(
        JSON.stringify({
          error: 'Content too large',
          message: 'Request body exceeds maximum size of 1MB',
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
  
  // Verify authentication and permissions
  const token = await getToken({ req: request as any });
  
  // Track moderation queue views in Vercel Analytics
  const showAnalytics = await getModerationFeatureFlag('showModerationAnalytics', true);
  if (showAnalytics && request.nextUrl.pathname.includes('/moderation')) {
    // Extract query params for tracking
    const searchParams = request.nextUrl.searchParams;
    const filterParams: Record<string, string> = {};
    
    searchParams.forEach((value, key) => {
      filterParams[key] = value;
    });
    
    // Track the view
    trackModerationQueueView(filterParams);
  }
  
  // For administrative moderation endpoints, require moderation permissions
  if (request.nextUrl.pathname.startsWith('/api/admin/moderation')) {
    const hasPermission = await hasModerationPermission(token);
    
    if (!token || !hasPermission) {
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
  
  // Add cache control headers for read operations
  if (['GET', 'HEAD'].includes(request.method)) {
    const enableEdgeCaching = await getModerationFeatureFlag('enableEdgeCaching', true);
    
    if (enableEdgeCaching) {
      // Different caching strategies based on endpoint
      const cacheDuration: 'shortTerm' | 'mediumTerm' | 'longTerm' = 
        request.nextUrl.pathname.includes('/analytics') ? 'mediumTerm' : 'shortTerm';
      
      const cacheHeaders = await getCacheControlHeaders({
        duration: cacheDuration,
        staleWhileRevalidate: true
      });
      
      // Add rate limit headers to the response
      const response = NextResponse.next();
      response.headers.set('X-RateLimit-Limit', '20');
      response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
      response.headers.set('X-RateLimit-Reset', result.reset.toString());
      
      // Add cache headers from our cache-control utility
      cacheHeaders.forEach((value, key) => {
        response.headers.set(key, value);
      });
      
      return response;
    }
  }
  
  // Add rate limit headers to the response
  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Limit', '20');
  response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
  response.headers.set('X-RateLimit-Reset', result.reset.toString());
  
  return response;
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
