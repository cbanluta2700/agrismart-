import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

// Define schema for search query validation
const searchQuerySchema = z.object({
  q: z.string().min(2).max(100),
  limit: z.coerce.number().min(1).max(50).optional().default(10),
  groupId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  includePublic: z.coerce.boolean().optional().default(true),
});

export const runtime = 'edge';
export const revalidate = 60; // Revalidate the data at most every 60 seconds

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get search parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    // Validate parameters
    const { q, limit, groupId, startDate, endDate, includePublic } = searchQuerySchema.parse(queryParams);
    
    // Build query filters
    const filters: any = {
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { location: { contains: q, mode: 'insensitive' } },
      ],
      AND: [
        {
          OR: [
            { creatorId: session.user.id }, // User's events
            { isPublic: includePublic }, // Public events if requested
            {
              attendees: {
                some: {
                  userId: session.user.id,
                },
              },
            }, // Events user is attending
          ],
        },
      ],
    };
    
    // Add date filters if provided
    if (startDate || endDate) {
      const dateFilter: any = {};
      
      if (startDate) {
        dateFilter.gte = new Date(startDate);
      }
      
      if (endDate) {
        dateFilter.lte = new Date(endDate);
      }
      
      filters.AND.push({
        OR: [
          { startDate: dateFilter },
          { endDate: dateFilter },
        ],
      });
    }
    
    // Add group filter if provided
    if (groupId) {
      filters.AND.push({ groupId });
    }
    
    // Execute search query
    const events = await prisma.event.findMany({
      where: filters,
      take: limit,
      orderBy: {
        startDate: 'asc',
      },
      select: {
        id: true,
        title: true,
        description: true,
        location: true,
        startDate: true,
        endDate: true,
        isAllDay: true,
        isPublic: true,
        groupId: true,
        group: {
          select: {
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
        categories: {
          select: {
            category: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        },
        attendees: {
          where: {
            userId: session.user.id,
          },
          select: {
            status: true,
          },
        },
      },
    });
    
    // Format results
    const formattedEvents = events.map((event) => ({
      id: event.id,
      title: event.title,
      description: event.description,
      location: event.location,
      start: event.startDate,
      end: event.endDate,
      allDay: event.isAllDay,
      groupId: event.groupId,
      groupName: event.group?.name,
      categories: event.categories.map((ec) => ({
        id: ec.category.id,
        name: ec.category.name,
        color: ec.category.color,
      })),
      creator: event.creator,
      userStatus: event.attendees[0]?.status || null,
      editable: event.creator.id === session.user.id,
    }));
    
    // Set cache control headers
    const headers = new Headers({
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      'Content-Type': 'application/json',
    });
    
    return NextResponse.json(formattedEvents, { headers });
    
  } catch (error: any) {
    console.error('Error searching events:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid search parameters', details: error.errors }, { status: 400 });
    }
    
    return NextResponse.json({ error: 'Failed to search events' }, { status: 500 });
  }
}
