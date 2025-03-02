import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { appealId: string } }
) {
  try {
    // Get the user session
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    const { appealId } = params;
    
    if (!appealId) {
      return NextResponse.json(
        { error: 'Appeal ID is required' },
        { status: 400 }
      );
    }
    
    // Fetch the appeal with detailed information
    const appeal = await prisma.moderationAppeal.findUnique({
      where: {
        id: appealId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        comment: true,
        moderator: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    
    if (!appeal) {
      return NextResponse.json(
        { error: 'Appeal not found' },
        { status: 404 }
      );
    }
    
    // Verify the appeal belongs to this user
    if (appeal.userId !== userId) {
      return NextResponse.json(
        { error: 'You do not have permission to view this appeal' },
        { status: 403 }
      );
    }
    
    return NextResponse.json(appeal);
  } catch (error) {
    console.error('Error fetching appeal details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch appeal details' },
      { status: 500 }
    );
  }
}
