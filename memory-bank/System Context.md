# System Context

## AgriSmart Platform Overview

AgriSmart is a sustainable agriculture platform that enables farmers to manage their farms, share knowledge, and access agricultural expertise. The platform provides tools for crop management, soil analysis, weather monitoring, and community engagement.

## Tech Stack

- **Frontend**: Next.js, React, TailwindCSS
- **Backend**: Next.js API routes, Edge Functions
- **Authentication**: NextAuth with Google provider
- **Primary Database**: PostgreSQL (via Prisma ORM)
- **Secondary Database**: MongoDB (for chat data)
- **Caching**: Vercel KV (Redis)
- **Deployment**: Vercel Platform
- **AI Integration**: OpenAI API (ChatGPT)

## Core Components

### User Management
- Authentication via Google
- User profiles and farm management
- Permission system for different user roles

### Farm Management
- Farm registration and profile management
- Crop tracking and history
- Soil analysis and recommendations

### Community Features
- Discussion forums with moderation
- Knowledge sharing with voting system
- Expert consultation and advice

### Moderation System
- AI-assisted content moderation
- Reporting mechanism with user credibility
- Appeal process for moderation decisions

### Chat System
- AI-powered chat assistant (ChatGPT)
- Contextual responses based on user data
- Conversation history management
- Hybrid database architecture
  - MongoDB for conversation storage
  - PostgreSQL for user identity and analytics

## Database Architecture

AgriSmart uses a hybrid database architecture to optimize for different data access patterns:

### PostgreSQL (via Prisma)
- Used for user identity, authentication, and structured relational data
- Handles farm data, products, and marketplace functionality
- Manages community content and moderation
- Stores analytics and metrics via the ChatUsage model

### MongoDB
- Used for chat conversations and messages
- Optimized for high-volume, append-heavy data
- Configured with connection pooling for performance
- Connection Pool parameters:
  - maxPoolSize: 10 connections
  - minPoolSize: 5 connections
  - maxIdleTimeMS: 30000 ms
  - connectTimeoutMS: 5000 ms
  - socketTimeoutMS: 30000 ms

## Database Migration System

The platform includes a comprehensive database migration control system to facilitate the transition of chat conversations from Vercel KV to MongoDB. The system includes:

1. Migration Control Page (`app/admin/database/migrate/page.tsx`):
   - Admin interface for initiating and monitoring migrations
   - Real-time progress tracking with percentage and conversation counts
   - Live log viewer for monitoring the migration process
   - Migration cancellation capability
   - Error summary visualization with expandable details
   - Retry functionality for failed conversations

2. API Endpoints:
   - `/api/admin/migration-status.ts`: Reports current status and progress
   - `/api/admin/start-migration.ts`: Initiates the migration process
   - `/api/admin/cancel-migration.ts`: Cancels ongoing migrations
   - `/api/admin/retry-failed-conversations.ts`: Retries previously failed conversations
   - `/api/admin/shared/migration-state.ts`: Module for maintaining shared state across API routes

3. Migration Script (`scripts/migrate-kv-to-mongodb.js`):
   - Handles the actual data transfer process
   - Implements batched processing (50 conversations per batch)
   - Reports progress through child process communication
   - Validates data integrity during migration
   - Provides detailed error reporting and categorization

4. Mock Data System (for development and demonstration):
   - `scripts/generate-mock-data.js`: Generates realistic mock data for all aspects of the system
   - `scripts/mock-api-server.js`: Provides a mock implementation of all API endpoints
   - `scripts/setup-demo.js`: Sets up the demo environment with required dependencies
   - `middleware.js`: Routes API requests to the mock server in demo mode
   - Configuration via environment variables to enable/disable mock mode

The migration control system is integrated with the main admin dashboard and accessible via a dedicated navigation link in the sidebar under the Database section.

## Database Management and Migration System

### Overview
The Database Management and Migration System is designed to manage and monitor the migration of conversations from Vercel KV to MongoDB, as well as provide a comprehensive view of database health and performance.

### Data Migration Utilities

