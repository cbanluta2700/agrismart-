# System Context

## Overview

This document provides a high-level overview of the AgriSmart application's architecture, core components, technologies, and key design principles.  It serves as a central reference for understanding the system as a whole and how its different parts interact.  This document also describes the tools used to speed up development and improve the production-grade quality.

## Goals

AgriSmart aims to address common farming issues and enhance agricultural practices by offering technological solutions.  Using a chatbot-powered platform, the project will demonstrate how digital transformation in contemporary agriculture can benefit farming communities, agricultural enterprises, and research. The main targets are Farmers and Agricultural Workers, Agricultural Businesses, and Entrepreneurs.

## Core Components

The AgriSmart application is composed of the following core components:

*   **Frontend:** A Next.js application (using React) that provides the user interface and dynamic homepages (Guest and User).
*   **Backend:** A Node.js/Express.js server that handles business logic, data storage, and API requests.
*   **Express API Server:** A separate Node.js/Express.js server that handles specialized logic or endpoints.
*   **Database:** PostgreSQL, which stores the application's relational data.
*   **Redis:** A Redis instance for caching, session management, real-time chat (Socket.IO), queues, rate limiting, leaderboards, geospatial data and temporary data.
*   **Third-Party Services:** Integrations with services like email providers (e.g., AWS SES), SMS providers (e.g., Twilio), payment gateways, social media providers (e.g., Google, Facebook), and weather APIs.
*   **Chatbot:** An AI to help the user in its inquiries and problems, and provide product suggestions.
* **Test Utilities**: A Test utilities package to help with the tests.
* **Resources Section:** A comprehensive content management system powered by Vercel SDK for optimization, edge deployment, and caching, providing articles, guides, videos, and glossary terms.
* **Reputation System:** A user trust and achievements system that tracks user activities, awards points, manages trust levels, and provides endorsements and credential verification functionality with analytics dashboard powered by Vercel SDK.
* **Vercel Advanced Features:** A suite of optimizations leveraging Vercel's platform capabilities including Edge Functions, Edge Config for feature flags, advanced caching strategies, and middleware for performance and security.

## Key Technologies

### Frontend

*   **Framework:** Next.js (v15+)
*   **UI Library:** React (v19+)
*   **Type Checking:** TypeScript
*   **Styling:** TailwindCSS
*   **Component Library:** Radix UI Components
*   **Data Fetching:** React Query
*   **State Management:** Zustand
*   **Realtime:** Socket.IO

### Backend

*   **Runtime:** Node.js (>= 18.0.0)
*   **Web Framework:** Express.js
*   **Database ORM:** Prisma ORM (with PostgreSQL)
*   **Caching:** Redis
*   **Authentication:** JWT with Refresh Tokens, NextAuth
*   **Validation:** Zod
*   **Security:** Helmet, express-rate-limit, cors
*   **File Uploading:** Multer and Multer-S3
*   **Email:** Nodemailer or AWS SES
*   **Image Processing:** Sharp
*   **AWS:** AWS-SDK (S3, SES, SQS, SNS, Secrets Manager)
*   **Error Reporting:** Sentry
*   **Utilities:** Compression, cookie-parser, winston, uuid
*   **Code Quality:** eslint, prettier
*   **Code Management:** husky, lint-staged, npm-run-all

### Express API Server

*   **Runtime:** Node.js
*   **Web Framework:** Express.js
*   **Database:** Prisma (PostgreSQL)
*   **Authentication:** JWT
*   **Email:** Nodemailer or AWS SES
*   **Security:** Helmet, cors
*   **Utilities:** Compression, cookie-parser, winston
*   **Validation:** Zod
*   **Code Quality:** eslint, prettier

### Test Utilities Package

*   **Testing:** Jest
*   **CLI:** commander
*   **Output:** chalk
*   **Code Quality:** eslint, prettier

### Resources Section

* **Content Delivery:** Vercel SDK (v1.3.1)
* **Edge Caching:** Vercel Edge Network
* **Content Management:** Custom CMS with versioning
* **Media Optimization:** Vercel Image Optimization
* **Content Types:** Articles, Guides, Videos, Glossary
* **Data Fetching:** SWR for efficient client-side data loading
* **Content Rendering:** MDX for interactive content
* **Search and Discovery:** Full-text search with filtering and pagination
* **Optimization Components:**
  * Resource optimization utilities (`lib/resource-optimizations.ts`)
  * Automatic initialization system (`lib/init-vercel-optimizations.ts`)
  * Custom server implementation for startup optimization (`server.js`)
  * Protected API endpoint for on-demand initialization (`/api/admin/initialize-optimizations.ts`)
  * Enhanced ResourceCard component using optimized images
  * Comprehensive documentation (`docs/vercel-sdk-integration.md`)

