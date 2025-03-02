import { Configuration, OpenAIApi } from 'openai';
import { ResourceType } from '@prisma/client';
import { prisma } from '@/lib/prisma';

// Configure OpenAI API
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

/**
 * Interface for content quality assessment result
 */
export interface ContentQualityAssessment {
  qualityScore: number; // 0-100 score
  flags: ContentFlag[];
  suggestions: string[];
  details: {
    accuracy: number; // 0-10 score
    relevance: number; // 0-10 score
    completeness: number; // 0-10 score
    clarity: number; // 0-10 score
    formatting: number; // 0-10 score
  };
  originalContent: string;
  resourceId: string;
  resourceType: ResourceType;
}

/**
 * Interface for content quality flag
 */
export interface ContentFlag {
  type: 'spam' | 'harmful' | 'misleading' | 'low-quality' | 'irrelevant' | 'plagiarism';
  confidence: number; // 0-1 confidence score
  details: string;
}

/**
 * Threshold for automatic flagging
 */
const AUTO_FLAG_THRESHOLD = 50; // Quality score below 50 gets flagged automatically

/**
 * Analyze content quality using OpenAI API
 */
export async function analyzeContentQuality(
  content: string,
  resourceId: string,
  resourceType: ResourceType,
  context?: {
    category?: string;
    title?: string;
    tags?: string[];
  }
): Promise<ContentQualityAssessment> {
  try {
    // Validate content
    if (!content || content.trim().length === 0) {
      return createLowQualityResult('Empty content', resourceId, resourceType, content);
    }

    // Create prompt for OpenAI with context
    const prompt = generatePrompt(content, resourceType, context);

    // Call OpenAI API
    const response = await openai.createChatCompletion({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an expert content quality analyst for an agricultural platform. Analyze content quality and provide a structured assessment."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.2,
      max_tokens: 1000,
    });

    // Parse the response
    const result = parseAIResponse(response.data.choices[0].message?.content || '');
    
    // Add resource metadata
    result.resourceId = resourceId;
    result.resourceType = resourceType;
    result.originalContent = content;
    
    // Save assessment to database
    await saveContentAssessment(result);
    
    return result;
  } catch (error) {
    console.error('Content quality analysis failed:', error);
    
    // Return a default assessment for error cases
    return {
      qualityScore: 0,
      flags: [{
        type: 'low-quality',
        confidence: 1,
        details: 'Error analyzing content: ' + (error.message || 'Unknown error')
      }],
      suggestions: ['Please try again or contact an administrator.'],
      details: {
        accuracy: 0,
        relevance: 0,
        completeness: 0,
        clarity: 0,
        formatting: 0
      },
      originalContent: content,
      resourceId,
      resourceType
    };
  }
}

/**
 * Generate prompt for OpenAI based on content and context
 */
function generatePrompt(
  content: string,
  resourceType: ResourceType,
  context?: { category?: string; title?: string; tags?: string[] }
): string {
  const contextInfo = context 
    ? `
      Content Title: ${context.title || 'Not provided'}
      Content Category: ${context.category || 'Not provided'}
      Content Tags: ${context.tags?.join(', ') || 'None'}
    ` 
    : '';

  return `
    Please analyze the following ${resourceType.toLowerCase()} content for quality and provide a structured assessment.
    ${contextInfo}
    
    Content to analyze:
    """
    ${content}
    """
    
    Provide your assessment in the following JSON format:
    {
      "qualityScore": <0-100 overall quality score>,
      "flags": [
        {
          "type": "<flag type: spam|harmful|misleading|low-quality|irrelevant|plagiarism>",
          "confidence": <0-1 confidence score>,
          "details": "<explanation of the flag>"
        }
      ],
      "suggestions": [
        "<suggestion 1>",
        "<suggestion 2>"
      ],
      "details": {
        "accuracy": <0-10 score>,
        "relevance": <0-10 score>,
        "completeness": <0-10 score>,
        "clarity": <0-10 score>,
        "formatting": <0-10 score>
      }
    }
  `;
}

/**
 * Parse AI response to structured format
 */
