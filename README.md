# AgriSmart Platform

## Component Architecture

### Client Components
All interactive components are properly marked with `'use client'` and organized in dedicated wrappers:

- `components/ui/brand-logo.tsx` - Logo component with proper client-side rendering
- `components/ui/button-wrapper.tsx` - Event handler wrapper for buttons
- `components/ui/dialog-wrapper.tsx` - Modal dialog wrapper
- `components/ui/menu-wrapper.tsx` - Dropdown menu wrapper

### Providers
Client-side providers are properly isolated:

- `components/providers/auth-provider.tsx` - Authentication context provider
- `components/providers/theme-provider.tsx` - Theme management provider

### Server/Client Component Guidelines

1. Use Client Components for:
   - Interactive UI elements (buttons, forms, etc.)
   - Components that use browser APIs
   - Components that use React hooks
   - Event handlers

2. Use Server Components for:
   - Static UI elements
   - Data fetching
   - Access to backend resources
   - Static route handling

3. Component Boundaries:
   - Keep interactive logic in client components
   - Pass static props through server components
   - Use wrappers for common interactive patterns

## Development

```bash
# Install dependencies
npm install

# Set up MongoDB (required for chat functionality)
# Ensure MongoDB is running locally or update .env with MongoDB URI

# Run development server
npm run dev

# Build for production
npm run build

## Hybrid Database Architecture

AgriSmart implements a hybrid database architecture to optimize for different data access patterns:

### PostgreSQL (via Prisma)
- User identity and authentication
- Farm data and profiles
- Community content
- Analytics and metrics

### MongoDB
- Chat conversations and messages
- High volume, append-heavy data
- Optimized with connection pooling for performance
- Independent scaling from the main database

### Setup Requirements
1. Configure PostgreSQL connection in `.env`
2. Configure MongoDB connection in `.env`:
   ```
   MONGODB_URI=mongodb://localhost:27017
   MONGODB_DB_NAME=agrismart_chat
   ```
3. Run database migrations:
   ```
   npx prisma migrate dev
   ```
4. For migrating existing chat data from Vercel KV:
   ```
   node scripts/migrate-kv-to-mongodb.js
   ```

### Monitoring
AgriSmart includes database performance monitoring tools:

- API endpoint: `/api/admin/database-metrics` - Performance metrics for MongoDB and PostgreSQL operations
- API endpoint: `/api/admin/database-status` - Connection health monitoring
- Connection statistics via `lib/chat/mongodb.ts`
- Performance tracking via `lib/monitoring/database-performance.js`

## Testing

```bash
# Run tests
npm run test

# Database-specific tests
node scripts/test-mongodb.js
node scripts/test-chat-api.js
node scripts/load-test-mongodb.js
node scripts/test-monitoring.js
```

## Database Architecture

AgriSmart utilizes a hybrid database architecture:

1. **PostgreSQL** (via Prisma):
   - User identity and authentication
   - Product and marketplace data
   - Analytics and usage metrics
   - Relational data with complex relationships

2. **MongoDB**:
   - Chat messages and conversations
   - High-volume append-heavy data
   - Document-based flexible schema

This hybrid approach allows the platform to scale different components independently based on their specific requirements and access patterns.

## Testing Credentials

For development testing:

```
Email: test@example.com
Password: password123
```

## Important Notes

1. All components in `/components/ui` that require interactivity should be marked with `'use client'`
2. Use wrapper components for common interactive patterns
3. Keep server components lean and focused on data fetching
4. Use proper client boundaries to prevent hydration mismatches
5. Clear browser cache and restart dev server if you encounter rendering issues