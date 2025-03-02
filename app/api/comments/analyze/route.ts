/**
 * API endpoint for analyzing comments
 * This endpoint is used for analyzing a comment for moderation purposes
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { analyzeComment } from '@/lib/moderation/comment/analysis';
import { logger } from '@/lib/utils/logger';
import { prisma } from '@/lib/prisma';
import { runPostResponseTask } from '@/lib/vercel/fluid-compute';
import { createPublicClient } from '@vercel/analytics';

// Create a dedicated logger for the analyze route
const routeLogger = logger.child('api.comments.analyze');

// Analytics client for tracking usage
const analytics = createPublicClient({
  debug: process.env.NODE_ENV === 'development'
});

// Request validation schema
const analyzeCommentSchema = z.object({
  commentId: z.string().min(1),
  content: z.string().min(1),
  authorId: z.string().optional(),
  contextData: z.record(z.any()).optional(),
});

// POST handler for analyzing a comment
export async function POST(request: Request) {
  const startTime = Date.now();
  
  try {
    // Parse and validate request body
    const body = await request.json();
    const validationResult = analyzeCommentSchema.safeParse(body);
    
    if (!validationResult.success) {
      routeLogger.warn('Invalid request payload', { errors: validationResult.error.format() });
      return NextResponse.json(
        { 
          status: 'error', 
          message: 'Invalid request payload',
          errors: validationResult.error.format()
        },
        { status: 400 }
      );
    }
    
    const { commentId, content, authorId, contextData } = validationResult.data;
    
    routeLogger.info(`Received analysis request for comment ${commentId}`, {
      contentLength: content.length,
      hasAuthor: !!authorId,
      hasContext: !!contextData
    });
    
    // Perform analysis
    const analysisResult = await analyzeComment(
      commentId,
      content,
      authorId,
      contextData
    );
    
    // Track API usage in background
    runPostResponseTask(
      async () => {
        await analytics.track('comment_analysis', {
          executionTimeMs: Date.now() - startTime,
          commentId,
          authorId: authorId || 'anonymous',
          contentLength: content.length,
          toxicityScore: analysisResult.toxicityScore,
          recommendation: analysisResult.moderationRecommendation
        });
        
        // Update comment status if recommendation is REJECTED
        if (analysisResult.moderationRecommendation === 'REJECTED' && 
            analysisResult.confidenceScore > 0.8) {
          try {
            await prisma.comment.update({
              where: { id: commentId },
              data: { 
                visible: false,
                moderationStatus: 'REJECTED',
                moderationReason: 'Automatically rejected by AI analysis'
              }
            });
            
            routeLogger.info(`Auto-rejected comment ${commentId} based on analysis`);
          } catch (error) {
            routeLogger.error(`Failed to update comment ${commentId} status`, error);
          }
        }
      },
      {
        key: `comment-analysis-tracking-${commentId}`,
        timeout: 30000 // 30 seconds timeout
      }
    );
    
    // Return the analysis result
    return NextResponse.json({
      status: 'success',
      data: analysisResult,
      executionTimeMs: Date.now() - startTime
    });
  } catch (error) {
    routeLogger.error('Error analyzing comment', error);
    
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to analyze comment',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET handler for retrieving analysis for an existing comment
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get('commentId');
    
    if (!commentId) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Missing required parameter: commentId'
        },
        { status: 400 }
      );
    }
    
    // Find the comment in the database
    const comment = await prisma.comment.findUnique({
      where: { id: commentId }
    });
    
    if (!comment) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Comment not found'
        },
        { status: 404 }
      );
    }
    
    // Get the latest analysis from the database
    const analysis = await prisma.commentAnalysis.findFirst({
      where: { commentId },
      orderBy: { createdAt: 'desc' }
    });
    
    if (!analysis) {
      // No existing analysis found, perform a new analysis
      const analysisResult = await analyzeComment(
        commentId,
        comment.content,
        comment.authorId,
        { isRetrievalRequest: true }
      );
      
      return NextResponse.json({
        status: 'success',
        data: analysisResult,
        source: 'new_analysis'
      });
    }
    
    // Return the existing analysis
    return NextResponse.json({
      status: 'success',
      data: {
        contentId: comment.id,
        toxicityScore: analysis.toxicityScore,
        sentimentScore: analysis.sentimentScore,
        spamProbability: analysis.spamProbability,
        categoryTags: analysis.categoryTags,
        moderationRecommendation: analysis.moderationRecommendation,
        confidenceScore: analysis.confidenceScore,
        analysisTimestamp: analysis.createdAt.toISOString()
      },
      source: 'cached_analysis'
    });
  } catch (error) {
    routeLogger.error('Error retrieving comment analysis', error);
    
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to retrieve comment analysis',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Export config for Edge functions
export const config = {
  runtime: 'edge',
  regions: 'auto'
};
