import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { rejectAppeal } from '@/lib/moderation/appeals';
import { hasPermission } from '@/lib/permissions';
import { z } from 'zod';

// Validation schema for request body
const RequestBodySchema = z.object({
  moderatorNotes: z.string().max(2000).optional(),
});

/**
 * POST /api/admin/appeals/[appealId]/reject
 * Reject an appeal and keep the content moderated
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { appealId: string } }
) {
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

    const appealId = params.appealId;
    if (!appealId) {
      return NextResponse.json(
        { error: 'Appeal ID is required' },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    try {
      const validatedBody = RequestBodySchema.parse(body);
      
      // Reject the appeal
      const result = await rejectAppeal(
        appealId,
        session.user.id,
        validatedBody.moderatorNotes
      );

      if (result.success) {
        return NextResponse.json({ success: true });
      } else {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }
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
  } catch (error) {
    console.error('[API] Error rejecting appeal:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
