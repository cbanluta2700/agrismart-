/**
 * Comment analysis utilities for the AgriSmart platform
 * Provides advanced content analysis for comment moderation
 */

import { ContentType, ModerationStatus } from '@prisma/client';
import { OpenAI } from 'openai';
import { createLogger } from '@/lib/utils/logger';
import { prisma } from '@/lib/prisma';
import { fluidCompute } from '@/lib/vercel/fluid-compute';
import { kv } from '@vercel/kv';

// Create a dedicated logger for comment analysis
const logger = createLogger('comment.analysis');

// Configure OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// Analysis result interface
export interface CommentAnalysisResult {
  contentId: string;
  toxicityScore: number;
  sentimentScore: number;
  spamProbability: number;
  categoryTags: string[];
  moderationRecommendation: ModerationStatus;
  confidenceScore: number;
  analysisTimestamp: string;
}

/**
 * Cache key for comment analysis results
 */
const getAnalysisCacheKey = (commentId: string) => `comment:analysis:${commentId}`;

/**
 * Analyze a comment for toxicity, sentiment, spam probability, and categorization
 * Uses Fluid Compute for performance optimization
 */
export const analyzeComment = fluidCompute(
  async (
    commentId: string,
    commentText: string,
    authorId?: string,
    metadata?: Record<string, any>
  ): Promise<CommentAnalysisResult> => {
    logger.info(`Analyzing comment ${commentId}`, { 
      commentLength: commentText.length,
      authorId
    });

    try {
      // Check cache first
      const cacheKey = getAnalysisCacheKey(commentId);
      const cachedResult = await kv.get<CommentAnalysisResult>(cacheKey);
      
      if (cachedResult) {
        logger.debug(`Using cached analysis for comment ${commentId}`);
        return cachedResult;
      }

      // Perform AI analysis
      const prompt = `
Analyze the following comment for moderation purposes. Provide the following scores:
1. Toxicity (0-1): Measure of harmful, offensive, or negative content
2. Sentiment (-1 to 1): Negative to positive emotional tone
3. Spam probability (0-1): Likelihood of being spam or promotional
4. Category tags: List of relevant content categories (comma separated)
5. Moderation recommendation: One of [APPROVED, PENDING, REJECTED]
6. Confidence score (0-1): Confidence in the analysis

COMMENT: ${commentText}

USER CONTEXT: ${metadata ? JSON.stringify(metadata) : 'No additional context'}

ANALYSIS:`;

      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: "You are a comment moderation assistant. Analyze the comment objectively and provide structured metrics." },
          { role: "user", content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 250,
      });

      // Parse the AI response
      const analysisText = response.choices[0]?.message.content || '';
      
      // Extract values using regex patterns
      const toxicityMatch = analysisText.match(/Toxicity.*?(\d+\.\d+)/i);
      const sentimentMatch = analysisText.match(/Sentiment.*?([-]?\d+\.\d+)/i);
      const spamMatch = analysisText.match(/Spam probability.*?(\d+\.\d+)/i);
      const categoryMatch = analysisText.match(/Category tags.*?:(.*?)(\n|$)/i);
      const recommendationMatch = analysisText.match(/Moderation recommendation.*?:(.*?)(\n|$)/i);
      const confidenceMatch = analysisText.match(/Confidence score.*?(\d+\.\d+)/i);

      // Construct result object
      const result: CommentAnalysisResult = {
        contentId: commentId,
        toxicityScore: toxicityMatch ? parseFloat(toxicityMatch[1]) : 0,
        sentimentScore: sentimentMatch ? parseFloat(sentimentMatch[1]) : 0,
        spamProbability: spamMatch ? parseFloat(spamMatch[1]) : 0,
        categoryTags: categoryMatch 
          ? categoryMatch[1].split(',').map(tag => tag.trim())
          : [],
        moderationRecommendation: parseModeration(recommendationMatch?.[1]),
        confidenceScore: confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.5,
        analysisTimestamp: new Date().toISOString()
      };

      // Store result in cache (expire after 24 hours)
      await kv.set(cacheKey, result, { ex: 86400 });

      // Also store in database for analytics and history
      await prisma.commentAnalysis.create({
        data: {
          commentId,
          toxicityScore: result.toxicityScore,
          sentimentScore: result.sentimentScore,
          spamProbability: result.spamProbability,
          categoryTags: result.categoryTags,
          moderationRecommendation: result.moderationRecommendation,
          confidenceScore: result.confidenceScore
        }
      });

      logger.info(`Analysis complete for comment ${commentId}`, {
        toxicityScore: result.toxicityScore,
        recommendation: result.moderationRecommendation
      });

      return result;
    } catch (error) {
      logger.error(`Error analyzing comment ${commentId}`, error);
      // Return a default result with pending status in case of error
      return {
        contentId: commentId,
        toxicityScore: 0,
        sentimentScore: 0,
        spamProbability: 0,
        categoryTags: [],
        moderationRecommendation: 'PENDING',
        confidenceScore: 0,
        analysisTimestamp: new Date().toISOString()
      };
    }
  },
  {
    concurrency: 5,
    keyPrefix: 'comment-analysis',
    cacheTTL: 3600, // 1 hour
    keepWarm: true
  }
);

/**
 * Helper function to parse moderation recommendation from text
 */
function parseModeration(text?: string): ModerationStatus {
  if (!text) return 'PENDING';
  
  const normalized = text.trim().toUpperCase();
  
  if (normalized.includes('APPROVED')) return 'APPROVED';
  if (normalized.includes('REJECTED')) return 'REJECTED';
  
  return 'PENDING';
}

/**
 * Invalidate analysis cache for a comment
 */
export async function invalidateCommentAnalysis(commentId: string): Promise<void> {
  const cacheKey = getAnalysisCacheKey(commentId);
  await kv.del(cacheKey);
  logger.debug(`Invalidated analysis cache for comment ${commentId}`);
}

/**
 * Get analysis for a batch of comments
 */
export async function batchAnalyzeComments(
  commentIds: string[],
  commentsData: Map<string, { text: string; authorId?: string; metadata?: Record<string, any> }>
): Promise<Map<string, CommentAnalysisResult>> {
  logger.info(`Batch analyzing ${commentIds.length} comments`);
  
  const results = new Map<string, CommentAnalysisResult>();
  
  // Process in parallel with concurrency control
  const analysisPromises = commentIds.map(async (commentId) => {
    const commentData = commentsData.get(commentId);
    
    if (!commentData) {
      logger.warn(`Comment data not found for comment ${commentId}`);
      return;
    }
    
    const result = await analyzeComment(
      commentId,
      commentData.text,
      commentData.authorId,
      commentData.metadata
    );
    
    results.set(commentId, result);
  });
  
  await Promise.all(analysisPromises);
  
  return results;
}
