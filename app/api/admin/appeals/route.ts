import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPendingAppeals, getUserAppeals } from '@/lib/moderation/appeals';
import { hasPermission } from '@/lib/permissions';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

// Validation schema for query parameters
const QueryParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().min(1).max(50).default(10),
  status: z.enum(['pending', 'approved', 'rejected', 'all']).default('pending'),
});

/**
 * GET /api/admin/appeals
 * Get a list of appeals for moderation with status filtering
 */
export async function GET(req: NextRequest) {
  try {
    // Authenticate and authorize admin user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if the user has permission to moderate appeals
    if (!await hasPermission(session.user.id, 'moderate:appeals')) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to moderate appeals' },
        { status: 403 }
      );
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(req.url);
    const queryParams = {
      page: searchParams.get('page') ? Number(searchParams.get('page')) : undefined,
      pageSize: searchParams.get('pageSize') ? Number(searchParams.get('pageSize')) : undefined,
      status: searchParams.get('status') || undefined,
    };

    try {
      const validatedParams = QueryParamsSchema.parse(queryParams);
      
      // Map the status param to Prisma filter
      let whereClause = {};
      if (validatedParams.status !== 'all') {
        whereClause = {
          status: validatedParams.status.toUpperCase(),
        };
      }
      
      // Get appeals based on filter
      const skip = (validatedParams.page - 1) * validatedParams.pageSize;
      const total = await prisma.moderationAppeal.count({ where: whereClause });
      
      const appeals = await prisma.moderationAppeal.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: validatedParams.pageSize,
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          },
          comment: {
            select: {
              content: true,
              createdAt: true
            }
          }
        }
      });
      
      return NextResponse.json({
        appeals,
        total,
        page: validatedParams.page,
        pageSize: validatedParams.pageSize,
        totalPages: Math.ceil(total / validatedParams.pageSize)
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { 
            error: 'Invalid query parameters', 
            details: error.errors.map(e => e.message).join(', ') 
          },
          { status: 400 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('[API] Error fetching appeals:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
