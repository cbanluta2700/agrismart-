'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import MembersTab from './tabs/members-tab';
import ContentTab from './tabs/content-tab';
import SettingsTab from './tabs/settings-tab';
import LogsTab from './tabs/logs-tab';
import ReportsTab from './tabs/reports-tab';
import { GroupSettings } from "@/types/moderation";
import useAnalytics from '@/hooks/useAnalytics';

interface Group {
  id: string;
  name: string;
  description?: string | null;
  owner: {
    id: string;
    name: string;
    avatar?: string | null;
  };
  settings?: {
    id: string;
    allowJoinRequests: boolean;
    requireApproval: boolean;
    allowMemberPosts: boolean;
    isPrivate: boolean;
    rules: string[];
  } | null;
}

interface ModerationTabsProps {
  group: Group;
  memberCount: number;
  postCount: number;
  isOwner: boolean;
  userRole: string;
}

export default function ModerationTabs({
  group,
  memberCount,
  postCount,
  isOwner,
  userRole,
}: ModerationTabsProps) {
  const [activeTab, setActiveTab] = useState('members');
  const [settings, setSettings] = useState<GroupSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const analytics = useAnalytics();

  useEffect(() => {
    // Track moderation page view
    analytics.trackEvent({
      type: 'MODERATION_PAGE_VIEW',
      entityType: 'GROUP',
      entityId: group.id,
      metadata: {
        groupName: group.name,
        userRole: userRole,
        isOwner
      }
    });
  }, [analytics, group.id, group.name, userRole, isOwner]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch(`/api/forum/groups/${group.id}/settings`);
        if (response.ok) {
          const data = await response.json();
          setSettings(data);
        }
      } catch (error) {
        console.error("Error fetching group settings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [group.id]);

  return (
    <Tabs
      defaultValue="members"
      onValueChange={(value) => {
        setActiveTab(value);
        // Track tab change
        analytics.trackEvent({
          type: 'MODERATION_TAB_CHANGE',
          entityType: 'GROUP',
          entityId: group.id,
          metadata: {
            tabName: value,
            groupName: group.name
          }
        });
      }}
      className="w-full"
    >
      <TabsList className="grid grid-cols-5 mb-6">
        <TabsTrigger value="members">Members</TabsTrigger>
        <TabsTrigger value="content">Content</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
        <TabsTrigger value="reports">Reports</TabsTrigger>
        <TabsTrigger value="logs">Logs</TabsTrigger>
      </TabsList>
      
      <Card>
        <TabsContent value="members" className="p-0">
          <MembersTab 
            groupId={group.id} 
            isOwner={isOwner} 
            userRole={userRole}
            memberCount={memberCount}
          />
        </TabsContent>
        
        <TabsContent value="content" className="p-0">
          <ContentTab 
            groupId={group.id} 
            postCount={postCount}
          />
        </TabsContent>
        
        <TabsContent value="settings" className="p-0">
          {settings && <SettingsTab 
            groupId={group.id} 
            initialSettings={settings}
          />}
        </TabsContent>
        
        <TabsContent value="reports" className="p-0">
          <ReportsTab groupId={group.id} />
        </TabsContent>
        
        <TabsContent value="logs" className="p-0">
          <LogsTab groupId={group.id} />
        </TabsContent>
      </Card>
    </Tabs>
  );
}
