import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// Schema for comment updates
const commentUpdateSchema = z.object({
  content: z.string().min(2),
});

interface RouteParams {
  params: {
    id: string;
  };
}

// PUT (update) a comment
export async function PUT(request: Request, { params }: RouteParams) {
  const { id } = params;
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // Verify comment exists and user is the author
    const existingComment = await prisma.comment.findUnique({
      where: { id },
      select: { authorId: true },
    });
    
    if (!existingComment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }
    
    if (existingComment.authorId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Parse and validate update data
    const json = await request.json();
    const validatedData = commentUpdateSchema.parse(json);
    
    // Update the comment
    const updatedComment = await prisma.comment.update({
      where: { id },
      data: { content: validatedData.content },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });
    
    return NextResponse.json(updatedComment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    
    console.error(error);
    return NextResponse.json(
      { error: 'Failed to update comment' },
      { status: 500 }
    );
  }
}

// DELETE a comment
export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = params;
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // Verify comment exists and user is the author or admin
    const existingComment = await prisma.comment.findUnique({
      where: { id },
      select: { authorId: true },
    });
    
    if (!existingComment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }
    
    // Check if user is authorized to delete the comment
    const isAdmin = session.user.roles?.includes('ADMIN');
    if (existingComment.authorId !== session.user.id && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Delete the comment
    await prisma.comment.delete({ where: { id } });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Failed to delete comment' },
      { status: 500 }
    );
  }
}
