import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import AdminLayout from '@/components/layouts/AdminLayout';
import CommentModerationPanel from '@/components/moderation/CommentModerationPanel';
import { trackAdminModerationPageView } from '@/lib/vercel/moderation-analytics';

export const metadata: Metadata = {
  title: 'Comment Moderation | AgriSmart Admin',
  description: 'Review and moderate user comments',
};

export default async function CommentModerationPage() {
  // Check user session and permissions
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/admin/comment-moderation');
  }
  
  // Check if user has moderation permissions
  const userRoles = await prisma.userRole.findMany({
    where: {
      userId: session.user.id,
      role: {
        in: ['ADMIN', 'MODERATOR']
      }
    }
  });
  
  if (userRoles.length === 0) {
    redirect('/dashboard');
  }
  
  // Track page view in Vercel Analytics
  trackAdminModerationPageView({
    userId: session.user.id,
    section: 'comments'
  });
  
  // Get initial comments that need review
  const pendingComments = await prisma.moderatedContent.findMany({
    where: {
      contentType: 'COMMENT',
      moderationStatus: 'NEEDS_REVIEW'
    },
    take: 10,
    orderBy: {
      createdAt: 'desc'
    },
    include: {
      content: {
        select: {
          id: true,
          content: true,
          visible: true,
          createdAt: true,
          updatedAt: true,
          postId: true,
          authorId: true,
        }
      }
    }
  });
  
  // Get author information for each comment
  const commentAuthorIds = pendingComments.map(pc => pc.content?.authorId).filter(Boolean) as string[];
  
  const authors = await prisma.user.findMany({
    where: {
      id: {
        in: commentAuthorIds
      }
    },
    select: {
      id: true,
      name: true,
      avatar: true
    }
  });
  
  // Get post titles
  const postIds = pendingComments.map(pc => pc.content?.postId).filter(Boolean) as string[];
  
  const posts = await prisma.forumPost.findMany({
    where: {
      id: {
        in: postIds
      }
    },
    select: {
      id: true,
      title: true
    }
  });
  
  // Format comments for the UI component
  const formattedComments = pendingComments.map(pc => {
    const comment = pc.content;
    if (!comment) return null;
    
    const author = authors.find(a => a.id === comment.authorId);
    const post = posts.find(p => p.id === comment.postId);
    
    return {
      id: comment.id,
      content: comment.content as string,
      visible: comment.visible as boolean,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
      postId: comment.postId as string,
      post: post ? { title: post.title } : undefined,
      author: {
        id: author?.id || 'unknown',
        name: author?.name || 'Unknown User',
        avatar: author?.avatar
      },
      moderation: {
        status: pc.moderationStatus,
        reason: pc.reason || undefined,
        token: pc.token || undefined
      }
    };
  }).filter(Boolean);
  
  return (
    <AdminLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Comment Moderation</h1>
        <p className="text-gray-600 mb-6">
          Review and moderate user comments. Comments flagged by our AI or rule-based moderation system
          will appear here for manual review.
        </p>
        
        {/* Pass the formatted comments to the moderation panel */}
        <CommentModerationPanel initialComments={formattedComments as any} />
      </div>
    </AdminLayout>
  );
}
