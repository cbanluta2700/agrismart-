import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { z } from 'zod';

// Schema for event creation
const eventSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().optional(),
  location: z.string().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  isAllDay: z.boolean().default(false),
  recurrence: z.string().optional(),
  backgroundColor: z.string().optional(),
  borderColor: z.string().optional(),
  url: z.string().url().optional(),
  groupId: z.string().optional(),
  isPublic: z.boolean().default(false),
  categories: z.array(z.string()).optional(),
  attendees: z.array(z.string()).optional(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse query parameters
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');
    const groupId = searchParams.get('groupId');
    const includePublic = searchParams.get('includePublic') === 'true';
    
    // Default to current month if no date range provided
    const now = new Date();
    const start = startParam ? parseISO(startParam) : startOfMonth(now);
    const end = endParam ? parseISO(endParam) : endOfMonth(now);
    
    // Build query filters
    const whereClause: any = {
      startDate: { lte: end },
      endDate: { gte: start },
      OR: [
        { creatorId: session.user.id },
        { attendees: { some: { userId: session.user.id } } },
      ],
    };
    
    // Add group filter if provided
    if (groupId) {
      whereClause.groupId = groupId;
    }
    
    // Include public events if requested
    if (includePublic) {
      whereClause.OR.push({ isPublic: true });
    }
    
    // Fetch events matching the criteria
    const events = await prisma.event.findMany({
      where: whereClause,
      include: {
        categories: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        attendees: {
          select: {
            id: true,
            userId: true,
            status: true,
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
      },
      orderBy: {
        startDate: 'asc',
      },
    });
    
    // Format the events for the client
    const formattedEvents = events.map(event => ({
      id: event.id,
      title: event.title,
      description: event.description,
      location: event.location,
      start: event.startDate,
      end: event.endDate,
      allDay: event.isAllDay,
      backgroundColor: event.backgroundColor,
      borderColor: event.borderColor,
      url: event.url,
      recurrence: event.recurrence,
      groupId: event.groupId,
      groupName: event.group?.name,
      isPublic: event.isPublic,
      creator: event.creator,
      categories: event.categories,
      attendees: event.attendees,
      editable: event.creatorId === session.user.id,
    }));
    
    return NextResponse.json(formattedEvents);
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const data = await request.json();
    const validatedData = eventSchema.parse(data);
    
    // Parse dates from strings
    const startDate = parseISO(validatedData.startDate);
    const endDate = parseISO(validatedData.endDate);
    
    // Verify group access if group specified
    if (validatedData.groupId) {
      const membership = await prisma.groupMember.findFirst({
        where: {
          groupId: validatedData.groupId,
          userId: session.user.id,
        },
      });
      
      if (!membership) {
        return NextResponse.json(
          { error: 'You are not a member of this group' },
          { status: 403 }
        );
      }
    }
    
    // Create the event in a transaction to handle categories and attendees
    const event = await prisma.$transaction(async (tx) => {
      // Create the event
      const newEvent = await tx.event.create({
        data: {
          title: validatedData.title,
          description: validatedData.description,
          location: validatedData.location,
          startDate,
          endDate,
          isAllDay: validatedData.isAllDay,
          recurrence: validatedData.recurrence,
          backgroundColor: validatedData.backgroundColor,
          borderColor: validatedData.borderColor,
          url: validatedData.url,
          groupId: validatedData.groupId,
          isPublic: validatedData.isPublic,
          creatorId: session.user.id,
        },
      });
      
      // Connect categories if provided
      if (validatedData.categories && validatedData.categories.length > 0) {
        for (const categoryId of validatedData.categories) {
          await tx.event.update({
            where: { id: newEvent.id },
            data: {
              categories: {
                connect: { id: categoryId },
              },
            },
          });
        }
      }
      
      // Add attendees if provided
      if (validatedData.attendees && validatedData.attendees.length > 0) {
        for (const userId of validatedData.attendees) {
          await tx.eventAttendee.create({
            data: {
              eventId: newEvent.id,
              userId,
              status: 'PENDING',
            },
          });
          
          // Create a notification for the attendee
          await tx.notification.create({
            data: {
              userId,
              type: 'EVENT_INVITATION',
              title: 'Event Invitation',
              message: `You've been invited to ${validatedData.title}`,
              data: JSON.stringify({
                eventId: newEvent.id,
                eventTitle: validatedData.title,
                startDate: startDate.toISOString(),
              }),
              isRead: false,
            },
          });
        }
      }
      
      // Log analytics event
      await tx.analyticsEvent.create({
        data: {
          userId: session.user.id,
          type: 'EVENT_CREATED',
          data: JSON.stringify({
            eventId: newEvent.id,
            eventTitle: newEvent.title,
            isGroupEvent: !!newEvent.groupId,
          }),
        },
      });
      
      return newEvent;
    });
    
    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error('Error creating event:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 }
    );
  }
}
