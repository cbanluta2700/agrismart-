# Event Calendar Vercel SDK Integration

This document outlines the integration of Vercel SDK components and services with the AgriSmart Event Calendar functionality.

## Overview

The Event Calendar feature leverages Vercel SDK to optimize performance, collect analytics, and enhance user experience. This integration follows the same patterns used in other AgriSmart components like Moderation Analytics and Resource Optimization.

## Components

### 1. Event Analytics

Located in `/lib/vercel/event-analytics.ts`, this module provides:

- Event tracking functions for user interactions
- Performance monitoring for calendar views
- Optimized data fetching with edge caching
- Helper functions for event image optimization

Usage example:
```typescript
import { trackEventAnalytics } from '@/lib/vercel/event-analytics';

// Track when a user views an event
trackEventAnalytics('event_view', {
  eventId: event.id,
  eventTitle: event.title,
  userId: session?.user?.id
});
```

### 2. Optimized API Endpoints

The event search endpoint at `/api/events/search/route.ts` is configured to run at the edge with:

- Revalidation settings for optimal caching
- Cache headers for stale-while-revalidate patterns
- Efficient query parameters

### 3. Optimized UI Components

- `MultiSelectOptimized`: Enhanced version of the MultiSelect component with Vercel Speed Insights integration
- `EventCalendar`: Updated to use Vercel Analytics for tracking user behavior

## Performance Benefits

1. **Edge Caching**
   - Event data is cached at the edge for faster loading times
   - Stale-while-revalidate pattern ensures users always see fresh data without waiting

2. **Image Optimization**
   - Event images are automatically optimized for different devices
   - Reduced bandwidth usage and faster page loads

3. **Analytics Integration**
   - Real-time insights into user interactions with the calendar
   - Performance tracking to identify bottlenecks

## Usage Guidelines

### Analytics Tracking

When adding new event-related features, use the appropriate tracking functions:

```typescript
// For calendar view changes
trackEventAnalytics('calendar_view', {
  viewType: 'month',
  userId: session.user.id
});

// For event interactions
trackEventAnalytics('event_rsvp', {
  eventId: event.id,
  rsvpStatus: 'ACCEPTED',
  userId: session.user.id
});
```

### Optimized Data Fetching

Use the optimized fetching functions for event data:

```typescript
import { fetchOptimizedEvents } from '@/lib/vercel/event-analytics';

// Fetch events with edge caching
const events = await fetchOptimizedEvents({
  start: startDate,
  end: endDate,
  groupId: groupId,
  includePublic: true
});
```

### Performance Monitoring

The event calendar automatically tracks Web Vitals metrics using Vercel Speed Insights. You can view these metrics in the Vercel Dashboard.

## Future Improvements

1. Add real-time capabilities for collaborative event editing
2. Implement server-side rendering for initial calendar view
3. Add more granular analytics for user engagement tracking
4. Implement recommendation system based on user attendance patterns

## Related Documentation

- [Vercel Analytics Documentation](https://vercel.com/docs/analytics)
- [Speed Insights Documentation](https://vercel.com/docs/speed-insights)
- [Edge Functions Documentation](https://vercel.com/docs/functions/edge-functions)
- [AgriSmart Moderation Analytics Integration](/docs/vercel-sdk-integration.md)
