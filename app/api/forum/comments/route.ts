import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ContentType, ModerationStatus } from '@prisma/client';
import { 
  updateModeratedContent, 
  getModeratedContent,
  logCommentModeration,
  generateModerationToken
} from '@/lib/moderation/database-moderation-service';
import { cachedResponse } from '@/lib/vercel/cache-control';
import { getModerationFeatureFlag } from '@/lib/vercel/edge-config';
import { applyModerationRules } from '@/lib/moderation/rules';
import { checkContentWithAI } from '@/lib/moderation/ai-check';

// Schema for comment creation
const commentSchema = z.object({
  content: z.string().min(2),
  postId: z.string().uuid(),
});

// Schema for comment update
const updateCommentSchema = z.object({
  content: z.string().min(2),
});

// Schema for comment moderation update
const moderationSchema = z.object({
  moderationToken: z.string().optional(),
  moderationAction: z.enum(['APPROVE', 'REJECT', 'EDIT']).optional(),
  moderationReason: z.string().optional(),
  moderatedContent: z.string().optional(),
});

// POST a new comment
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const json = await request.json();
    const validatedData = commentSchema.parse(json);
    
    // Verify post exists
    const post = await prisma.forumPost.findUnique({
      where: { id: validatedData.postId },
    });
    
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }
    
    // Check if AI moderation is enabled
    const useAI = await getModerationFeatureFlag('enableAIModeration', true);
    let moderationStatus: ModerationStatus = 'PENDING';
    let aiResult = null;
    
    // If AI moderation is enabled, check content
    if (useAI) {
      aiResult = await checkContentWithAI(
        validatedData.content,
        'COMMENT'
      );
      
      // Apply moderation rules
      const ruleResult = await applyModerationRules(
        'COMMENT',
        validatedData.content,
        { userId: session.user.id, postId: validatedData.postId }
      );
      
      // If content passes all checks, auto-approve
      if (!aiResult.flagged && !ruleResult.autoFlagged) {
        moderationStatus = 'AUTO_APPROVED';
      } else if (aiResult.flagged || ruleResult.autoFlagged) {
        moderationStatus = 'NEEDS_REVIEW';
      }
    }
    
    // Create the comment
    const comment = await prisma.comment.create({
      data: {
        content: validatedData.content,
        postId: validatedData.postId,
        authorId: session.user.id,
        visible: moderationStatus === 'AUTO_APPROVED', // Only auto-visible if approved
      },
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
    
    // Store moderation state in the database
    await updateModeratedContent(
      'COMMENT',
      comment.id,
      {
        originalContent: validatedData.content,
        moderationStatus: moderationStatus,
        aiScore: aiResult?.confidenceScore,
      }
    );
    
    // Generate moderation token if needed
    let moderationToken = null;
    if (moderationStatus === 'PENDING' || moderationStatus === 'NEEDS_REVIEW') {
      moderationToken = await generateModerationToken(
        'COMMENT',
        comment.id,
        session.user.id,
        24, // 24 hours expiration
        5,  // 5 max usages
        'New comment requires review'
      );
    }
    
    // Return with moderation info
    return NextResponse.json({
      ...comment,
      moderation: {
        status: moderationStatus,
        token: moderationToken?.token,
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    
    console.error(error);
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    );
  }
}

// GET comments for a post
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const postId = searchParams.get('postId');
  
  if (!postId) {
    return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
  }
  
  try {
    const session = await auth();
    const userId = session?.user?.id;
    
    // Check if user has moderation privileges
    let isModerator = false;
    if (userId) {
      const userRoles = await prisma.userRole.findMany({
        where: {
          userId,
          role: {
            in: ['ADMIN', 'MODERATOR']
          }
        }
      });
      isModerator = userRoles.length > 0;
    }
    
    // Base query to get comments
    const whereClause: any = { postId };
    
    // If not a moderator, only show visible comments
    if (!isModerator) {
      whereClause.visible = true;
    }
    
    const comments = await prisma.comment.findMany({
      where: whereClause,
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
    });
    
    // For moderators, include moderation info
    if (isModerator) {
      // Get moderation info for all comments
      const commentIds = comments.map(comment => comment.id);
      const moderationInfo = await prisma.moderatedContent.findMany({
        where: {
          contentType: 'COMMENT',
          contentId: { in: commentIds }
        }
      });
      
      // Map moderation info to comments
      const commentsWithModeration = comments.map(comment => {
        const modInfo = moderationInfo.find(m => m.contentId === comment.id);
        return {
          ...comment,
          moderation: modInfo ? {
            status: modInfo.moderationStatus,
            reason: modInfo.reason,
            modifiedContent: modInfo.modifiedContent,
          } : null
        };
      });
      
      return cachedResponse(commentsWithModeration, 
        { status: 200 },
        { duration: 'shortTerm', staleWhileRevalidate: true }
      );
    }
    
    // If not a moderator, just return the comments
    return cachedResponse(comments, 
      { status: 200 },
      { duration: 'mediumTerm', staleWhileRevalidate: true }
    );
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

// PUT to update a comment
export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get('id');
    
    if (!commentId) {
      return NextResponse.json({ error: 'Comment ID is required' }, { status: 400 });
    }
    
    // Get the existing comment
    const existingComment = await prisma.comment.findUnique({
      where: { id: commentId },
    });
    
    if (!existingComment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }
    
    // Check if user is authorized to update
    const isAdmin = await prisma.userRole.findFirst({
      where: {
        userId: session.user.id,
        role: 'ADMIN'
      }
    });
    
    if (existingComment.authorId !== session.user.id && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const json = await request.json();
    const { content } = updateCommentSchema.parse(json);
    const { moderationToken, moderationAction, moderationReason, moderatedContent } = moderationSchema.parse(json);
    
    let updatedContent = content;
    let isModeration = false;
    
    // If this is a moderation action
    if (moderationToken && moderationAction) {
      // Verify moderation token (would happen in middleware)
      isModeration = true;
      
      // If edit action, use the moderated content
      if (moderationAction === 'EDIT' && moderatedContent) {
        updatedContent = moderatedContent;
      }
      
      // Update moderation status in database
      await updateModeratedContent(
        'COMMENT',
        commentId,
        {
          originalContent: existingComment.content,
          modifiedContent: moderatedContent,
          moderationStatus: moderationAction === 'APPROVE' ? 'APPROVED' : 
                           moderationAction === 'REJECT' ? 'REJECTED' : 'EDITED',
          moderatedById: session.user.id,
          reason: moderationReason
        }
      );
      
      // Log moderation action
      await logCommentModeration(
        commentId,
        moderationAction === 'APPROVE' ? 'APPROVE' : 
        moderationAction === 'REJECT' ? 'REJECT' : 'EDIT',
        {
          reviewerId: session.user.id,
          previousContent: existingComment.content,
          updatedContent: updatedContent,
          reason: moderationReason
        }
      );
    } else {
      // If not a moderation action, this is a regular user edit
      // Need to check for moderation again
      const useAI = await getModerationFeatureFlag('enableAIModeration', true);
      
      if (useAI) {
        const aiResult = await checkContentWithAI(content, 'COMMENT');
        const ruleResult = await applyModerationRules(
          'COMMENT',
          content,
          { userId: session.user.id, commentId }
        );
        
        // Update moderation status based on checks
        let moderationStatus: ModerationStatus = 'AUTO_APPROVED';
        if (aiResult.flagged || ruleResult.autoFlagged) {
          moderationStatus = 'NEEDS_REVIEW';
        }
        
        // Update moderation record
        await updateModeratedContent(
          'COMMENT',
          commentId,
          {
            originalContent: content,
            moderationStatus,
            aiScore: aiResult.confidenceScore
          }
        );
      }
    }
    
    // Update the comment in the database
    const updatedComment = await prisma.comment.update({
      where: { id: commentId },
      data: { 
        content: updatedContent,
        visible: isModeration ? 
          (moderationAction === 'APPROVE' || moderationAction === 'EDIT') : 
          existingComment.visible
      },
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
export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get('id');
    
    if (!commentId) {
      return NextResponse.json({ error: 'Comment ID is required' }, { status: 400 });
    }
    
    // Get the existing comment
    const existingComment = await prisma.comment.findUnique({
      where: { id: commentId },
    });
    
    if (!existingComment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }
    
    // Check if user is authorized to delete
    const isAdmin = await prisma.userRole.findFirst({
      where: {
        userId: session.user.id,
        role: 'ADMIN'
      }
    });
    
    if (existingComment.authorId !== session.user.id && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Log deletion as a moderation action if it's an admin
    if (isAdmin && existingComment.authorId !== session.user.id) {
      await logCommentModeration(
        commentId,
        'DELETE',
        {
          reviewerId: session.user.id,
          previousContent: existingComment.content,
          reason: 'Administrative deletion'
        }
      );
    }
    
    // Delete the comment
    await prisma.comment.delete({
      where: { id: commentId },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Failed to delete comment' },
      { status: 500 }
    );
  }
}

// Export config for Vercel Edge functions
export const config = {
  runtime: 'edge',
  regions: 'auto'
};
