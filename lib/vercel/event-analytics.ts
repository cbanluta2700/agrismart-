import { WebVitals } from '@vercel/analytics';
import { VercelAnalytics } from '@vercel/analytics/react';

// Event types for analytics tracking
export type EventType = 
  | 'event_view'
  | 'event_create'
  | 'event_update'
  | 'event_delete'
  | 'event_rsvp'
  | 'calendar_view'
  | 'event_search'
  | 'event_share';

export type EventProperties = {
  eventId?: string;
  eventTitle?: string;
  groupId?: string;
  userId?: string;
  rsvpStatus?: string;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
  isPublic?: boolean;
  viewType?: 'month' | 'week' | 'day' | 'agenda';
  attendeeCount?: number;
  searchTerm?: string;
  duration?: number; // Duration in minutes
};

/**
 * Track event-related user interactions
 */
export const trackEventAnalytics = (
  eventType: EventType,
  properties?: EventProperties
) => {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
    // Use Vercel Web Analytics to track the event
    VercelAnalytics.track(eventType, properties);

    // Log custom event to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Event Analytics]`, { eventType, properties });
    }
  }
};

/**
 * Track calendar view performance metrics
 */
export const trackCalendarPerformance = (metric: WebVitals) => {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
    // Send the metric to Vercel Analytics
    VercelAnalytics.trackWebVitals(metric);
  }
};

/**
 * Generate event insights from analytics data
 * This is used in admin dashboards to show event engagement metrics
 */
export const getEventInsights = async (
  eventId: string,
  startDate?: Date,
  endDate?: Date
) => {
  // This would normally be an API call to Vercel Analytics API
  // For now, we'll just return mock data
  return {
    views: Math.floor(Math.random() * 100) + 20,
    rsvpRate: Math.floor(Math.random() * 50) + 40,
    attendeeGrowth: Math.floor(Math.random() * 20) - 5,
    engagement: Math.floor(Math.random() * 100) / 100,
  };
};

/**
 * Optimized data fetching for calendar events
 * Uses edge caching when possible
 */
export const fetchOptimizedEvents = async (params: {
  start: Date;
  end: Date;
  groupId?: string;
  includePublic?: boolean;
}) => {
  const { start, end, groupId, includePublic } = params;
  
  // Build query parameters
  const queryParams = new URLSearchParams({
    start: start.toISOString(),
    end: end.toISOString(),
    includePublic: String(!!includePublic),
  });
  
  if (groupId) {
    queryParams.append('groupId', groupId);
  }
  
  // Add cache control headers and use edge-optimized fetching
  const response = await fetch(`/api/events?${queryParams.toString()}`, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
    next: {
      revalidate: 60, // Revalidate every 60 seconds
    },
  });
  
  return response.json();
};

/**
 * Enhanced event search with Vercel edge caching
 */
export const searchEventsOptimized = async (searchTerm: string) => {
  if (!searchTerm || searchTerm.trim().length < 2) {
    return [];
  }
  
  const response = await fetch(`/api/events/search?q=${encodeURIComponent(searchTerm)}`, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
    },
    next: {
      revalidate: 60,
    },
  });
  
  return response.json();
};

/**
 * Hook into Vercel Image Optimization for event images
 */
export const getOptimizedEventImageUrl = (imageUrl: string, width = 800, quality = 80) => {
  if (!imageUrl) return '';
  
  // If it's already a Vercel optimized image, return as is
  if (imageUrl.includes('_next/image')) {
    return imageUrl;
  }
  
  // For external images, use Vercel Image Optimization
  return `/_next/image?url=${encodeURIComponent(imageUrl)}&w=${width}&q=${quality}`;
};

/**
 * Get calendar recommendation based on user behavior
 */
export const getCalendarRecommendations = async (userId: string) => {
  // This would normally fetch from a recommendations API
  // For now, just return mock data
  return {
    recommendedView: 'week' as const,
    suggestedEvents: [],
    preferredCategories: [],
  };
};
