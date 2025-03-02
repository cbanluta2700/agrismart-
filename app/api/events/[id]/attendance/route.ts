import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

// Schema for attendance status update
const attendanceSchema = z.object({
  status: z.enum(['PENDING', 'ACCEPTED', 'DECLINED', 'MAYBE']),
});

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { id } = params;
    
    // Check if the event exists
    const event = await prisma.event.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        creatorId: true,
        groupId: true,
      },
    });
    
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    
    // Parse and validate the request body
    const data = await request.json();
    const { status } = attendanceSchema.parse(data);
    
    // Find the attendance record if it exists
    const attendance = await prisma.eventAttendee.findFirst({
      where: {
        eventId: id,
        userId: session.user.id,
      },
    });
    
    // If no attendance record exists, create one
    // Otherwise, update the existing record
    if (!attendance) {
      await prisma.eventAttendee.create({
        data: {
          eventId: id,
          userId: session.user.id,
          status,
        },
      });
    } else {
      await prisma.eventAttendee.update({
        where: { id: attendance.id },
        data: { status },
      });
    }
    
    // Notify the event creator about the attendance update
    // Don't notify if the user is the creator
    if (event.creatorId !== session.user.id) {
      await prisma.notification.create({
        data: {
          userId: event.creatorId,
          type: 'EVENT_RSVP',
          title: 'Event RSVP Update',
          message: `${session.user.name} has ${status.toLowerCase()} your event "${event.title}"`,
          data: JSON.stringify({
            eventId: id,
            eventTitle: event.title,
            userId: session.user.id,
            userName: session.user.name,
            status,
          }),
          isRead: false,
        },
      });
    }
    
    // Log the attendance status change in analytics
    await prisma.analyticsEvent.create({
      data: {
        userId: session.user.id,
        type: 'EVENT_ATTENDANCE_UPDATED',
        data: JSON.stringify({
          eventId: id,
          status,
          groupId: event.groupId,
        }),
      },
    });
    
    return NextResponse.json({
      success: true,
      status,
    });
  } catch (error) {
    console.error('Error updating attendance status:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update attendance status' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { id } = params;
    
    // Check if the event exists
    const event = await prisma.event.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        creatorId: true,
      },
    });
    
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    
    // Get all attendees with their status
    const attendees = await prisma.eventAttendee.findMany({
      where: {
        eventId: id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
    
    // Count by status
    const countsByStatus = {
      ACCEPTED: attendees.filter(a => a.status === 'ACCEPTED').length,
      DECLINED: attendees.filter(a => a.status === 'DECLINED').length,
      MAYBE: attendees.filter(a => a.status === 'MAYBE').length,
      PENDING: attendees.filter(a => a.status === 'PENDING').length,
    };
    
    return NextResponse.json({
      attendees,
      counts: countsByStatus,
      isCreator: event.creatorId === session.user.id,
    });
  } catch (error) {
    console.error('Error fetching event attendees:', error);
    return NextResponse.json(
      { error: 'Failed to fetch event attendees' },
      { status: 500 }
    );
  }
}
