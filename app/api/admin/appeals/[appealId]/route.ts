import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getAppealById } from '@/lib/moderation/appeals';
import { hasPermission } from '@/lib/permissions';

/**
 * GET /api/admin/appeals/[appealId]
 * Get details for a specific appeal
 */
export async function GET(
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

    // Get the appeal details
    const appeal = await getAppealById(appealId);
    if (!appeal) {
      return NextResponse.json(
        { error: 'Appeal not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(appeal);
  } catch (error) {
    console.error('[API] Error fetching appeal details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
