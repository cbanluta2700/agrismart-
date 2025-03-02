import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// Schema for group creation
const groupSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().optional(),
});

// GET all groups with pagination
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || '1');
  const limit = Number(searchParams.get('limit') || '10');
  const search = searchParams.get('search') || undefined;
  
  const skip = (page - 1) * limit;
  
  try {
    // Build where clause based on search param
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};
    
    const [groups, total] = await Promise.all([
      prisma.group.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: { members: true, posts: true },
          },
        },
      }),
      prisma.group.count({ where }),
    ]);
    
    return NextResponse.json({
      groups,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Failed to fetch groups' },
      { status: 500 }
    );
  }
}

// POST a new group
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const json = await request.json();
    const validatedData = groupSchema.parse(json);
    
    // Create the group with the current user as owner
    const group = await prisma.group.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        ownerId: session.user.id,
        // Automatically add owner as a member with ADMIN role
        members: {
          create: {
            userId: session.user.id,
            role: 'ADMIN',
          },
        },
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    
    return NextResponse.json(group);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    
    console.error(error);
    return NextResponse.json(
      { error: 'Failed to create group' },
      { status: 500 }
    );
  }
}
