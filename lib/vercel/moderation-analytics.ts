/**
 * Vercel Analytics integration for Moderation Queue
 */
import { createPublicClient } from '@vercel/analytics';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { ContentType, ModerationAction, ModerationStatus } from '@prisma/client';
import { NextResponse } from 'next/server';
import { env } from '@/env.mjs';

const analytics = createPublicClient({
  debug: env.NODE_ENV === 'development'
});

// Track moderation analytics dashboard view
export function trackModerationAnalyticsView(userId?: string) {
  try {
    analytics.track('moderation_analytics_view', {
      timestamp: new Date().toISOString(),
      userId: userId || 'anonymous'
    });
  } catch (error) {
    console.error('Failed to track moderation analytics view:', error);
  }
}

// Track moderation action (approve, reject, edit)
export function trackModerationAction(
  action: 'approve' | 'reject' | 'edit' | 'auto_approve', 
  contentType: string,
  userId?: string,
  contentId?: string
) {
  try {
    analytics.track('moderation_action', {
      action,
      contentType,
      userId: userId || 'system',
      contentId: contentId || 'unknown',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to track moderation action:', error);
  }
}

// Track moderation cleanup job execution
export function trackModerationCleanupJob(
  status: 'success' | 'error',
  executionTimeMs: number,
  details: Record<string, any> = {}
) {
  try {
    analytics.track('moderation_cleanup_job', {
      status,
      executionTimeMs,
      timestamp: new Date().toISOString(),
      ...details
    });
  } catch (error) {
    console.error('Failed to track moderation cleanup job:', error);
  }
}

// Track moderation queue performance
export function trackModerationQueueMetrics(queueSize: number, oldestItemAge: number) {
  try {
    analytics.track('moderation_queue_metrics', {
      queueSize,
      oldestItemAge,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to track moderation queue metrics:', error);
  }
}

// Track moderation performance metrics
export function trackModerationPerformance(
  avgResponseTime: number,
  totalProcessed: number,
  details: Record<string, any> = {}
) {
  try {
    analytics.track('moderation_performance', {
      avgResponseTime,
      totalProcessed,
      timestamp: new Date().toISOString(),
      ...details
    });
  } catch (error) {
    console.error('Failed to track moderation performance:', error);
  }
}

// Track AI moderation prediction quality
export function trackAIModerationQuality(
  contentType: string,
  aiPrediction: string,
  humanDecision: string,
  confidence: number
) {
  try {
    analytics.track('moderation_ai_quality', {
      contentType,
      aiPrediction,
      humanDecision,
      confidence,
      timestamp: new Date().toISOString(),
      match: aiPrediction === humanDecision
    });
  } catch (error) {
    console.error('Failed to track AI moderation quality:', error);
  }
}

// Hook into edge caching for moderation API endpoints
export function setModerationCacheHeaders(
  response: Response,
  maxAgeSeconds: number = 60 // Default 1 minute cache
): Response {
  response.headers.set('Cache-Control', `s-maxage=${maxAgeSeconds}, stale-while-revalidate`);
  return response;
}

/**
 * Helper function to create a cached response for Vercel Edge Runtime
 * @param body Response body
 * @param init Response initialization options
 * @param cacheOptions Cache control options
 * @returns NextResponse with appropriate caching headers
 */
export function cachedResponse(
  body: any, 
  init: ResponseInit = {}, 
  cacheOptions: { 
    duration: 'longTerm' | 'shortTerm' | 'none',
    staleWhileRevalidate?: boolean
  } = { duration: 'shortTerm' }
) {
  const response = NextResponse.json(body, init);
  
  // Set cache headers based on duration
  let maxAge: number;
  
  switch (cacheOptions.duration) {
    case 'longTerm':
      maxAge = 86400; // 24 hours
      break;
    case 'shortTerm':
      maxAge = 300; // 5 minutes
      break;
    case 'none':
    default:
      maxAge = 0;
      break;
  }
  
  // Add stale-while-revalidate if requested
  const cacheControl = maxAge > 0
    ? cacheOptions.staleWhileRevalidate
      ? `s-maxage=${maxAge}, stale-while-revalidate`
      : `s-maxage=${maxAge}`
    : 'no-store, no-cache, must-revalidate';
  
  response.headers.set('Cache-Control', cacheControl);
  
  // Add Vercel specific edge cache headers if in production
  if (env.NODE_ENV === 'production') {
    // Cache Deployment
    response.headers.set('x-vercel-cache', 'EDGE');
    // Allow purge if needed for fast updates
    response.headers.set('x-vercel-cache-control-allow-purge', 'true');
  }
  
  return response;
}

// Adapted from our event-analytics implementation for optimized data fetching
export async function fetchOptimizedModerationQueue(params: Record<string, string>) {
  try {
    const startTime = performance.now();
    
    // Build query params
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });
    
    // Fetch with enhanced caching headers
    const response = await fetch(`/api/admin/moderation/queue?${queryParams.toString()}`, {
      headers: {
        'x-vercel-optimize-cache': 'true',
        'x-vercel-analytics-source': 'moderation-dashboard'
      },
      next: {
        revalidate: 60 // revalidate every minute
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch moderation queue');
    }
    
    const data = await response.json();
    
    // Track performance
    const loadTime = performance.now() - startTime;
    trackModerationQueueMetrics(data.items?.length || 0, data.oldestItemAge || 0);
    
    return data;
  } catch (error) {
    console.error('Error fetching moderation queue:', error);
    throw error;
  }
}

// Fetch a single moderation item with optimized caching
export async function fetchOptimizedModerationItem(id: string) {
  try {
    const startTime = performance.now();
    
    // Fetch with enhanced caching headers
    const response = await fetch(`/api/admin/moderation/item/${id}`, {
      headers: {
        'x-vercel-optimize-cache': 'true',
        'x-vercel-analytics-source': 'moderation-item-view'
      },
      next: {
        revalidate: 10 // shorter revalidation for individual items
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch moderation item');
    }
    
    const data = await response.json();
    
    // Track view
    trackModerationAction('view', data.contentType, undefined, id);
    
    return data;
  } catch (error) {
    console.error('Error fetching moderation item:', error);
    throw error;
  }
}

// Submit moderation decision with tracking
export async function submitModerationDecision(
  id: string,
  data: {
    status: ModerationStatus,
    action?: ModerationAction,
    notes?: string,
    contentEdits?: Record<string, any>
  },
  viewStartTime?: number // If provided, will calculate time taken to make decision
) {
  try {
    // Calculate time taken if viewStartTime is provided
    const timeTaken = viewStartTime ? performance.now() - viewStartTime : undefined;
    
    // Submit decision
    const response = await fetch(`/api/admin/moderation/item/${id}/decision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-vercel-analytics-source': 'moderation-action'
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error('Failed to submit moderation decision');
    }
    
    const result = await response.json();
    
    // Track action
    if (data.action) {
      trackModerationAction(data.action, result.contentType, undefined, id);
    }
    
    return result;
  } catch (error) {
    console.error('Error submitting moderation decision:', error);
    throw error;
  }
}
