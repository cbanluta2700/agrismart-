import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { submitAppeal, AppealSubmissionSchema } from '@/lib/moderation/appeals';
import { rateLimit } from '@/lib/rate-limit';
import { z } from 'zod';

/**
 * POST /api/comments/appeal
 * Submit an appeal for a moderated comment
 */
export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Apply rate limiting (5 appeals per hour)
    const identifier = `appeal_${session.user.id}`;
    const { success: rateLimitSuccess, limit, remaining } = await rateLimit(identifier, 5, 60 * 60);
    
    if (!rateLimitSuccess) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          limit,
          remaining: 0,
          resetIn: '1 hour' 
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Date.now() + 60 * 60 * 1000)
          }
        }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    
    try {
      AppealSubmissionSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { 
            error: 'Invalid request data', 
            details: error.errors.map(e => e.message).join(', ') 
          },
          { status: 400 }
        );
      }
      throw error;
    }

    // Submit the appeal
    const result = await submitAppeal(body, session.user.id);

    if (result.success) {
      return NextResponse.json(
        { 
          success: true, 
          appealId: result.appealId,
          rateLimit: {
            limit,
            remaining: remaining - 1
          }
        },
        { 
          status: 201,
          headers: {
            'X-RateLimit-Limit': String(limit),
            'X-RateLimit-Remaining': String(remaining - 1),
          }
        }
      );
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('[API] Error submitting appeal:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
