import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// Schema for post updates
const postUpdateSchema = z.object({
  title: z.string().min(3).max(255).optional(),
  content: z.string().min(10).optional(),
});

interface RouteParams {
  params: {
    id: string;
  };
}

// GET a single post by ID with its comments
export async function GET(request: Request, { params }: RouteParams) {
  const { id } = params;
  
  try {
    const post = await prisma.forumPost.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                avatar: true,
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
      },
    });
    
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }
    
    return NextResponse.json(post);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Failed to fetch post' },
      { status: 500 }
    );
  }
}

// PUT (update) a post
export async function PUT(request: Request, { params }: RouteParams) {
  const { id } = params;
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // Verify post exists and user is the author
    const existingPost = await prisma.forumPost.findUnique({
      where: { id },
      select: { authorId: true },
    });
    
    if (!existingPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }
    
    if (existingPost.authorId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Parse and validate update data
    const json = await request.json();
    const validatedData = postUpdateSchema.parse(json);
    
    // Update the post
    const updatedPost = await prisma.forumPost.update({
      where: { id },
      data: validatedData,
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
    
    return NextResponse.json(updatedPost);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    
    console.error(error);
    return NextResponse.json(
      { error: 'Failed to update post' },
      { status: 500 }
    );
  }
}

// DELETE a post
export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = params;
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // Verify post exists and user is the author or admin
    const existingPost = await prisma.forumPost.findUnique({
      where: { id },
      select: { authorId: true },
    });
    
    if (!existingPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }
    
    // Check if user is authorized to delete the post
    const isAdmin = session.user.roles?.includes('ADMIN');
    if (existingPost.authorId !== session.user.id && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Delete the post and all associated comments
    await prisma.$transaction([
      prisma.comment.deleteMany({ where: { postId: id } }),
      prisma.forumPost.delete({ where: { id } }),
    ]);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Failed to delete post' },
      { status: 500 }
    );
  }
}
