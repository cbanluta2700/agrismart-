import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { parseISO } from 'date-fns';
import { z } from 'zod';

// Schema for event updates
const eventUpdateSchema = z.object({
  title: z.string().min(3).max(100).optional(),
  description: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  isAllDay: z.boolean().optional(),
  recurrence: z.string().optional().nullable(),
  backgroundColor: z.string().optional().nullable(),
  borderColor: z.string().optional().nullable(),
  url: z.string().url().optional().nullable(),
  isPublic: z.boolean().optional(),
  categories: z.array(z.string()).optional(),
  attendees: z.array(z.string()).optional(),
});

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
    
    // Fetch the event with all related data
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        categories: true,
        attendees: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
        group: {
          select: {
            id: true,
            name: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        reminders: {
          where: { userId: session.user.id },
        },
      },
    });
    
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    
    // Check if user has access to the event
    const isCreator = event.creatorId === session.user.id;
    const isAttendee = event.attendees.some(
      (attendee) => attendee.userId === session.user.id
    );
    const isPublic = event.isPublic;
    
    // If event is in a group, check group membership
    let isGroupMember = false;
    if (event.groupId) {
      const membership = await prisma.groupMember.findFirst({
        where: {
          groupId: event.groupId,
          userId: session.user.id,
        },
      });
      isGroupMember = !!membership;
    }
    
    // Only allow access if user is creator, attendee, group member, or event is public
    if (!isCreator && !isAttendee && !isGroupMember && !isPublic) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    // Format the event for response
    const formattedEvent = {
      ...event,
      start: event.startDate,
      end: event.endDate,
      allDay: event.isAllDay,
      editable: isCreator,
      userStatus: isAttendee
        ? event.attendees.find(
            (attendee) => attendee.userId === session.user.id
          )?.status
        : null,
    };
    
    return NextResponse.json(formattedEvent);
  } catch (error) {
    console.error('Error fetching event:', error);
    return NextResponse.json(
      { error: 'Failed to fetch event details' },
      { status: 500 }
    );
  }
}

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
    
    // Verify the event exists and user is the creator
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        attendees: true,
        categories: true,
      },
    });
    
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    
    if (event.creatorId !== session.user.id) {
      return NextResponse.json(
        { error: 'Only the event creator can update this event' },
        { status: 403 }
      );
    }
    
    // Parse and validate the request body
    const data = await request.json();
    const validatedData = eventUpdateSchema.parse(data);
    
    // Prepare update data
    const updateData: any = {};
    
    // Add basic fields
    if (validatedData.title !== undefined) updateData.title = validatedData.title;
    if (validatedData.description !== undefined) updateData.description = validatedData.description;
    if (validatedData.location !== undefined) updateData.location = validatedData.location;
    if (validatedData.isAllDay !== undefined) updateData.isAllDay = validatedData.isAllDay;
    if (validatedData.recurrence !== undefined) updateData.recurrence = validatedData.recurrence;
    if (validatedData.backgroundColor !== undefined) updateData.backgroundColor = validatedData.backgroundColor;
    if (validatedData.borderColor !== undefined) updateData.borderColor = validatedData.borderColor;
    if (validatedData.url !== undefined) updateData.url = validatedData.url;
    if (validatedData.isPublic !== undefined) updateData.isPublic = validatedData.isPublic;
    
    // Parse dates if provided
    if (validatedData.startDate) {
      updateData.startDate = parseISO(validatedData.startDate);
    }
    
    if (validatedData.endDate) {
      updateData.endDate = parseISO(validatedData.endDate);
    }
    
    // Update the event in a transaction to handle related entities
    await prisma.$transaction(async (tx) => {
      // Update the event with basic fields
      await tx.event.update({
        where: { id },
        data: updateData,
      });
      
      // Handle categories if provided
      if (validatedData.categories) {
        // Disconnect all existing categories
        await tx.event.update({
          where: { id },
          data: {
            categories: {
              set: [],
            },
          },
        });
        
        // Connect new categories
        if (validatedData.categories.length > 0) {
          await tx.event.update({
            where: { id },
            data: {
              categories: {
                connect: validatedData.categories.map((catId) => ({ id: catId })),
              },
            },
          });
        }
      }
      
      // Handle attendees if provided
      if (validatedData.attendees) {
        // Get current attendees
        const currentAttendeeIds = event.attendees.map((a) => a.userId);
        
        // Find new attendees to add
        const newAttendeeIds = validatedData.attendees.filter(
          (id) => !currentAttendeeIds.includes(id)
        );
        
        // Find attendees to remove
        const attendeesToRemove = event.attendees.filter(
          (a) => !validatedData.attendees?.includes(a.userId)
        );
        
        // Remove attendees
        if (attendeesToRemove.length > 0) {
          await tx.eventAttendee.deleteMany({
            where: {
              id: { in: attendeesToRemove.map((a) => a.id) },
            },
          });
        }
        
        // Add new attendees
        for (const userId of newAttendeeIds) {
          await tx.eventAttendee.create({
            data: {
              eventId: id,
              userId,
              status: 'PENDING',
            },
          });
          
          // Create a notification for the new attendee
          await tx.notification.create({
            data: {
              userId,
              type: 'EVENT_INVITATION',
              title: 'Event Invitation',
              message: `You've been invited to ${updateData.title || event.title}`,
              data: JSON.stringify({
                eventId: id,
                eventTitle: updateData.title || event.title,
                startDate: (updateData.startDate || event.startDate).toISOString(),
              }),
              isRead: false,
            },
          });
        }
      }
      
      // Log the update in analytics
      await tx.analyticsEvent.create({
        data: {
          userId: session.user.id,
          type: 'EVENT_UPDATED',
          data: JSON.stringify({
            eventId: id,
            eventTitle: updateData.title || event.title,
          }),
        },
      });
    });
    
    // Fetch and return the updated event
    const updatedEvent = await prisma.event.findUnique({
      where: { id },
      include: {
        categories: true,
        attendees: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
      },
    });
    
    return NextResponse.json(updatedEvent);
  } catch (error) {
    console.error('Error updating event:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update event' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { id } = params;
    
    // Verify the event exists and user is the creator
    const event = await prisma.event.findUnique({
      where: { id },
    });
    
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    
    if (event.creatorId !== session.user.id) {
      return NextResponse.json(
        { error: 'Only the event creator can delete this event' },
        { status: 403 }
      );
    }
    
    // Get all attendees for notifications
    const attendees = await prisma.eventAttendee.findMany({
      where: { eventId: id },
      select: { userId: true },
    });
    
    // Execute deletion and notifications in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete the event (cascades to attendees and reminders)
      await tx.event.delete({
        where: { id },
      });
      
      // Create cancellation notifications for all attendees
      for (const attendee of attendees) {
        if (attendee.userId !== session.user.id) {
          await tx.notification.create({
            data: {
              userId: attendee.userId,
              type: 'EVENT_CANCELLED',
              title: 'Event Cancelled',
              message: `The event "${event.title}" has been cancelled`,
              data: JSON.stringify({
                eventId: id,
                eventTitle: event.title,
              }),
              isRead: false,
            },
          });
        }
      }
      
      // Log the deletion
      await tx.analyticsEvent.create({
        data: {
          userId: session.user.id,
          type: 'EVENT_DELETED',
          data: JSON.stringify({
            eventId: id,
            eventTitle: event.title,
          }),
        },
      });
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json(
      { error: 'Failed to delete event' },
      { status: 500 }
    );
  }
}
