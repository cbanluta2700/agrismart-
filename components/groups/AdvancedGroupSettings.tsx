import React, { useState } from 'react';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Plus, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Define validation schema for advanced group settings
const advancedSettingsSchema = z.object({
  displayName: z.string().min(3).max(50),
  description: z.string().max(500).optional(),
  isPrivate: z.boolean().default(false),
  allowJoinRequests: z.boolean().default(true),
  requireApproval: z.boolean().default(false),
  allowMemberPosts: z.boolean().default(true),
  allowMemberComments: z.boolean().default(true),
  enableContentReview: z.boolean().default(false),
  enableAutoMembership: z.boolean().default(false),
  membershipCriteria: z.string().optional(),
  joinMessage: z.string().max(1000).optional(),
  groupIcon: z.string().optional(),
  groupBanner: z.string().optional(),
  customTheme: z.string().optional(),
  maxMembers: z.number().min(10).max(10000).optional(),
});

// TypeScript type based on the schema
type AdvancedSettingsFormValues = z.infer<typeof advancedSettingsSchema>;

interface AdvancedGroupSettingsProps {
  groupId: string;
  initialSettings: any;
  isOwner: boolean;
}

export default function AdvancedGroupSettings({ 
  groupId, 
  initialSettings, 
  isOwner 
}: AdvancedGroupSettingsProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rules, setRules] = useState<string[]>(initialSettings.rules || []);
  const [newRule, setNewRule] = useState('');
  const [topics, setTopics] = useState<string[]>(initialSettings.topics || []);
  const [newTopic, setNewTopic] = useState('');
  
  // Initialize form with existing settings
  const { register, handleSubmit, formState: { errors }, watch } = useForm<AdvancedSettingsFormValues>({
    resolver: zodResolver(advancedSettingsSchema),
    defaultValues: {
      displayName: initialSettings.displayName || '',
      description: initialSettings.description || '',
      isPrivate: initialSettings.isPrivate || false,
      allowJoinRequests: initialSettings.allowJoinRequests || true,
      requireApproval: initialSettings.requireApproval || false,
      allowMemberPosts: initialSettings.allowMemberPosts || true,
      allowMemberComments: initialSettings.allowMemberComments || true,
      enableContentReview: initialSettings.enableContentReview || false,
      enableAutoMembership: initialSettings.enableAutoMembership || false,
      membershipCriteria: initialSettings.membershipCriteria || '',
      joinMessage: initialSettings.joinMessage || '',
      groupIcon: initialSettings.groupIcon || '',
      groupBanner: initialSettings.groupBanner || '',
      customTheme: initialSettings.customTheme || '',
      maxMembers: initialSettings.maxMembers || 1000,
    },
  });
  
  // Watch for changes in form values
  const isPrivate = watch('isPrivate');
  const requireApproval = watch('requireApproval');
  const enableAutoMembership = watch('enableAutoMembership');
  
  // Add rule to the list
  const addRule = () => {
    if (newRule.trim() && !rules.includes(newRule.trim())) {
      setRules([...rules, newRule.trim()]);
      setNewRule('');
    }
  };
  
  // Remove rule from the list
  const removeRule = (ruleToRemove: string) => {
    setRules(rules.filter(rule => rule !== ruleToRemove));
  };
  
  // Add topic to the list
  const addTopic = () => {
    if (newTopic.trim() && !topics.includes(newTopic.trim())) {
      setTopics([...topics, newTopic.trim()]);
      setNewTopic('');
    }
  };
  
  // Remove topic from the list
  const removeTopic = (topicToRemove: string) => {
    setTopics(topics.filter(topic => topic !== topicToRemove));
  };
  
  // Submit handler
  const onSubmit = async (data: AdvancedSettingsFormValues) => {
    setIsSubmitting(true);
    
    try {
      // Combine form data with rules and topics
      const settingsData = {
        ...data,
        rules,
        topics,
      };
      
      // Submit the settings to the API
      await axios.put(`/api/forum/groups/${groupId}/settings`, settingsData);
      
      toast({
        title: 'Settings Updated',
        description: 'The group settings have been updated successfully.',
      });
    } catch (error) {
      console.error('Error updating group settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to update group settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Only group owners can edit advanced settings
  if (!isOwner) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Advanced Group Settings</CardTitle>
          <CardDescription>
            Only the group owner can modify these settings.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid grid-cols-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="membership">Membership</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
        </TabsList>
        
        {/* General Settings Tab */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Group Information</CardTitle>
              <CardDescription>
                Basic information about your group
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Group Name</Label>
                <Input
                  id="displayName"
                  {...register('displayName')}
                />
                {errors.displayName && (
                  <p className="text-sm text-red-500">{errors.displayName.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...register('description')}
                  rows={4}
                />
                {errors.description && (
                  <p className="text-sm text-red-500">{errors.description.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label>Group Topics</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {topics.map((topic, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {topic}
                      <button
                        type="button"
                        onClick={() => removeTopic(topic)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a topic"
                    value={newTopic}
                    onChange={(e) => setNewTopic(e.target.value)}
                  />
                  <Button type="button" size="sm" onClick={addTopic}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="maxMembers">Maximum Members</Label>
                <Input
                  id="maxMembers"
                  type="number"
                  {...register('maxMembers', { valueAsNumber: true })}
                />
                {errors.maxMembers && (
                  <p className="text-sm text-red-500">{errors.maxMembers.message}</p>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Group Rules</CardTitle>
              <CardDescription>
                Set rules for your group members to follow
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex flex-col gap-2 mb-2">
                  {rules.map((rule, index) => (
                    <div key={index} className="flex items-center justify-between border p-2 rounded-md">
                      <span className="text-sm">{rule}</span>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => removeRule(rule)}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a rule"
                    value={newRule}
                    onChange={(e) => setNewRule(e.target.value)}
                  />
                  <Button type="button" size="sm" onClick={addRule}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Membership Settings Tab */}
        <TabsContent value="membership" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Membership Settings</CardTitle>
              <CardDescription>
                Configure who can join your group and how
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between space-y-2">
                <Label htmlFor="isPrivate">Private Group</Label>
                <Switch
                  id="isPrivate"
                  {...register('isPrivate')}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Private groups are only visible to members
              </p>
              
              <div className="flex items-center justify-between space-y-2">
                <Label htmlFor="allowJoinRequests">Allow Join Requests</Label>
                <Switch
                  id="allowJoinRequests"
                  {...register('allowJoinRequests')}
                  disabled={!isPrivate}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {isPrivate ? 'Allow users to request to join this private group' : 'This setting only applies to private groups'}
              </p>
              
              <div className="flex items-center justify-between space-y-2">
                <Label htmlFor="requireApproval">Require Approval</Label>
                <Switch
                  id="requireApproval"
                  {...register('requireApproval')}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                New members must be approved by a moderator or owner
              </p>
              
              <div className="flex items-center justify-between space-y-2">
                <Label htmlFor="enableAutoMembership">Enable Auto-Membership</Label>
                <Switch
                  id="enableAutoMembership"
                  {...register('enableAutoMembership')}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Automatically approve users who meet certain criteria
              </p>
              
              {enableAutoMembership && (
                <div className="space-y-2">
                  <Label htmlFor="membershipCriteria">Membership Criteria</Label>
                  <Select
                    onValueChange={(value) => {
                      // Update the form value
                    }}
                    defaultValue={initialSettings.membershipCriteria || 'reputation'}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select criteria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reputation">Minimum Reputation</SelectItem>
                      <SelectItem value="age">Account Age</SelectItem>
                      <SelectItem value="posts">Post Count</SelectItem>
                      <SelectItem value="location">Location</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="joinMessage">Welcome Message</Label>
                <Textarea
                  id="joinMessage"
                  {...register('joinMessage')}
                  placeholder="Message to display to new members when they join"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Content Settings Tab */}
        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Content Settings</CardTitle>
              <CardDescription>
                Manage who can post and comment in the group
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between space-y-2">
                <Label htmlFor="allowMemberPosts">Allow Member Posts</Label>
                <Switch
                  id="allowMemberPosts"
                  {...register('allowMemberPosts')}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                If disabled, only moderators and owners can create posts
              </p>
              
              <div className="flex items-center justify-between space-y-2">
                <Label htmlFor="allowMemberComments">Allow Member Comments</Label>
                <Switch
                  id="allowMemberComments"
                  {...register('allowMemberComments')}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                If disabled, only moderators and owners can comment on posts
              </p>
              
              <div className="flex items-center justify-between space-y-2">
                <Label htmlFor="enableContentReview">Enable Content Review</Label>
                <Switch
                  id="enableContentReview"
                  {...register('enableContentReview')}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                All posts must be approved by a moderator before being visible to members
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Appearance Settings Tab */}
        <TabsContent value="appearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Appearance Settings</CardTitle>
              <CardDescription>
                Customize how your group looks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="groupIcon">Group Icon URL</Label>
                <Input
                  id="groupIcon"
                  {...register('groupIcon')}
                  placeholder="https://example.com/icon.png"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="groupBanner">Group Banner URL</Label>
                <Input
                  id="groupBanner"
                  {...register('groupBanner')}
                  placeholder="https://example.com/banner.png"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="customTheme">Custom Theme</Label>
                <Select
                  onValueChange={(value) => {
                    // Update the form value
                  }}
                  defaultValue={initialSettings.customTheme || 'default'}
                >
                  <SelectTrigger id="customTheme">
                    <SelectValue placeholder="Select a theme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="nature">Nature</SelectItem>
                    <SelectItem value="farming">Farming</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <CardFooter className="flex justify-end pt-6">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Settings'
          )}
        </Button>
      </CardFooter>
    </form>
  );
}