### Vercel Advanced Features

* **Edge Caching System:**
  * Cache control utilities (`lib/vercel/cache-control.ts`)
  * Stale-while-revalidate pattern implementation
  * Conditional caching based on content types
  * Cache duration strategies (shortTerm, mediumTerm, longTerm)
  * Cache invalidation hooks
  * Moderation-specific caching functions with KV store integration
  * Analytics data caching with configurable expiration times

* **Feature Flag System:**
  * Edge Config integration (`lib/vercel/edge-config.ts`)
  * Type-safe feature flag utilities
  * Moderation-specific feature flags
  * UI component feature flags
  * Environment-specific configurations

* **Edge Middleware:**
  * Specialized middleware for moderation (`middleware/moderationMiddleware.ts`)
  * Edge-based validation and authorization
  * Rate limiting implementation (with simulation for development)
  * Security headers and CORS configuration
  * Analytics tracking middleware

* **Moderation Analytics System:**
  * Comprehensive moderation analytics tracking (`lib/vercel/moderation-analytics.ts`)
  * Performance metrics for all moderation actions
  * Advanced visualization dashboard (`components/admin/moderation-analytics.tsx`)
  * Period-based data filtering (24h, 7d, 30d, 90d)
  * AI moderation quality tracking
  * Automated maintenance through Vercel cron jobs (`vercel.json`)
  * API endpoint with caching optimization (`app/api/admin/analytics/moderation/route.ts`)
  * Cache invalidation during content updates and cleanup operations
  * Memory-optimized edge function configuration

* **Vercel AI SDK Integration:**
  * **AI Moderation System**: 
    - Custom middleware that integrates with OpenAI's moderation API to automatically screen user-generated content
    - Pre-generation content checks to prevent inappropriate prompts
    - Post-generation content validation to ensure AI outputs meet community guidelines
    - React hooks (`useAIModeration`) for frontend integration
    - Analytics tracking for all moderation decisions
    - Component library for displaying moderation status and actions

  * **Content Generation**:
    - Streaming text generation for improved user experience
    - Context-aware responses using specialized prompts
    - Built-in retry mechanisms and error handling

  * **Edge Function Optimization**:
    - Performance optimization through edge deployment
    - Caching strategies for improved latency
    - Memory usage optimization and error boundary implementation

  * **Utilities**:
    - Rate limiting specific to AI functionality
    - Telemetry for usage tracking and optimization
    - Error handling and logging specific to AI responses

  * **Fluid Compute Optimizations**:
    - Cold-start reduction through periodic warmup (`app/api/moderation/warmup/route.ts`)
    - Semaphore-based concurrency control (`lib/vercel/fluid-compute.ts`)
    - Background processing with post-response tasks
    - Result caching with configurable TTL
    - Optimized function configurations in `vercel.json`
    - Specialized visualization components (`components/charts/ModerationBarChart.tsx`, `components/charts/ModerationLineChart.tsx`)
    - Redis integration for tracking and caching
    - Comprehensive admin dashboard (`app/admin/moderation/analytics/page.tsx`)

* **Documentation:**
  * Feature overview (`docs/vercel-advanced-features-integration.md`)
  * Implementation guide (`docs/vercel-optimization-guide.md`)
  * API reference and examples
  * Troubleshooting tips

### Reputation System

* **Core Components:**
  * Reputation Service (`lib/reputation/reputation-service.ts`)
  * Reputation Constants (`lib/reputation/constants.ts`)
  * User Badges Component (`components/users/reputation/UserBadges.tsx`)
  * Reputation Profile Component (`components/users/reputation/ReputationProfile.tsx`)
  * User Credentials Component (`components/users/reputation/UserCredentials.tsx`)
  * Endorsement Form Component (`components/users/reputation/EndorsementForm.tsx`)
  * Reputation Activity Component (`components/users/reputation/ReputationActivity.tsx`)
  * Credential Form Component (`components/users/reputation/CredentialForm.tsx`)

* **API Endpoints:**
  * User Reputation Profile (`/api/users/[userId]/reputation/index.ts`)
  * User Badges Management (`/api/users/[userId]/reputation/badges.ts`)
  * User Endorsements Management (`/api/users/[userId]/reputation/endorsements.ts`)
  * User Credentials Management (`/api/users/[userId]/reputation/credentials.ts`)
  * Admin Analytics: Summary (`/api/admin/analytics/reputation/summary.ts`)
  * Admin Analytics: Trends (`/api/admin/analytics/reputation/trends.ts`)
  * Admin Analytics: Distribution (`/api/admin/analytics/reputation/distribution.ts`)

