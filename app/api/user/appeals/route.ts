import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getUserAppeals } from '@/lib/moderation/appeals';
import { z } from 'zod';

// Validation schema for query parameters
const QueryParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().min(1).max(50).default(10),
});

/**
 * GET /api/user/appeals
 * Get the current user's appeals
 */
export async function GET(req: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(req.url);
    const queryParams = {
      page: searchParams.get('page') ? Number(searchParams.get('page')) : undefined,
      pageSize: searchParams.get('pageSize') ? Number(searchParams.get('pageSize')) : undefined,
    };

    try {
      const validatedParams = QueryParamsSchema.parse(queryParams);
      
      // Get user appeals
      const result = await getUserAppeals(
        session.user.id,
        validatedParams.page,
        validatedParams.pageSize
      );

      return NextResponse.json(result);
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
    console.error('[API] Error fetching user appeals:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
