# AI Moderation System Guide

This guide provides an overview of the AI-powered content moderation system integrated into the AgriSmart platform using the Vercel AI SDK.

## Overview

The AI moderation system provides automatic screening of user-generated content to ensure it adheres to community guidelines. It works by:

1. Automatically screening content as it's created
2. Flagging potentially inappropriate content for review
3. Tracking moderation decisions for analytics and improvement
4. Providing tools for moderators to review and manage content

## Features

- **Pre-Generation Screening**: Prevents inappropriate content from being processed
- **Post-Generation Validation**: Ensures AI-generated content meets community guidelines
- **Real-Time Content Moderation**: Checks user content as it's submitted
- **Moderation Dashboard**: Comprehensive analytics and management tools
- **Configurable Sensitivity**: Adjustable thresholds for different types of content
- **Integration with Existing Workflows**: Works with the current moderation system

## Using the AI Moderation Hook

For frontend developers, we provide a React hook to easily integrate moderation into components:

```typescript
import { useAIModeration } from '@/lib/hooks/useAIModeration';

function MyCommentForm() {
  const { 
    checkContent, 
    isChecking, 
    lastResult,
    getMessageForFlag
  } = useAIModeration({
    contentType: 'comment',
    showToasts: true,
    onFlagged: (result) => {
      console.log('Content was flagged:', result);
    },
    onApproved: (result) => {
      console.log('Content was approved:', result);
    }
  });

  const handleSubmit = async (content) => {
    // Check content before submission
    const moderationResult = await checkContent(content);
    
    if (!moderationResult.flagged) {
      // Content passed moderation, proceed with submission
      await submitComment(content);
    } else {
      // Content was flagged, handle accordingly
      displayError(getMessageForFlag(moderationResult.flaggedCategories));
    }
  };
  
  return (
    // Your form implementation
  );
}
```

## Moderation Components

We also provide ready-to-use components for displaying moderation status:

```tsx
import { CommentModerationStatus } from '@/components/moderation/CommentModerationStatus';

function Comment({ comment }) {
  return (
    <div>
      <div className="comment-content">{comment.content}</div>
      <div className="comment-footer">
        <CommentModerationStatus
          commentId={comment.id}
          status={comment.moderationStatus}
          reason={comment.moderationReason}
          automated={comment.automatedModeration}
        />
      </div>
    </div>
  );
}
```

## API Endpoints

### Check Content for Moderation

```
POST /api/moderation/ai-check
```

**Request Body:**

```json
{
  "content": "The text content to check",
  "contentId": "optional-content-id",
  "contentType": "comment",
  "sensitivityLevel": 0.7,
  "categories": ["hate", "harassment", "sexual"]
}
```

**Response:**

```json
{
  "contentId": "comment:123",
  "flagged": false,
  "categories": {
    "hate": false,
    "harassment": false,
    "sexual": false,
    "self-harm": false,
    "violence": false
  },
  "categoryScores": {
    "hate": 0.01,
    "harassment": 0.02,
    "sexual": 0.01,
    "self-harm": 0.00,
    "violence": 0.01
  }
}
```

### Check Moderation Service Status

```
GET /api/moderation/ai-check
```

**Response:**

```json
{
  "status": "operational",
  "provider": "openai",
  "features": {
    "textModeration": true,
    "commentQueueing": true,
    "analyticsTracking": true
  }
}
```

## Configuration

The AI moderation system can be configured through environment variables:

```
# Enable/disable AI moderation
NEXT_PUBLIC_ENABLE_AI_MODERATION=true

# OpenAI API key for moderation
OPENAI_API_KEY=your-openai-api-key
OPENAI_API_ORGANIZATION=your-openai-org-id

# Moderation settings
AI_MODERATION_SENSITIVITY=0.7
AI_FALLBACK_TO_BASIC=true
AI_MAX_TOKENS=1000
AI_CACHE_DURATION=3600
```

## Moderation Dashboard

The AI moderation dashboard is available at `/admin/moderation/ai` for users with admin or moderator roles. It provides:

- Summary metrics of moderation activities
- Charts and graphs showing moderation trends
- Lists of recent moderation actions
- Filtering by date range and content type
- Performance metrics for the AI moderation system

## Troubleshooting

If you encounter issues with the AI moderation system:

1. Check the service status at `/api/moderation/ai-check` (GET request)
2. Verify that your environment variables are properly configured
3. Check server logs for any error messages
4. Ensure rate limits haven't been exceeded
5. Verify API keys are valid and have sufficient permission

## Best Practices

- Set an appropriate sensitivity level based on your community needs
- Regularly review moderation decisions to improve the system
- Implement an appeals process for users who believe their content was incorrectly flagged
- Use the dashboard to identify moderation trends and adjust policies as needed
- Combine AI moderation with human review for optimal results

## Technical Details

The AI moderation system is built on the Vercel AI SDK and integrates with OpenAI's moderation API. It includes:

- Edge-optimized middleware for performance
- Rate limiting to prevent abuse
- Caching for improved response times
- Analytics tracking for continuous improvement
- Fallback mechanisms for when AI services are unavailable

For more detailed technical information, refer to the API documentation or contact the platform administrators.
