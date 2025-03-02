# Vercel SDK Integration for AgriSmart

This document outlines how we use the Vercel SDK to optimize the AgriSmart platform, particularly for resource management and search functionality.

## Overview

The Vercel SDK integration provides several performance benefits:

1. **Image Optimization** - Automatic resizing, format conversion, and quality adjustment
2. **Edge Caching** - Configurable caching for faster content delivery
3. **Content Deployment** - Deploy content to Vercel's edge network
4. **Content Versioning** - Manage versions of content with publishing capabilities

## Environment Setup

To use Vercel SDK features, you need to set up the following environment variables:

```
VERCEL_API_TOKEN=your-vercel-api-token
VERCEL_TEAM_ID=your-vercel-team-id
NEXT_PUBLIC_VERCEL_URL=https://your-project.vercel.app
ADMIN_API_KEY=your-admin-api-key-for-protected-endpoints
```

You can obtain these values from your Vercel dashboard:
1. VERCEL_API_TOKEN: Create a token in Account Settings > Tokens
2. VERCEL_TEAM_ID: Found in the team settings page URL
3. NEXT_PUBLIC_VERCEL_URL: Your project's deployment URL

## Key Components

### Resource Optimizations (`/lib/resource-optimizations.ts`)

This utility provides functions for:
- Optimizing resource images for different contexts (thumbnails, featured images, avatars)
- Setting up edge caching for resource types
- Invalidating cache for specific resources
- Generating SEO metadata for resources
- Preparing resource data for client-side rendering

### Optimized Search API (`/pages/api/resources/optimized-search.ts`)

Enhanced search endpoint that:
- Uses Vercel's edge caching for faster search results
- Optimizes response payload size for quicker client rendering
- Sets appropriate cache headers for improved performance

### Optimized Resource Search Hook (`/hooks/useOptimizedResourceSearch.ts`)

React hook for efficient resource searching:
- Debounced queries to reduce API calls
- Optimized parameter handling
- SWR integration for client-side caching

## Initialization

The Vercel SDK optimizations are initialized in two ways:

1. **Automatic Initialization** - When the server starts up in production mode
2. **Manual Initialization** - Through an admin API endpoint

To manually initialize:

```bash
# Using the npm script
npm run initialize-optimizations

# Or directly with curl
curl -X POST http://localhost:3000/api/admin/initialize-optimizations -H "x-api-key: YOUR_ADMIN_API_KEY"
```

## Using Optimized Resources in Components

The ResourceCard component demonstrates how to use optimized images:

```tsx
// Import the optimization utility
import { optimizeResourceImage } from '@/lib/resource-optimizations';

// In your component:
const optimizedFeaturedImage = featuredImage 
  ? optimizeResourceImage(featuredImage, 'thumbnail') 
  : undefined;

// Use in an Image component
<Image
  src={optimizedFeaturedImage}
  alt={title}
  fill
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  className="object-cover"
  loading="lazy"
/>
```

## Performance Benefits

Using the Vercel SDK optimizations provides several benefits:

1. **Reduced Bandwidth** - Optimized images and content delivery
2. **Faster Page Loads** - Edge caching reduces time-to-first-byte
3. **Improved Core Web Vitals** - Better LCP and CLS scores
4. **Reduced Origin Load** - Less traffic to your origin servers
5. **Global Performance** - Content served from edge locations worldwide

## Analytics Integration

The Vercel Analytics integration enhances our moderation analytics dashboard with powerful data visualization and performance tracking:

### Vercel Analytics API (`/lib/vercel/analytics-api.ts`)

This utility provides functions for:
- Retrieving web analytics data through the Vercel API
- Monitoring endpoint performance (invocations, latency, status)
- Tracking user engagement with moderation-related features
- Analyzing resource page performance

### Analytics Components

1. **VercelChart** (`/components/analytics/VercelChart.tsx`)
   - Recharts-based visualization component
   - Supports line, bar, and pie charts
   - Consistent styling with the Vercel design system
   - Responsive and mobile-friendly

2. **StatCard** (`/components/analytics/StatCard.tsx`)
   - Display key metrics with change indicators
   - Loading state support for asynchronous data
   - Consistent design with the analytics dashboard

3. **VercelProviders** (`/components/providers/VercelProviders.tsx`)
   - Integrates Vercel Analytics and Speed Insights
   - Automatically tracks page views and performance metrics

### Moderation Analytics Dashboard (`/pages/admin/analytics/moderation.tsx`)

The dashboard combines AgriSmart moderation data with Vercel Analytics to provide:
- Real-time moderation activity metrics
- Historical trend analysis
- Resource distribution visualization
- Moderator performance tracking
- Integration with Vercel's web analytics

### API Endpoints

The following API endpoints support the analytics dashboard:
- `/api/admin/analytics/moderation/summary` - Activity summary statistics
- `/api/admin/analytics/moderation/trends` - Historical trend data
- `/api/admin/analytics/moderation/distribution` - Resource distribution by status and type
- `/api/admin/analytics/moderation/performance` - Moderator performance metrics

Each endpoint enriches our database statistics with relevant Vercel Analytics data when available.

## Best Practices

1. Always use the optimizeResourceImage function for images
2. Keep cache durations appropriate to content update frequency
3. Invalidate cache when content changes
4. Prepare resources for client-side rendering to reduce payload size
5. Use the optimized search hook for all resource searches
6. Leverage Vercel Analytics for performance monitoring and optimization
7. Ensure the VERCEL_API_TOKEN has appropriate permissions for analytics
8. Use the VercelChart component for consistent data visualization
