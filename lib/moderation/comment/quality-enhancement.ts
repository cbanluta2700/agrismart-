/**
 * Comment quality enhancement utilities for the AgriSmart platform
 * Provides advanced features for improving comment quality
 */

import { OpenAI } from 'openai';
import { createLogger } from '@/lib/utils/logger';
import { prisma } from '@/lib/prisma';
import { fluidCompute } from '@/lib/vercel/fluid-compute';
import { kv } from '@vercel/kv';
import { analyzeComment, type CommentAnalysisResult } from './analysis';

// Create a dedicated logger for comment quality enhancement
const logger = createLogger('comment.quality-enhancement');

// Configure OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// Quality enhancement result interface
export interface CommentQualityEnhancementResult {
  commentId: string;
  readabilityScore: number;
  readabilitySuggestions: string[];
  constructiveFeedback: string[];
  improvementPrompts: string[];
  engagementSuggestions: string[];
  contentEnrichment: ContentEnrichmentData;
  mlPrioritization: number;
  analysisTimestamp: string;
}

// Interface for content enrichment data
export interface ContentEnrichmentData {
  recommendedLinks?: string[];
  suggestedReferences?: string[];
  relevantTopics?: string[];
  additionalContext?: string;
}

/**
 * Cache key for comment quality enhancement results
 */
const getEnhancementCacheKey = (commentId: string) => `comment:quality-enhancement:${commentId}`;

/**
 * Generate quality enhancement suggestions for a comment
 * Uses analysis results to provide targeted improvements
 */
