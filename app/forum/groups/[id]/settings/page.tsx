import React from 'react';
import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdvancedGroupSettings from '@/components/groups/AdvancedGroupSettings';
import GroupRolesManager from '@/components/groups/GroupRolesManager';
import GroupAnalytics from '@/components/groups/GroupAnalytics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export const metadata: Metadata = {
  title: 'Group Settings | AgriSmart',
  description: 'Manage group settings, roles, and analytics',
};

async function getGroupData(groupId: string, userId: string) {
  const group = await prisma.group.findUnique({
    where: {
      id: groupId,
    },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
        },
      },
      settings: true,
      members: {
        where: {
          userId,
        },
        select: {
          role: true,
        },
      },
    },
  });
  
  return group;
}

export default async function GroupSettingsPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return redirect('/api/auth/signin');
  }
  
  const group = await getGroupData(params.id, session.user.id);
  
  if (!group) {
    return notFound();
  }
  
  // Check if user is owner or moderator
  const isOwner = group.ownerId === session.user.id;
  const userMember = group.members[0];
  const isModerator = userMember && userMember.role === 'MODERATOR';
  
  // If user is neither owner nor moderator, redirect to group page
  if (!isOwner && !isModerator) {
    return redirect(`/forum/groups/${params.id}`);
  }
  
  // Default settings if none exist
  const settings = group.settings || {
    allowJoinRequests: true,
    requireApproval: false,
    allowMemberPosts: true,
    isPrivate: false,
    rules: [],
    allowMemberComments: true,
    enableContentReview: false,
    enableAutoMembership: false,
    topics: [],
  };
  
  return (
    <div className="container py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{group.name} - Settings</h1>
        <p className="text-muted-foreground">
          Manage your group's settings, roles, and analytics
        </p>
      </div>
      
      <Separator />
      
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general">General Settings</TabsTrigger>
          <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general" className="py-4">
          <AdvancedGroupSettings 
            groupId={params.id} 
            initialSettings={{
              displayName: group.name,
              description: group.description,
              ...settings,
            }}
            isOwner={isOwner}
          />
        </TabsContent>
        
        <TabsContent value="roles" className="py-4">
          <GroupRolesManager
            groupId={params.id}
            isOwner={isOwner}
          />
        </TabsContent>
        
        <TabsContent value="analytics" className="py-4">
          <GroupAnalytics
            groupId={params.id}
            isOwner={isOwner}
            isModerator={isModerator}
          />
        </TabsContent>
      </Tabs>
      
      {!isOwner && (
        <Card>
          <CardHeader>
            <CardTitle>Permissions Notice</CardTitle>
            <CardDescription>
              Some features may be limited based on your role in the group.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>
              Only the group owner has full access to all settings. If you need additional
              permissions, please contact the group owner: {group.owner.name}.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