* **Analytics Integration:**
  * Reputation Analytics Dashboard (`components/admin/ReputationAnalyticsDashboard.tsx`)
  * Vercel Analytics & Speed Insights integration for performance tracking
  * Period-based data analysis (24h, 7d, 30d, 90d)
  * Visualization of reputation metrics and trends

* **Features:**
  * Reputation points system for user activities
  * User trust levels with ascending privileges
  * Badge system with categories (Contributor, Knowledge, Community)
  * User skill endorsements
  * Professional credential verification
  * Activity tracking and history
  * Analytics dashboard for administrators

## Architectural Style

*   **Microservices (Potential):** The presence of a separate Express API server suggests that the application may be using a microservices architecture, or planning to in the future.
*   **RESTful API:** The backend servers expose a RESTful API for the frontend to consume.

## Data Flow

1.  **User Interaction:** The user interacts with the frontend (Next.js application).
2.  **API Request:** The frontend makes requests to the backend API (Express.js) or the Express API server.
3.  **Business Logic:** The backend server handles the business logic and may:
    *   Interact with the database (PostgreSQL).
    *   Interact with Redis for caching, session management, real-time communication, queues, rate limiting, leaderboards, geospatial data or other purposes.
    *   Interact with third-party services.
    *   Consult the chatbot.
4.  **Response:** The backend server sends a response back to the frontend.
5.  **Display:** The frontend renders the data in the UI.

## User Roles and Access

*   **Guest:** Unauthenticated users with limited access to public content. They have access to the Guest homepage.
*   **Buyer:** Registered users who can purchase products and participate in the community. They have access to the user homepage, to the marketplace and can use the chatbot.
*   **Seller:** Registered users who can list and sell products and have all Buyer privileges. They can switch between Buyer and Seller modes. They have access to the user homepage and can use the chatbot.
*   **AgriSmart Moderator:** Users with elevated privileges to manage accounts, content, and interactions. They have access to the user homepage and can use the chatbot.
*   **AgriSmart Admin:** Superusers with full control over the application. They have access to the user homepage and can use the chatbot.

## Core Features

*   **Authentication:** User registration, login, social login, mobile authentication, password management, role management.
*   **Community:** Forums, groups, user profiles, posting, commenting, reacting, trending topics.
*   **Marketplace:** Product listings, search, ordering, payments, shipping.
*   **Resources:** Articles, guides, videos, glossary.
*   **Reporting:** User reporting and admin reporting with analytics.
*   **Real-Time Chat:** A real-time chat to communicate with other users.
*   **Notifications:** Push notifications.
*   **Dynamic Homepages:** A personalized dashboard for each user and a landing page for guests.
*   **Chatbot:** An AI to help the user.

## User Interface Components

*   **Top Navbar:** Dropdown menu for navigation (User Homepage, Marketplace, Community, Resources, About, Contact).
*   **Sidebar:** Premium sidebar (Profile, Settings, Mode Switching, Logout).

## User Homepage Content

*   **Weather API:** The user homepage will display the current weather.
*   **Marketplace Trends:** The user homepage will display a chart or visualization of the latest trends in the AgriSmart marketplace.
*   **Agriculture News:** The user homepage will display the latest news about agriculture.

## Data Analytics System

The AgriSmart platform incorporates a comprehensive analytics system to track user interactions and provide valuable insights:

* **Event Tracking:** Custom event tracking system built on Prisma ORM that logs user actions such as:
  * Page views
  * Post creation and interaction
  * Group join/leave actions
  * Product views and purchases
  * Search queries

* **Analytics Dashboard:**
  * Real-time visualization of platform metrics
  * Interactive charts for engagement data
  * Customizable time period filters
  * Export functionality for reports (CSV, Excel)

* **Testing Infrastructure:**
  * Dedicated test script for verifying analytics functionality
  * Mock implementations for isolated testing without affecting production
  * Comprehensive test cases for all event types
  * Detailed logging for debugging and verification

* **Technical Implementation:**
  * Direct integration with Prisma ORM for database operations
  * Error handling to prevent analytics failures from affecting user experience
  * TypeScript interfaces for type safety and documentation
  * Object parameter pattern for flexible, maintainable API design

## Marketplace System

The AgriSmart platform includes a comprehensive marketplace system allowing users to buy and sell agricultural products:

* **Product Management:**
  * Product listing with detailed information (name, description, price, condition)
  * Category-based organization
  * Image upload and management
  * Location-based product listings using geolocation

