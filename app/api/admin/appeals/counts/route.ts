import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/appeals/counts
 * Get counts of appeals by status
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

    // Get counts
    const [pending, approved, rejected, total] = await Promise.all([
      prisma.moderationAppeal.count({ where: { status: 'PENDING' } }),
      prisma.moderationAppeal.count({ where: { status: 'APPROVED' } }),
      prisma.moderationAppeal.count({ where: { status: 'REJECTED' } }),
      prisma.moderationAppeal.count(),
    ]);

    return NextResponse.json({
      pending,
      approved,
      rejected,
      total
    });
  } catch (error) {
    console.error('[API] Error fetching appeal counts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
