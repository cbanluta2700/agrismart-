# Reputation System Documentation

## Overview

The AgriSmart Reputation System is a comprehensive trust and achievements framework designed to encourage positive user interactions, recognize valuable contributions, and establish trust within the community. This system tracks user activities, awards points, manages trust levels, and provides mechanisms for peer endorsements and professional credential verification.

## Core Components

### Database Models

The reputation system uses the following Prisma models:

- **ReputationActivity**: Tracks individual reputation-earning activities
- **UserBadge**: Maps badges earned by users
- **Badge**: Defines available badges and their requirements
- **UserEndorsement**: Tracks skill endorsements between users
- **UserCredential**: Manages professional credentials and their verification status

### Service Layer

The reputation service handles the business logic for:

- Adding and calculating reputation points
- Determining user trust levels
- Awarding badges based on achievements
- Managing skill endorsements and credential verification

### User-Facing Components

- **ReputationProfile**: Displays a user's overall reputation data
- **UserBadges**: Shows earned badges with categories and descriptions
- **EndorsementForm**: Allows users to endorse others' skills
- **UserCredentials**: Displays professional credentials with verification status
- **ReputationActivity**: Shows recent reputation-earning activities
- **CredentialForm**: Form for submitting new credentials for verification

### Admin Components

- **ReputationAnalyticsDashboard**: Comprehensive analytics for monitoring the reputation system

## Features

### Reputation Points System

Points are awarded for various user activities:

- Resource creation and upvotes
- Comment creation and upvotes
- Profile completion
- Daily visits
- Badge earnings
- Receiving endorsements
- Credential verification

Each activity has a defined point value and may include daily limits and cooldowns to prevent abuse.

### Trust Levels

Users progress through trust levels as they earn reputation points:

1. **New Member** (0-99 points): Basic privileges
2. **Regular** (100-499 points): Additional access rights
3. **Trusted** (500-1999 points): Enhanced privileges
4. **Veteran** (2000-4999 points): Advanced features access
5. **Expert** (5000+ points): Full platform privileges

Each level unlocks new features and capabilities on the platform.

### Badge System

Badges are categorized into:

- **Contributor**: Awarded for creating and contributing content
- **Knowledge**: Earned for demonstrating expertise and knowledge
- **Community**: Given for community engagement and interaction

Badges have specific criteria and are automatically awarded when requirements are met.

### Endorsement System

Users can endorse skills for other community members, helping to establish expertise in specific areas. Features include:

- Skill suggestions based on user activity
- Preventing self-endorsements
- Tracking endorsement counts per skill
- Awarding reputation points for receiving endorsements

### Credential Verification

The system allows users to submit professional credentials for verification:

1. User submits credential information (issuer, date, optional document URL)
2. Credential appears in profile as "Pending" verification
3. Administrators review and verify credentials
4. Verified credentials display a verification badge
5. Users earn reputation points for verified credentials

### Analytics Dashboard

The reputation analytics dashboard provides insights into:

- Total points awarded and distribution
- Active user metrics
- Badge awarding trends
- Trust level distribution
- Top users by reputation
- User activity levels

These analytics help administrators monitor engagement and identify trends.

## API Endpoints

### User-Facing Endpoints

- **GET/POST /api/users/[userId]/reputation**: Retrieve or update a user's reputation profile
- **GET/POST /api/users/[userId]/reputation/badges**: Manage user badges
- **GET/POST /api/users/[userId]/reputation/endorsements**: Manage skill endorsements
- **GET/POST/PUT/DELETE /api/users/[userId]/reputation/credentials**: Manage professional credentials

### Admin Endpoints

- **GET /api/admin/analytics/reputation/summary**: Get summary statistics
- **GET /api/admin/analytics/reputation/trends**: Get time-based trend data
- **GET /api/admin/analytics/reputation/distribution**: Get distribution metrics

## Vercel SDK Integration

The reputation system leverages Vercel SDK integration for:

- Performance monitoring via Vercel Analytics
- Response time optimization via Speed Insights
- Visualization components for analytics data
- Edge deployment for API endpoints

## Implementation Details

- Points are awarded immediately upon completing relevant activities
- Trust level calculations are performed on-the-fly when querying user data
- Badge checks run both on specific actions and via scheduled background jobs
- Endorsements are limited to prevent abuse (users cannot endorse themselves)
- Credential verification requires admin approval

## Future Enhancements

- Reputation decay for inactive users
- Advanced badge tiers (bronze, silver, gold)
- Community-based verification for certain credentials
- Gamification elements (streaks, challenges)
- Reputation leaderboards
