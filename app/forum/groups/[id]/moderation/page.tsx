import { Metadata } from 'next';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import ModerationTabs from './moderation-tabs';

interface ModerationPageProps {
  params: {
    id: string;
  };
}

export async function generateMetadata({ params }: ModerationPageProps): Promise<Metadata> {
  const group = await prisma.group.findUnique({
    where: { id: params.id },
    select: { name: true },
  });

  return {
    title: group ? `Moderate ${group.name} | AgriSmart` : 'Group Moderation | AgriSmart',
    description: 'Moderate group content, manage members, and configure group settings',
  };
}

export default async function GroupModerationPage({ params }: ModerationPageProps) {
  const { id } = params;
  const session = await auth();
  
  if (!session?.user) {
    redirect(`/auth/login?callbackUrl=/forum/groups/${id}/moderation`);
  }
  
  // Check if user is a moderator or admin of the group
  const groupMember = await prisma.groupMember.findFirst({
    where: {
      groupId: id,
      userId: session.user.id,
      role: { in: ['ADMIN', 'MODERATOR'] },
    },
  });
  
  // If not a moderator or admin, redirect to the group page
  if (!groupMember) {
    redirect(`/forum/groups/${id}`);
  }
  
  // Get group details
  const group = await prisma.group.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, avatar: true } },
      settings: true,
    },
  });
  
  if (!group) {
    redirect('/forum/groups');
  }
  
  // Get group stats
  const [memberCount, postCount] = await Promise.all([
    prisma.groupMember.count({ where: { groupId: id } }),
    prisma.forumPost.count({ where: { groupId: id } }),
  ]);
  
  // Check if user is the owner
  const isOwner = group.owner.id === session.user.id;
  
  return (
    <div className="container py-8 max-w-6xl">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold">Moderate: {group.name}</h1>
          <p className="text-muted-foreground mt-1">
            Manage members, moderate content, and configure group settings
          </p>
        </div>
        
        <ModerationTabs 
          group={group} 
          memberCount={memberCount} 
          postCount={postCount} 
          isOwner={isOwner} 
          userRole={groupMember.role}
        />
      </div>
    </div>
  );
}
