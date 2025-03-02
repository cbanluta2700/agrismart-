import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

// Schema for event category creation
const categorySchema = z.object({
  name: z.string().min(2).max(50),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
    message: 'Must be a valid hex color code',
  }),
});

// Default categories to create if none exist
const DEFAULT_CATEGORIES = [
  { name: 'Agriculture', color: '#10b981' },  // Green
  { name: 'Workshop', color: '#3b82f6' },     // Blue
  { name: 'Community', color: '#f59e0b' },    // Amber
  { name: 'Market', color: '#ef4444' },       // Red
  { name: 'Training', color: '#8b5cf6' },     // Purple
  { name: 'Conference', color: '#6366f1' },   // Indigo
  { name: 'Field Trip', color: '#0ea5e9' },   // Sky blue
  { name: 'Festival', color: '#ec4899' },     // Pink
];

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get all event categories
    let categories = await prisma.eventCategory.findMany({
      orderBy: {
        name: 'asc',
      },
    });
    
    // If no categories exist, seed the default ones
    if (categories.length === 0) {
      // Create default categories in a transaction
      await prisma.$transaction(
        DEFAULT_CATEGORIES.map(category =>
          prisma.eventCategory.create({
            data: category,
          })
        )
      );
      
      // Get the newly created categories
      categories = await prisma.eventCategory.findMany({
        orderBy: {
          name: 'asc',
        },
      });
    }
    
    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching event categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch event categories' },
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
    
    // Parse and validate request body
    const data = await request.json();
    const validatedData = categorySchema.parse(data);
    
    // Check if a category with the same name already exists
    const existingCategory = await prisma.eventCategory.findFirst({
      where: {
        name: {
          equals: validatedData.name,
          mode: 'insensitive', // Case-insensitive comparison
        },
      },
    });
    
    if (existingCategory) {
      return NextResponse.json(
        { error: 'A category with this name already exists' },
        { status: 400 }
      );
    }
    
    // Create the new category
    const newCategory = await prisma.eventCategory.create({
      data: {
        name: validatedData.name,
        color: validatedData.color,
      },
    });
    
    return NextResponse.json(newCategory, { status: 201 });
  } catch (error) {
    console.error('Error creating event category:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create event category' },
      { status: 500 }
    );
  }
}
