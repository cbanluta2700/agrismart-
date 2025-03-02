/**
 * API endpoint for admin comment detail
 * Provides detailed information about a comment for moderation
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/utils/logger';
import { authOptions } from '@/lib/auth';

// Create a dedicated logger for admin routes
const routeLogger = logger.child('api.admin.comments.detail');

/**
 * Get detailed information about a specific comment
 */
export async function GET(
  request: Request,
  { params }: { params: { commentId: string } }
) {
  try {
    const { commentId } = params;
    
    // Verify admin/moderator authentication
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !session.user.roles?.some(role => 
      ['ADMIN', 'MODERATOR'].includes(role)
    )) {
      return NextResponse.json(
        { 
          status: 'error', 
          message: 'Unauthorized access' 
        },
        { status: 403 }
      );
    }
    
    // Fetch comment details
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
            email: true
          }
        },
        parent: {
          select: {
            id: true,
            content: true,
            author: {
              select: {
                id: true,
                name: true,
                image: true
              }
            }
          }
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
    
    // Fetch reports related to this comment
    const reports = await prisma.report.findMany({
      where: { commentId },
      include: {
        reporter: {
          select: {
            id: true,
            name: true
          }
        },
        category: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Fetch AI analysis results if available
    const analysisResults = await prisma.commentAnalysis.findUnique({
      where: { commentId }
    });
    
    routeLogger.info(`Retrieved comment details for moderation`, {
      userId: session.user.id,
      commentId,
      reportsCount: reports.length
    });
    
    return NextResponse.json({
      status: 'success',
      data: {
        comment,
        reports,
        analysisResults
      }
    });
  } catch (error) {
    routeLogger.error('Error retrieving comment details', error);
    
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to retrieve comment details',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