function parseAIResponse(response: string): ContentQualityAssessment {
  try {
    // Extract JSON from response (handling potential text before/after JSON)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? jsonMatch[0] : '{}';
    
    const parsed = JSON.parse(jsonString);
    
    // Validate and ensure all fields exist
    return {
      qualityScore: typeof parsed.qualityScore === 'number' ? parsed.qualityScore : 0,
      flags: Array.isArray(parsed.flags) ? parsed.flags : [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      details: {
        accuracy: typeof parsed.details?.accuracy === 'number' ? parsed.details.accuracy : 0,
        relevance: typeof parsed.details?.relevance === 'number' ? parsed.details.relevance : 0,
        completeness: typeof parsed.details?.completeness === 'number' ? parsed.details.completeness : 0,
        clarity: typeof parsed.details?.clarity === 'number' ? parsed.details.clarity : 0,
        formatting: typeof parsed.details?.formatting === 'number' ? parsed.details.formatting : 0,
      },
      originalContent: '',
      resourceId: '',
      resourceType: ResourceType.ARTICLE,
    };
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    
    // Return default assessment for parsing errors
    return {
      qualityScore: 0,
      flags: [{
        type: 'low-quality',
        confidence: 1,
        details: 'Failed to analyze content: Invalid response format'
      }],
      suggestions: ['Please try again or contact an administrator.'],
      details: {
        accuracy: 0,
        relevance: 0,
        completeness: 0,
        clarity: 0,
        formatting: 0
      },
      originalContent: '',
      resourceId: '',
      resourceType: ResourceType.ARTICLE
    };
  }
}

/**
 * Create a low quality result for edge cases
 */
function createLowQualityResult(
  reason: string,
  resourceId: string,
  resourceType: ResourceType,
  content: string
): ContentQualityAssessment {
  return {
    qualityScore: 0,
    flags: [{
      type: 'low-quality',
      confidence: 1,
      details: reason
    }],
    suggestions: ['Please provide more substantial content.'],
    details: {
      accuracy: 0,
      relevance: 0,
      completeness: 0,
      clarity: 0,
      formatting: 0
    },
    originalContent: content,
    resourceId,
    resourceType
  };
}

/**
 * Save content assessment to database
 */
async function saveContentAssessment(assessment: ContentQualityAssessment): Promise<void> {
  try {
    await prisma.contentQualityAssessment.create({
      data: {
        resourceId: assessment.resourceId,
        qualityScore: assessment.qualityScore,
        flags: assessment.flags,
        suggestions: assessment.suggestions,
        details: assessment.details,
        automaticallyFlagged: assessment.qualityScore < AUTO_FLAG_THRESHOLD
      },
    });
    
    // If quality is below threshold, update resource to flag it for review
    if (assessment.qualityScore < AUTO_FLAG_THRESHOLD) {
      await prisma.resource.update({
        where: { id: assessment.resourceId },
        data: {
          flaggedForReview: true,
          flagReason: `Low quality score (${assessment.qualityScore}/100). AI assessment flagged this content.`
        },
      });
    }
  } catch (error) {
    console.error('Failed to save content assessment:', error);
    // Don't throw error to avoid disrupting the main flow
  }
}

/**
 * Get content quality assessments for a resource
 */
export async function getContentQualityAssessments(resourceId: string) {
  return prisma.contentQualityAssessment.findMany({
    where: { resourceId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get flagged resources requiring moderator review
 */
export async function getFlaggedResources(options?: {
  limit?: number;
  offset?: number;
  types?: ResourceType[];
}) {
  const { limit = 20, offset = 0, types } = options || {};
  
  const where: any = {
    flaggedForReview: true,
  };
  
  if (types && types.length > 0) {
    where.type = { in: types };
  }
  
  const resources = await prisma.resource.findMany({
    where,
    select: {
      id: true,
      title: true,
      type: true,
      createdAt: true,
      updatedAt: true,
      status: true,
      flagReason: true,
      authorId: true,
      author: {
        select: {
          name: true,
          email: true,
        },
      },
      contentQualityAssessments: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { updatedAt: 'desc' },
    take: limit,
    skip: offset,
  });
  
  const total = await prisma.resource.count({ where });
  
  return {
    resources,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + resources.length < total,
    },
  };
}

/**
 * Update resource with moderator quality assessment feedback
 */
export async function updateQualityAssessmentFeedback(
  resourceId: string,
  moderatorId: string,
  feedback: {
    moderatorNotes: string;
    actionTaken: 'approved' | 'rejected' | 'improvements_requested';
    overrideQualityScore?: number;
  }
) {
  const { moderatorNotes, actionTaken, overrideQualityScore } = feedback;
  
  // Update the latest assessment with moderator feedback
  const latestAssessment = await prisma.contentQualityAssessment.findFirst({
    where: { resourceId },
    orderBy: { createdAt: 'desc' },
  });
  
  if (latestAssessment) {
    await prisma.contentQualityAssessment.update({
      where: { id: latestAssessment.id },
      data: {
        moderatorId,
        moderatorNotes,
        moderatorActionTaken: actionTaken,
        moderatorReviewedAt: new Date(),
        overrideQualityScore,
      },
    });
  }
  
  // Update the resource status based on action taken
  let resourceStatus;
  switch (actionTaken) {
    case 'approved':
      resourceStatus = 'PUBLISHED';
      break;
    case 'rejected':
      resourceStatus = 'REJECTED';
      break;
    case 'improvements_requested':
      resourceStatus = 'NEEDS_REVISION';
      break;
  }
  
  await prisma.resource.update({
    where: { id: resourceId },
    data: {
      flaggedForReview: actionTaken === 'improvements_requested',
      flagReason: actionTaken === 'improvements_requested' ? moderatorNotes : null,
      status: resourceStatus,
    },
  });
  
  // Create moderation log entry
  await prisma.resourceModerationLog.create({
    data: {
      resourceId,
      moderatorId,
      action: actionTaken === 'approved' ? 'approve' : actionTaken === 'rejected' ? 'reject' : 'request_changes',
      reason: moderatorNotes,
      previousStatus: 'PENDING_REVIEW',
      qualityAssessmentId: latestAssessment?.id,
    },
  });
  
  return { success: true };
}
