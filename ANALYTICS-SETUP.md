# Analytics System Setup Guide

This guide covers the setup and configuration of the AgriSmart Analytics System, which tracks user engagement and provides insights for administrators and moderators.

## Overview

The analytics system consists of several components:
- Database schema for storing analytics events
- Server-side middleware for tracking page views
- Client-side hooks for tracking user interactions
- API endpoints for data collection and retrieval
- Admin dashboard for visualization

## Prerequisites

- Node.js and npm installed
- PostgreSQL database server running
- AgriSmart application code checked out

## Setup Steps

### 1. Configure Database Connection

The analytics system requires a properly configured PostgreSQL database. We've created a setup script to help you configure the database connection.

Run the setup script:

```bash
node setup-database.js
```

This script will:
- Ask for your database credentials
- Update your .env file with the correct database URL
- Run the necessary migrations to create the analytics tables
- Generate the Prisma client with the updated schema

### 2. Enable Analytics Feature Flag

In your `.env` file, make sure the analytics feature flag is enabled:

```
NEXT_PUBLIC_ENABLE_ANALYTICS=true
```

### 3. Verify Middleware Configuration

The analytics middleware should be automatically active after deployment. You can verify this by checking the `middleware.ts` file in the root directory.

### 4. Access the Admin Dashboard

After setting up, you can access the analytics dashboard at:

```
/admin/analytics
```

This dashboard is only accessible to users with admin privileges.

## Analytics Components

### Database Schema

The analytics system uses the `AnalyticsEvent` model in the Prisma schema, which tracks:
- Event type (e.g., PAGE_VIEW, POST_CREATE, POST_VIEW)
- Entity type and ID (what was acted upon)
- User ID (who performed the action)
- Group ID (context for the action)
- Metadata (additional information)
- Timestamps

### Client-Side Tracking

The `useAnalytics` hook provides methods for tracking events:
- `trackPageView`: Records page visits
- `trackPostView`: Records when posts are viewed
- `trackPostLike`: Records post likes
- `trackCommentCreate`: Records comment creation
- `trackReportSubmit`: Records report submissions

### Server-Side Tracking

The `analyticsMiddleware` automatically tracks page views and prevents duplicate counting through a temporary cookie system.

### API Endpoints

- `POST /api/analytics`: Records analytics events
- `GET /api/analytics`: Retrieves analytics data (admin only)

## Troubleshooting

If you encounter issues with the analytics system, check the following:

1. **Database Connection Issues**
   - Verify your PostgreSQL server is running
   - Check that the database credentials in your .env file are correct
   - Make sure the database schema has been migrated properly

2. **Missing Events**
   - Verify that the `NEXT_PUBLIC_ENABLE_ANALYTICS` flag is set to `true`
   - Check the browser console for any errors related to analytics tracking
   - Verify that the analytics API endpoints are accessible

3. **Dashboard Not Showing Data**
   - Make sure you have admin privileges
   - Check that events are being properly recorded in the database
   - Verify the time period filters on the dashboard

## Extending the Analytics System

The current implementation provides a foundation that can be extended with:

1. **Additional Event Types**
   - Add new event types to the `EventType` enum in the Prisma schema
   - Implement tracking methods in the `useAnalytics` hook

2. **Advanced Visualizations**
   - Extend the dashboard with additional charts and filters
   - Implement drill-down capabilities for detailed analysis

3. **Integration with External Systems**
   - Export data to external analytics platforms
   - Set up scheduled reports via email
