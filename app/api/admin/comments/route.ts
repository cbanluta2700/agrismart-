/**
 * API endpoint for admin comment moderation
 * Provides list and search functionality for comment moderation
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/utils/logger';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

// Create a dedicated logger for admin routes
const routeLogger = logger.child('api.admin.comments');

// Query schema validation
const commentQuerySchema = z.object({
  tab: z.enum(['reported', 'pending', 'moderated', 'all']).default('reported'),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  sortField: z.enum(['createdAt', 'reportCount', 'toxicityScore']).default('createdAt'),
  sortDirection: z.enum(['asc', 'desc']).default('desc'),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
});

/**
 * Get comments for moderation
 */
export async function GET(request: Request) {
  try {
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
    
    // Parse query parameters
    const url = new URL(request.url);
    const rawParams: Record<string, string> = {};
    
    // Convert URLSearchParams to regular object
    for (const [key, value] of url.searchParams.entries()) {
      rawParams[key] = value;
    }
    
    // Validate query parameters
    const validationResult = commentQuerySchema.safeParse(rawParams);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          status: 'error', 
          message: 'Invalid query parameters',
          errors: validationResult.error.format()
        },
        { status: 400 }
      );
    }
    
    const params = validationResult.data;
    
    // Calculate pagination values
    const skip = (params.page - 1) * params.limit;
    const take = params.limit;
    
    // Prepare filter conditions based on tab
    let whereConditions: any = {};
    
    switch (params.tab) {
      case 'reported':
        whereConditions = {
          reportCount: { gt: 0 },
          reports: { some: { status: 'PENDING' } }
        };
        break;
      case 'pending':
        whereConditions = { moderationStatus: 'PENDING' };
        break;
      case 'moderated':
        whereConditions = {
          moderationStatus: { in: ['APPROVED', 'REJECTED'] }
        };
        break;
      // 'all' tab doesn't need additional filters
    }
    
    // Add status filter if provided
    if (params.status) {
      whereConditions.moderationStatus = params.status;
    }
    
    // Add content search if provided
    if (params.search) {
      whereConditions.OR = [
        { content: { contains: params.search, mode: 'insensitive' } },
        { author: { name: { contains: params.search, mode: 'insensitive' } } }
      ];
    }
    
    // Add date filters if provided
    if (params.fromDate) {
      whereConditions.createdAt = {
        ...(whereConditions.createdAt || {}),
        gte: new Date(params.fromDate)
      };
    }
    
    if (params.toDate) {
      whereConditions.createdAt = {
        ...(whereConditions.createdAt || {}),
        lte: new Date(params.toDate)
      };
    }
    
    // Fetch comments with pagination and sorting
    const [comments, totalComments] = await Promise.all([
      prisma.comment.findMany({
        where: whereConditions,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              image: true
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
        },
        orderBy: {
          [params.sortField]: params.sortDirection
        },
        skip,
        take
      }),
      prisma.comment.count({
        where: whereConditions
      })
    ]);
    
    routeLogger.info(`Retrieved ${comments.length} comments for moderation`, {
      userId: session.user.id,
      tab: params.tab,
      page: params.page,
      totalComments
    });
    
    return NextResponse.json({
      status: 'success',
      data: {
        comments,
        total: totalComments,
        page: params.page,
        limit: params.limit,
        totalPages: Math.ceil(totalComments / params.limit)
      }
    });
  } catch (error) {
    routeLogger.error('Error retrieving comments for moderation', error);
    
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to retrieve comments',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