#### KV to MongoDB Migration Framework

The platform includes comprehensive utilities for migrating conversation data from Vercel KV to MongoDB:

1. **Migration Control Panel** (`app/admin/database/migrate/page.tsx`)
   - Administrative interface for initiating, monitoring, and managing database migrations
   - Real-time progress tracking with live migration logs
   - Error summary visualization with categorized error types
   - Interactive controls for canceling or retrying migrations
   - Failed conversation tracking with retry capabilities

2. **Migration APIs**
   - `/api/admin/migration-status.ts`: Reports current migration status and progress
   - `/api/admin/start-migration.ts`: Initiates the migration process
   - `/api/admin/cancel-migration.ts`: Cancels an in-progress migration
   - `/api/admin/retry-failed-conversations.ts`: Retries previously failed conversations
   - `/api/admin/shared/migration-state.ts`: Maintains shared state across API routes

3. **Migration Script** (`scripts/migrate-kv-to-mongodb.js`)
   - Node.js script that performs the actual data transfer
   - Implements batched processing for memory efficiency
   - Enhanced error handling with categorization and recovery options
   - Supports retry mechanism for previously failed conversations
   - Detailed progress reporting and logging

#### Database Administration Dashboard
- Path: `/app/admin/database/page.tsx`
- Purpose: Provides a comprehensive view of database health and performance
- Features:
  - MongoDB and PostgreSQL connection status monitoring
  - Performance metrics visualization
  - Pool statistics and connection management
  - Access to database migration tools

#### Load Testing
- Script: `/scripts/load-test-mongodb.js`
- Purpose: Test MongoDB performance under load
- Features:
  - Simulates multiple concurrent users
  - Creates conversations with varying message counts
  - Reports performance metrics

## Deployment Configuration

The AgriSmart platform is configured for deployment with the following architecture:

### Hosting Infrastructure
- **Application Hosting**: Vercel (Next.js optimized)
- **Database Hosting**:
  - MongoDB Atlas for conversation data
  - Supabase for PostgreSQL (user data, analytics)
- **Domain**: Free domain via GitHub Student Developer Pack

### Deployment Files
- **`scripts/deploy-db.js`**: Database migration script for deployment
- **`vercel.json`**: Vercel configuration including build settings
- **`DEPLOYMENT.md`**: Comprehensive deployment documentation
- **`.env.example`**: Environment variable template

### Environment Configuration
- Production environment variables stored in Vercel dashboard
- Development environment uses local `.env.local` file
- Mock API mode configured via environment variables

The deployment is optimized to use free resources available in the GitHub Student Developer Pack, including free database hosting and domain registration.

## Monitoring System

### Database Performance Monitoring
- Library: `/lib/monitoring/database-performance.js`
- Purpose: Track database operation performance
- Features:
  - Operation timing for MongoDB and PostgreSQL
  - Query tracking by collection/table
  - Slow query identification
  - Performance metrics aggregation

### Connection Health Monitoring
- Library: `/lib/monitoring/connection-status.js`
- Purpose: Monitor database connection health
- Features:
  - Connection status checking
  - Response time measurement
  - Error tracking and reporting
  - Automatic periodic health checks

### Admin API Endpoints
- `/api/admin/database-metrics.ts`: Performance metrics for MongoDB and PostgreSQL
- `/api/admin/database-status.ts`: Connection health monitoring and configuration

## API Structure

- `/api/auth/*`: Authentication endpoints
- `/api/farms/*`: Farm management
- `/api/community/*`: Forums and discussions
- `/api/moderation/*`: Content moderation
- `/api/chat/*`: Chat interface
  - `/api/chat/`: Chat completion endpoint
  - `/api/chat/conversations`: Conversation management

## Environment Configuration

The application uses multiple environment variables for configuration:

- Database connection strings (PostgreSQL, MongoDB)
- Authentication secrets and provider credentials
- OpenAI API keys
- Vercel KV configuration

## Deployment Strategy

- Continuous deployment via Vercel
- Staging environment for testing
- Production environment with automatic scaling
- Database backups and monitoring