* **User Interfaces:**
  * Marketplace homepage with search and filtering
  * Product detail pages with seller information
  * Product creation and editing forms
  * Checkout process with shipping and payment information

* **Order System:**
  * Order creation and management
  * Order status tracking (pending, confirmed, shipped, delivered, cancelled)
  * Payment processing options (credit card, bank transfer, cash on delivery)
  * Shipping information management
  * Order history with filtering by status
  * Detailed order view with tracking information

* **Reviews and Ratings System:**
  * Product ratings (1-5 stars) with statistical summaries
  * Detailed text reviews with optional titles and images
  * Buyer verification (only verified buyers can leave reviews)
  * Helpful/Not Helpful voting on reviews
  * Seller responses to reviews
  * Order-based review submission to ensure authentic feedback
  * Review moderation capabilities
  * Review sorting options (newest, highest/lowest rated, most helpful)

* **Chat System:**
  * Real-time messaging between buyers and sellers
  * Conversation history and management
  * WebSocket-based communication using Socket.IO
  * Conversation list with unread indicators
  * Message notifications
  * Integration with marketplace products and orders

* **Seller Dashboard:**
  * Comprehensive sales analytics with interactive charts
  * Sales performance visualization by time period (7 days, 30 days, 90 days, yearly)
  * Recent orders tracking and management
  * Top products analysis
  * Average order value and sales metrics
  * Data export capabilities

* **Moderation System:**
  * AI-assisted content quality assessment
  * Bulk moderation capabilities for efficient content processing
  * Comprehensive notification system for moderation actions
  * Detailed moderation logs for audit purposes
  * Moderation analytics dashboard with performance metrics
  * Vercel SDK integration for analytics tracking
  * Moderation Appeal System with database schema implementation

* **Moderation Appeal System:**
  * Appeal database schema with proper relation naming
  * Connection to User model for both appellants and moderators
  * Categorization of appeals with customizable types
  * Status tracking for appeal workflow
  * Support for evidence attachments
  * Appeal history tracking for audit purposes
  * Proper database indexing for query optimization
  * Integration with notification system for status updates

* **Comment Moderation System (Planned):**
  * AI-assisted comment analysis for sentiment, toxicity, and spam detection
  * User-facing comment reporting and flagging system
  * Dedicated comment moderation dashboard for efficient review
  * Bulk moderation capabilities for comment management
  * Comment quality enhancement suggestions
  * Integration with existing AI moderation infrastructure
  * Performance-optimized implementation using Fluid Compute patterns
  * Comprehensive analytics for comment moderation activities

* **Vercel SDK Integration:**
  * Image optimization utilities for improved performance
  * Edge caching configuration for faster content delivery
  * Analytics API integration for detailed performance tracking
  * Visualization components using Recharts (recommended by Vercel)
  * Global analytics tracking across the application
  * Speed Insights for Core Web Vitals monitoring
  * API endpoints enhanced with Vercel Analytics data
  * Comprehensive analytics dashboard for moderation activities

* **API Structure:**
  * RESTful endpoints for products, orders, and categories
  * WebSocket endpoints for real-time chat
  * Analytics API for seller dashboard data
  * Authentication and authorization for secure transactions
  * Validation using Zod schema
  * Proper error handling and response formatting
  * Moderation analytics endpoints leveraging Vercel Analytics API

* **Components:**
  * Reusable UI components (ProductCard, LocationPicker, ImageUpload)
  * Form components with validation (ShippingForm, PaymentForm)
  * Status indicators (OrderStatusBadge)
  * Search and filter components
  * Order history and tracking components
  * Chat interface components (ChatContainer, ChatConversationList, ChatMessageList)
  * Dashboard analytics components (SellerSalesChart, TopProductsChart, SellerOrdersTable)
  * Analytics visualization components:
    * StatCard for displaying key performance metrics with change indicators
    * VercelChart for line, bar, and pie chart visualizations
    * Period selection component for flexible time range analysis
  * Moderation dashboard components for resource analysis and monitoring
  * Global provider components for Vercel Analytics integration

* **Utilities and Hooks:**
  * Custom React hook (useMarketplace) for managing marketplace data
  * Custom React hook (useMarketplaceChat) for managing chat functionality
  * Socket service for WebSocket connection management
  * Utility functions for formatting prices, dates, and distances
  * Geolocation utilities for distance calculations
  * Product status styling configuration
  * Breadcrumb navigation helpers
  * Vercel Analytics API utilities for performance tracking
  * Moderation analytics utilities for aggregating moderation data

## Key Considerations

