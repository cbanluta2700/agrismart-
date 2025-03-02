# AgriSmart Platform Demo

This document provides instructions for running a demonstration of the AgriSmart platform with mock data.

## Setup

1. Run the setup script:
   ```
   node scripts/setup-demo.js
   ```

2. Generate mock data:
   ```
   npm run generate-mock-data
   ```

3. Start the mock API server:
   ```
   npm run start-mock-api
   ```

   Or run both steps 2 and 3 together:
   ```
   npm run demo
   ```

4. In a separate terminal, start the Next.js application:
   ```
   npm run dev
   ```

## Demo Pages

### Database Dashboard
- **URL**: http://localhost:3000/admin/database
- **Description**: Overview of database health, metrics, and access to migration tools

### Migration Control Page
- **URL**: http://localhost:3000/admin/database/migrate
- **Description**: Interface for managing and monitoring the migration of conversations from Vercel KV to MongoDB
- **Demo Features**:
  - Start migration with configurable parameters
  - Monitor real-time progress with live logs
  - View error summaries and failed conversations
  - Retry failed conversations
  - Cancel in-progress migrations

### MongoDB Connection Pooling
- Implemented in the backend with the following configuration:
  - maxPoolSize: 10 connections
  - minPoolSize: 5 connections  
  - maxIdleTimeMS: 30000 ms (connections auto-closed after 30s of inactivity)
  - connectTimeoutMS: 5000 ms
  - socketTimeoutMS: 30000 ms

### Database Performance Monitoring
- View real-time metrics on database operations
- Monitor connection health for all database systems
- Track slow queries and response times

## Interactive Demo Scenarios

1. **Start a Database Migration**:
   - Navigate to the Migration Control Page
   - Configure batch size and other options
   - Click "Start Migration"
   - Watch the real-time progress and logs

2. **Handle Migration Errors**:
   - If a migration fails, view the error summary
   - Click "Retry Failed Conversations" to attempt recovery
   - Monitor the retry progress

3. **Cancel a Migration**:
   - During an active migration, click "Cancel Migration"
   - Observe the cancellation process and final state

4. **View Database Metrics**:
   - Navigate to the Database Dashboard
   - Check connection health for MongoDB and PostgreSQL
   - Review operation counts and slow queries

## Implementation Notes

This demo uses mock data to simulate the behavior of the database migration system. In a production environment, the system would interact with actual Vercel KV and MongoDB instances.

The mock API server simulates the following endpoints:
- `/api/admin/migration-status`: Get current migration status
- `/api/admin/start-migration`: Start a new migration
- `/api/admin/cancel-migration`: Cancel an in-progress migration
- `/api/admin/retry-failed-conversations`: Retry previously failed conversations
- `/api/admin/database-metrics`: Get database performance metrics
- `/api/admin/database-status`: Get database connection status
