# AgriSmart Installation Guide

## Required Tools
1. [Bun](https://bun.sh/) (v1.0.0 or higher)
2. [Docker](https://www.docker.com/) & Docker Compose
3. [Git](https://git-scm.com/)
4. [kubectl](https://kubernetes.io/docs/tasks/tools/) (for production)

## Local Development Setup

### 1. Clone Repository
```bash
git clone https://github.com/agrismart/agrismart.git
cd agrismart
```

### 2. Install Dependencies
```bash
bun install
```

### 3. Environment Variables
Create `.env` file in project root. Below is a list of all required environment variables and their usage:

```bash
# Application Configuration
NODE_ENV=development
# Used in: app/config/env.ts
# Purpose: Determines application environment

APP_URL=http://localhost:3000
# Used in: lib/config/constants.ts
# Purpose: Frontend application URL for redirects and API calls

API_URL=http://localhost:3000/api
# Used in: lib/api/client.ts
# Purpose: Base URL for API requests

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/agrismart
# Used in: prisma/schema.prisma, lib/db/client.ts
# Purpose: PostgreSQL connection string for Prisma ORM

# Redis Configuration
REDIS_URL=redis://localhost:6379
# Used in: lib/cache/redis.ts
# Purpose: Redis connection for caching and session storage

# Authentication
JWT_SECRET=your-secure-jwt-secret
# Used in: lib/auth/jwt.ts
# Purpose: Signing and verifying JWT tokens

REFRESH_TOKEN_SECRET=your-secure-refresh-token-secret
# Used in: lib/auth/jwt.ts
# Purpose: Signing and verifying refresh tokens

# AWS S3 Storage
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_BUCKET_NAME=your-bucket-name
# Used in: lib/storage/s3.ts
# Purpose: File storage and CDN delivery

# Stripe Payment
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
# Used in: lib/payment/stripe.ts
# Purpose: Payment processing and webhooks

# Email Service
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
EMAIL_FROM=noreply@agrismart.com
# Used in: lib/email/service.ts
# Purpose: Transactional emails and notifications

# Monitoring
SENTRY_DSN=https://your-sentry-dsn
# Used in: lib/monitoring/sentry.ts
# Purpose: Error tracking and monitoring

# Security
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
# Used in: middleware.ts
# Purpose: API rate limiting

# Feature Flags
ENABLE_MARKETPLACE=true
ENABLE_ANALYTICS=true
# Used in: lib/config/features.ts
# Purpose: Feature toggling
```

### 4. Start Development Services
```bash
# Start PostgreSQL and Redis
docker-compose up -d

# Run database migrations
bun prisma migrate dev

# Seed database (optional)
bun prisma db seed
```

### 5. Start Development Server
```bash
# Run in development mode
bun run dev

# Run with turbo
bun run dev:turbo
```

## Available Scripts

```bash
# Development
bun run dev          # Start development server
bun run build       # Build production bundle
bun run start       # Start production server
bun run lint        # Run ESLint
bun run type-check  # Run TypeScript checks

# Testing
bun run test        # Run unit tests
bun run test:e2e    # Run E2E tests
bun run test:ci     # Run all tests in CI mode

# Database
bun prisma generate # Generate Prisma client
bun prisma migrate  # Run migrations
bun prisma studio   # Open Prisma Studio

# Docker
docker-compose up    # Start all services
docker-compose down  # Stop all services
```

## Development Workflow

1. Create feature branch:
```bash
git checkout -b feature/your-feature
```

2. Make changes and test:
```bash
bun run test
bun run lint
```

3. Commit changes:
```bash
git add .
git commit -m "feat: your feature description"
```

4. Push and create PR:
```bash
git push origin feature/your-feature
```

## Troubleshooting

### Database Issues
```bash
# Reset database
bun prisma migrate reset

# Clear Redis cache
docker-compose exec redis redis-cli FLUSHALL
```

### Development Server Issues
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules
bun install
```

### Environment Variables
Make sure all required environment variables are set. Check:
1. `.env` file exists in root
2. All required variables are set
3. No trailing spaces in values

## Additional Resources

- Documentation: `/docs` directory
- API Documentation: `/docs/api`
- Component Storybook: `bun run storybook`
- Database Schema: `/prisma/schema.prisma`

## Support

- Technical Issues: Create GitHub issue
- Questions: Discuss in GitHub discussions
- Security: security@agrismart.com