export const generateCommentEnhancements = fluidCompute(
  async (
    commentId: string,
    commentText: string,
    analysisResult?: CommentAnalysisResult,
    contextData?: Record<string, any>
  ): Promise<CommentQualityEnhancementResult> => {
    logger.info(`Generating quality enhancements for comment ${commentId}`, { 
      commentLength: commentText.length 
    });

    try {
      // Check cache first
      const cacheKey = getEnhancementCacheKey(commentId);
      const cachedResult = await kv.get<CommentQualityEnhancementResult>(cacheKey);
      
      if (cachedResult) {
        logger.debug(`Using cached quality enhancements for comment ${commentId}`);
        return cachedResult;
      }

      // Get or create analysis results if not provided
      let analysis = analysisResult;
      if (!analysis) {
        analysis = await analyzeComment(commentId, commentText);
      }

      // Perform AI enhancement generation
      const prompt = `
Analyze the following comment and provide detailed quality enhancement suggestions:

COMMENT: ${commentText}

ANALYSIS CONTEXT:
- Toxicity Score: ${analysis.toxicityScore}
- Sentiment Score: ${analysis.sentimentScore}
- Category Tags: ${analysis.categoryTags.join(', ')}
${contextData ? `\nADDITIONAL CONTEXT: ${JSON.stringify(contextData)}` : ''}

Please provide ALL of the following enhancements:

1. READABILITY ASSESSMENT:
   - Score (0-10): Assess how easy the comment is to read
   - Suggestions: Provide 2-3 specific readability improvements (clarity, grammar, structure)

2. CONSTRUCTIVE FEEDBACK:
   - Provide 2-3 constructive feedback points to improve the tone and helpfulness

3. IMPROVEMENT PROMPTS:
   - Generate 2-3 specific prompts to guide the author in improving their comment 

4. ENGAGEMENT OPTIMIZATION:
   - Provide 2-3 suggestions to increase engagement (questions, calls to action, etc.)

5. CONTENT ENRICHMENT:
   - Recommended links: Suggest relevant resources (if applicable)
   - Suggested references: Recommend citations or sources (if applicable)
   - Relevant topics: List 2-3 related topics the comment could address
   - Additional context: Suggest background information that would strengthen the comment

6. ML PRIORITIZATION:
   - Score (0-1): Rate the priority of these enhancements for this comment

Format your response as structured JSON matching these exact keys.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: "You are a comment quality enhancement assistant. Analyze comments objectively and provide helpful suggestions for improvement." },
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: "json_object" }
      });

      // Parse the AI response
      const enhancementText = response.choices[0]?.message.content || '{}';
      
      // Parse JSON from response
      let enhancementData;
      try {
        enhancementData = JSON.parse(enhancementText);
      } catch (error) {
        logger.error(`Failed to parse enhancement JSON for comment ${commentId}`, error);
        enhancementData = {};
      }

      // Construct result object with safe defaults
      const result: CommentQualityEnhancementResult = {
        commentId,
        readabilityScore: typeof enhancementData.readabilityAssessment?.score === 'number' 
          ? enhancementData.readabilityAssessment.score 
          : 5,
        readabilitySuggestions: Array.isArray(enhancementData.readabilityAssessment?.suggestions) 
          ? enhancementData.readabilityAssessment.suggestions 
          : [],
        constructiveFeedback: Array.isArray(enhancementData.constructiveFeedback) 
          ? enhancementData.constructiveFeedback 
          : [],
        improvementPrompts: Array.isArray(enhancementData.improvementPrompts) 
          ? enhancementData.improvementPrompts 
          : [],
        engagementSuggestions: Array.isArray(enhancementData.engagementOptimization) 
          ? enhancementData.engagementOptimization 
          : [],
        contentEnrichment: {
          recommendedLinks: Array.isArray(enhancementData.contentEnrichment?.recommendedLinks) 
            ? enhancementData.contentEnrichment.recommendedLinks 
            : [],
          suggestedReferences: Array.isArray(enhancementData.contentEnrichment?.suggestedReferences) 
            ? enhancementData.contentEnrichment.suggestedReferences 
            : [],
          relevantTopics: Array.isArray(enhancementData.contentEnrichment?.relevantTopics) 
            ? enhancementData.contentEnrichment.relevantTopics 
            : [],
          additionalContext: enhancementData.contentEnrichment?.additionalContext || '',
        },
        mlPrioritization: typeof enhancementData.mlPrioritization === 'number' 
          ? enhancementData.mlPrioritization 
          : 0.5,
        analysisTimestamp: new Date().toISOString()
      };

      // Store result in cache (expire after 24 hours)
      await kv.set(cacheKey, result, { ex: 86400 });

      // Store in database
      await storeCommentQualityEnhancement(commentId, result);

      logger.info(`Enhancement generation complete for comment ${commentId}`, {
        readabilityScore: result.readabilityScore,
        mlPrioritization: result.mlPrioritization
      });

      return result;
    } catch (error) {
      logger.error(`Error generating quality enhancements for comment ${commentId}`, error);
      // Return a default result in case of error
      return {
        commentId,
        readabilityScore: 5,
        readabilitySuggestions: ['Ensure your comment is clear and concise.'],
        constructiveFeedback: ['Consider adding more details to your comment.'],
        improvementPrompts: ['How could you make your point more effectively?'],
        engagementSuggestions: ['Consider ending with a question to engage readers.'],
        contentEnrichment: {
          recommendedLinks: [],
          suggestedReferences: [],
          relevantTopics: [],
          additionalContext: ''
        },
        mlPrioritization: 0.5,
        analysisTimestamp: new Date().toISOString()
      };
    }
  },
  {
    concurrency: 3,
    keyPrefix: 'comment-quality-enhancement',
    cacheTTL: 3600, // 1 hour
    keepWarm: true
  }
);

/**
 * Store comment quality enhancement in the database
 */
async function storeCommentQualityEnhancement(
  commentId: string, 
  enhancement: CommentQualityEnhancementResult
): Promise<void> {
  try {
    await prisma.commentQualityEnhancement.create({
      data: {
        commentId,
        readabilityScore: enhancement.readabilityScore,
        readabilitySuggestions: enhancement.readabilitySuggestions,
        constructiveFeedback: enhancement.constructiveFeedback,
        improvementPrompts: enhancement.improvementPrompts,
        engagementSuggestions: enhancement.engagementSuggestions,
        contentEnrichment: enhancement.contentEnrichment,
        mlPrioritization: enhancement.mlPrioritization,
      }
    });
  } catch (error) {
    logger.error(`Failed to store quality enhancement for comment ${commentId}`, error);
    // Don't throw to avoid disrupting the main flow
  }
}

/**
 * Get quality enhancement for a specific comment
 */
export async function getCommentQualityEnhancement(commentId: string): Promise<CommentQualityEnhancementResult | null> {
  // Try cache first
  const cacheKey = getEnhancementCacheKey(commentId);
  const cachedResult = await kv.get<CommentQualityEnhancementResult>(cacheKey);
  
  if (cachedResult) {
    return cachedResult;
  }
  
  // If not in cache, check database
  const dbResult = await prisma.commentQualityEnhancement.findFirst({
    where: { commentId },
    orderBy: { createdAt: 'desc' },
  });
  
  if (!dbResult) {
    return null;
  }
  
  // Map database result to interface structure
  const result: CommentQualityEnhancementResult = {
    commentId: dbResult.commentId,
    readabilityScore: dbResult.readabilityScore,
    readabilitySuggestions: dbResult.readabilitySuggestions,
    constructiveFeedback: dbResult.constructiveFeedback,
    improvementPrompts: dbResult.improvementPrompts,
    engagementSuggestions: dbResult.engagementSuggestions,
    contentEnrichment: dbResult.contentEnrichment as ContentEnrichmentData,
    mlPrioritization: dbResult.mlPrioritization || 0.5,
    analysisTimestamp: dbResult.createdAt.toISOString()
  };
  
  // Update cache
  await kv.set(cacheKey, result, { ex: 86400 });
  
  return result;
}

/**
 * Invalidate quality enhancement cache for a comment
 */
export async function invalidateQualityEnhancement(commentId: string): Promise<void> {
  const cacheKey = getEnhancementCacheKey(commentId);
  await kv.del(cacheKey);
  logger.debug(`Invalidated quality enhancement cache for comment ${commentId}`);
}

/**
 * Apply quality enhancements to a comment
 * This is used when a user accepts the suggested enhancements
 */
export async function applyQualityEnhancement(
  commentId: string,
  enhancedContent: string,
  userId: string,
  appliedSuggestions: string[]
): Promise<boolean> {
  try {
    // Get the original comment
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: {
        content: true,
        authorId: true,
      }
    });
    
    if (!comment) {
      logger.error(`Comment ${commentId} not found for quality enhancement application`);
      return false;
    }
    
    // Verify the user is the author of the comment
    if (comment.authorId !== userId) {
      logger.warn(`User ${userId} attempted to apply enhancements to comment ${commentId} they do not own`);
      return false;
    }
    
    // Update the comment with enhanced content
    await prisma.comment.update({
      where: { id: commentId },
      data: {
        content: enhancedContent,
        updatedAt: new Date()
      }
    });
    
    // Mark enhancement as applied
    await prisma.commentQualityEnhancement.updateMany({
      where: { commentId },
      data: { appliedByUser: true }
    });
    
    // Log the application of enhancements
    await prisma.commentModerationLog.create({
      data: {
        commentId,
        reviewerId: userId,
        action: 'EDIT',
        previousContent: comment.content,
        updatedContent: enhancedContent,
        reason: `Applied quality enhancements: ${appliedSuggestions.join(', ')}`,
        systemGenerated: false
      }
    });
    
    // Invalidate cache
    await invalidateQualityEnhancement(commentId);
    
    logger.info(`Applied quality enhancements to comment ${commentId} by user ${userId}`);
    return true;
  } catch (error) {
    logger.error(`Failed to apply quality enhancements for comment ${commentId}`, error);
    return false;
  }
}

/**
 * Get comments that would benefit most from quality enhancements
 * Prioritized by ML enhancement score and comment activity
 */
export async function getPrioritizedEnhancementComments(
  limit = 10, 
  userId?: string
): Promise<{
  commentId: string;
  content: string;
  postId: string;
  authorId: string;
  createdAt: Date;
  qualityEnhancement: {
    readabilityScore: number;
    mlPrioritization: number;
  }
}[]> {
  // Query for comments with their enhancement data
  const whereClause: any = {
    qualityEnhancements: {
      some: {
        mlPrioritization: { gt: 0.5 }, // Only higher priority enhancements
        appliedByUser: false // Only those not yet applied
      }
    }
  };
  
  // Filter by user if specified
  if (userId) {
    whereClause.authorId = userId;
  }
  
  const comments = await prisma.comment.findMany({
    where: whereClause,
    select: {
      id: true,
      content: true,
      postId: true,
      authorId: true,
      createdAt: true,
      qualityEnhancements: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          readabilityScore: true,
          mlPrioritization: true,
        }
      }
    },
    orderBy: [
      { createdAt: 'desc' } // Most recent first
    ],
    take: limit
  });
  
  // Format results
  return comments.map(comment => ({
    commentId: comment.id,
    content: comment.content,
    postId: comment.postId,
    authorId: comment.authorId,
    createdAt: comment.createdAt,
    qualityEnhancement: comment.qualityEnhancements[0] || {
      readabilityScore: 0,
      mlPrioritization: 0
    }
  }));
}