*   **Scalability:** The architecture should be designed to scale to handle a large number of users and requests.
*   **Security:** Security must be a priority at every level, from authentication and authorization to data encryption and input validation.
*   **Maintainability:** The code should be well-organized, well-documented, and easy to maintain.
*   **Testing:** Each part of the system must have good test coverage.
*   **Chatbot:** The chatbot must be able to understand the user intents and provide relevant data.

## Chosen Technologies

*   **Database:** The project will use **PostgreSQL** as its database.
*   **State Management:** The project will use **Zustand** for its state management.
*   **Redis:** The project will use Redis for multiple use-cases (caching, session management, real-time chat, queues, rate-limiting, leaderboards, geospatial data and temporary data).

## Development Tools

To boost development speed and efficiency, the following tools will be integrated:

*   **Testmail:** For testing email functionality.
*   **Travis CI:** For continuous integration and automated testing.
*   **Sentry:** For error tracking and monitoring.
*   **Notion:** For project management, documentation, and team communication.
*   **Termius**: Useful for managing servers during development and production.
* **New Relic**: Essential for monitoring the backend and frontend in production.
* **Datadog**: Useful for a deeper look at performance, especially for infrastructure.
* **Carto**: If needed, to add location-based services, and to analyze geospatial data.

## Related Information

*   [[Architecture Decisions]]
*   [[Implementation-Checklist]]
*   [[db-comparison]]
*   [[Project-Roadmap]]
*   [[Authentication]]
*   [[Application/Requirements/User-Roles|User Roles]]
*   [[Memory Bank/Concepts/Data-Fetching|Data-Fetching]]
*   [[Memory Bank/Concepts/State-Management|State-Management]]
*   [[Daily/]]
*   [[Meeting Notes/]]
* [[Obsidian Vault]]

### Moderation Appeal System

The Moderation Appeal System enables users to challenge content moderation decisions and allows moderators to review these appeals. The system consists of several components:

1. **Appeal Submission Form**:
   - Located in `components/moderation/AppealSubmissionForm.tsx`
   - Allows users to submit appeals for their moderated comments
   - Validates input using Zod schema
   - Provides user feedback on submission status
   - Handles rate limiting and error management

2. **Appeal Review Interface**:
   - Components:
     - `components/admin/moderation/AppealReviewCard.tsx`: Detailed view of individual appeals
     - `components/admin/moderation/AppealsList.tsx`: List of appeals with filtering and pagination
     - `app/admin/moderation/appeals/page.tsx`: Admin dashboard page for appeals management
   - Features:
     - Status-based filtering (pending, approved, rejected)
     - Search functionality across appeal content
     - Pagination for large appeal volumes
     - Detailed view with comment content and user information
     - Approval/rejection with moderator notes

3. **Backend Logic**:
   - Located in `lib/moderation/appeals.ts`
   - Handles appeal submission validation
   - Processes appeals approval/rejection
   - Manages notifications to users and moderators
   - Tracks appeal statistics for analytics

4. **API Endpoints**:
   - `/api/comments/appeal`: Submission endpoint for users
   - `/api/admin/appeals`: Admin endpoint for listing and filtering appeals
   - `/api/admin/appeals/counts`: Provides counts by status
   - `/api/admin/appeals/[appealId]/approve`: Approves an appeal and restores content
   - `/api/admin/appeals/[appealId]/reject`: Rejects an appeal and maintains moderation
   - `/api/user/appeals/notifications`: Retrieves appeal notifications for the authenticated user
   - `/api/user/appeals/notifications/[notificationId]/read`: Marks a notification as read

5. **Database Model**:
   - `ModerationAppeal` model in Prisma schema
   - Relations to User and Comment models
   - Status tracking (PENDING, APPROVED, REJECTED)
   - Timestamps for submission and review
   - Storage for appeal reason and moderator notes
   - `ModerationAppealNotification` model for tracking user notifications

6. **Appeal Notification System**:
   - Components:
     - `components/moderation/AppealStatusNotification.tsx`: Displays individual appeal notifications
     - `components/moderation/UserAppealsNotifications.tsx`: List view for appeal notifications
   - Features:
     - Real-time notifications for appeal status changes
     - Status-based styling (pending, approved, rejected)
     - Read/unread status tracking
     - Integration with Vercel Notification Service
   - Backend Logic:
     - `createAppealStatusNotification`: Creates notifications in the database
     - `markAppealNotificationsAsRead`: Marks notifications as read
     - Integration with appeal lifecycle (submission, approval, rejection)

The system provides a fair and transparent process for users to appeal moderation decisions while giving moderators the tools to efficiently review and respond to these appeals. The addition of the notification system ensures users are promptly informed about the status of their appeals, enhancing the overall user experience and engagement with the moderation process.
