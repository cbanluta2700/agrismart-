/**
 * API endpoint for reporting comments
 * Allows users to submit reports for inappropriate comments
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/utils/logger';
import { runPostResponseTask } from '@/lib/vercel/fluid-compute';
import { analyzeComment } from '@/lib/moderation/comment/analysis';
import { createPublicClient } from '@vercel/analytics';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Create a dedicated logger for the report route
const routeLogger = logger.child('api.comments.report');

// Analytics client for tracking reports
const analytics = createPublicClient({
  debug: process.env.NODE_ENV === 'development'
});

// Report request validation schema
const reportCommentSchema = z.object({
  commentId: z.string().min(1),
  categoryId: z.string().min(1),
  description: z.string().optional(),
});

/**
 * Submit a report for a comment
 */
export async function POST(request: Request) {
  const startTime = Date.now();
  
  try {
    // Verify user authentication
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { 
          status: 'error', 
          message: 'Authentication required' 
        },
        { status: 401 }
      );
    }
    
    // Parse and validate request body
    const body = await request.json();
    const validationResult = reportCommentSchema.safeParse(body);
    
    if (!validationResult.success) {
      routeLogger.warn('Invalid report payload', { errors: validationResult.error.format() });
      return NextResponse.json(
        { 
          status: 'error', 
          message: 'Invalid report data',
          errors: validationResult.error.format()
        },
        { status: 400 }
      );
    }
    
    const { commentId, categoryId, description } = validationResult.data;
    const reporterId = session.user.id;
    
    // Check if the comment exists
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        reports: {
          where: { reporterId },
          select: { id: true }
        }
      }
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
    
    // Check if user already reported this comment
    if (comment.reports.length > 0) {
      return NextResponse.json(
        { 
          status: 'error', 
          message: 'You have already reported this comment' 
        },
        { status: 400 }
      );
    }
    
    // Check if report category exists
    const category = await prisma.reportCategory.findUnique({
      where: { id: categoryId }
    });
    
    if (!category) {
      return NextResponse.json(
        { 
          status: 'error', 
          message: 'Invalid report category' 
        },
        { status: 400 }
      );
    }
    
    // Create the report
    const report = await prisma.report.create({
      data: {
        commentId,
        reporterId,
        categoryId,
        description,
        status: 'PENDING'
      }
    });
    
    // Update comment reported status
    await prisma.comment.update({
      where: { id: commentId },
      data: {
        reportCount: { increment: 1 },
        reportedAt: new Date()
      }
    });
    
    // Perform background tasks after response
    runPostResponseTask(
      async () => {
        // Track report submission
        await analytics.track('comment_report_submitted', {
          reportId: report.id,
          commentId,
          categoryId,
          categorySeverity: category.severity,
          executionTimeMs: Date.now() - startTime
        });
        
        // Re-analyze the comment in response to report
        const comment = await prisma.comment.findUnique({
          where: { id: commentId },
          select: { 
            id: true, 
            content: true, 
            authorId: true,
            reportCount: true
          }
        });
        
        if (comment) {
          // Analyze with report context
          const analysisResult = await analyzeComment(
            commentId,
            comment.content,
            comment.authorId,
            { 
              reportCount: comment.reportCount,
              reportCategory: category.name,
              reportSeverity: category.severity
            }
          );
          
          // Auto-moderate if high confidence of violation
          if (analysisResult.toxicityScore > 0.8 || 
              analysisResult.moderationRecommendation === 'REJECTED') {
            await prisma.comment.update({
              where: { id: commentId },
              data: {
                visible: false,
                moderationStatus: 'REJECTED',
                moderationReason: 'Automatically hidden due to user reports and AI analysis'
              }
            });
            
            routeLogger.info(`Auto-moderated comment ${commentId} after report`);
          }
          
          // Prioritize for human review if needed
          if (category.severity >= 4 || comment.reportCount >= 3) {
            // Functionality to flag for urgent review would go here
            // This could update a priority field or send a notification
            routeLogger.info(`Comment ${commentId} flagged for urgent review`);
          }
        }
      },
      {
        key: `comment-report-processing-${report.id}`,
        timeout: 30000 // 30 seconds timeout
      }
    );
    
    return NextResponse.json({
      status: 'success',
      message: 'Report submitted successfully',
      data: {
        reportId: report.id
      }
    });
  } catch (error) {
    routeLogger.error('Error processing comment report', error);
    
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to process report',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Get available report categories
 */
export async function GET(request: Request) {
  try {
    // Verify user authentication
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { 
          status: 'error', 
          message: 'Authentication required' 
        },
        { status: 401 }
      );
    }
    
    // Retrieve all report categories
    const categories = await prisma.reportCategory.findMany({
      orderBy: { severity: 'desc' }
    });
    
    return NextResponse.json({
      status: 'success',
      data: categories
    });
  } catch (error) {
    routeLogger.error('Error fetching report categories', error);
    
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to fetch report categories',
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
