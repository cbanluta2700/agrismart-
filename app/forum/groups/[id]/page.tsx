'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Edit, 
  Loader2, 
  MessageSquare, 
  MoreVertical, 
  Plus, 
  Trash, 
  User, 
  Users 
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import useAnalytics from '@/hooks/useAnalytics';

interface Member {
  id: string;
  userId: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    name: string;
    avatar: string | null;
  };
}

interface Post {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    avatar: string | null;
  };
  _count: {
    comments: number;
  };
}

interface Group {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  owner: {
    id: string;
    name: string;
    avatar: string | null;
  };
  members: Member[];
  createdAt: string;
  updatedAt: string;
}

export default function GroupPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { data: session } = useSession();
  const router = useRouter();
  const analytics = useAnalytics();
  const [group, setGroup] = useState<Group | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPostsLoading, setIsPostsLoading] = useState(false);
  const [isMembersLoading, setIsMembersLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  
  const isMember = group?.members.some(member => member.userId === session?.user.id) || false;
  const isOwner = group?.ownerId === session?.user.id;
  const isAdmin = isMember && (isOwner || members.find(m => m.userId === session?.user.id)?.role === 'ADMIN');

  // Track group view on component mount
  useEffect(() => {
    if (group?.id) {
      analytics.trackEvent({
        type: 'GROUP_VIEW',
        entityType: 'GROUP',
        entityId: group.id,
        metadata: { 
          groupName: group.name,
          isMember,
          isAdmin
        }
      });
    }
  }, [analytics, group, isMember, isAdmin]);

  // Fetch group data
  useEffect(() => {
    const fetchGroup = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/forum/groups/${id}`);
        if (!response.ok) {
          if (response.status === 404) {
            toast.error('Group not found');
            router.push('/forum/groups');
            return;
          }
          throw new Error('Failed to fetch group');
        }
        
        const data = await response.json();
        setGroup(data);
        
        // Check if current user is a member
        if (session?.user?.id) {
          const member = data.members.find(m => m.user.id === session.user.id);
          setIsMember(!!member);
        }
      } catch (error) {
        console.error('Error fetching group:', error);
        toast.error('Failed to load group');
      } finally {
        setIsLoading(false);
      }
    };

    fetchGroup();
  }, [id, router, session]);

  // Fetch group posts
  useEffect(() => {
    const fetchPosts = async () => {
      if (!group) return;
      
      setIsPostsLoading(true);
      try {
        const response = await fetch(`/api/forum/posts?groupId=${id}`);
        if (!response.ok) throw new Error('Failed to fetch posts');
        
        const data = await response.json();
        setPosts(data.posts);
      } catch (error) {
        console.error('Error fetching posts:', error);
        toast.error('Failed to load posts');
      } finally {
        setIsPostsLoading(false);
      }
    };

    fetchPosts();
  }, [id, group]);

  const joinGroup = async () => {
    if (!session?.user) {
      router.push(`/auth/login?callbackUrl=/forum/groups/${id}`);
      return;
    }

    setIsJoining(true);
    try {
      const response = await fetch(`/api/forum/groups/${id}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: session.user.id,
          role: 'MEMBER',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to join group');
      }

      toast.success('Successfully joined the group');
      setIsMember(true);
      
      // Track joining group
      analytics.trackEvent({
        type: 'GROUP_JOIN',
        entityType: 'GROUP',
        entityId: id,
        userId: session.user.id,
        metadata: { 
          groupName: group?.name
        }
      });
      
      // Refresh group data to update member list
      const groupResponse = await fetch(`/api/forum/groups/${id}`);
      if (groupResponse.ok) {
        const groupData = await groupResponse.json();
        setGroup(groupData);
      }
    } catch (error) {
      console.error('Error joining group:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to join group');
    } finally {
      setIsJoining(false);
    }
  };

  const leaveGroup = async () => {
    if (!session?.user || !group) return;

    setIsLeaving(true);
    try {
      // Cannot leave if you're the owner
      if (group.ownerId === session.user.id) {
        toast.error('As the owner, you cannot leave the group. Transfer ownership first or delete the group.');
        return;
      }

      const response = await fetch(`/api/forum/groups/${id}/members/${session.user.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to leave group');
      }

      toast.success('Successfully left the group');
      setIsMember(false);
      
      // Track leaving group
      analytics.trackEvent({
        type: 'GROUP_LEAVE',
        entityType: 'GROUP',
        entityId: id,
        userId: session.user.id,
        metadata: { 
          groupName: group.name
        }
      });
      
      // Refresh group data to update member list
      const groupResponse = await fetch(`/api/forum/groups/${id}`);
      if (groupResponse.ok) {
        const groupData = await groupResponse.json();
        setGroup(groupData);
      }
    } catch (error) {
      console.error('Error leaving group:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to leave group');
    } finally {
      setIsLeaving(false);
    }
  };

  const deleteGroup = async () => {
    if (!session?.user || !group) return;

    try {
      const response = await fetch(`/api/forum/groups/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete group');
      }

      toast.success('Group deleted successfully');
      router.push('/forum/groups');
    } catch (error) {
      console.error('Error deleting group:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete group');
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'MODERATOR':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="container mx-auto py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Group not found</h1>
        <Button asChild>
          <Link href="/forum/groups">Return to Groups</Link>
        </Button>
      </div>
    );
  }

  const canManage = isOwner || isAdmin || group.members.find(m => m.userId === session?.user.id)?.role === 'ADMIN' || group.members.find(m => m.userId === session?.user.id)?.role === 'MODERATOR';

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link 
            href="/forum/groups" 
            className="text-muted-foreground hover:text-primary transition-colors mb-4 inline-block"
          >
            ← Back to Groups
          </Link>
          
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold">{group.name}</h1>
              <div className="flex items-center text-sm text-muted-foreground mt-2">
                <span>Created {formatDistanceToNow(new Date(group.createdAt), { addSuffix: true })}</span>
                <span className="mx-2">•</span>
                <span>{group.members.length} members</span>
              </div>
            </div>
            
            <div className="flex gap-2">
              {isMember ? (
                <>
                  {isOwner || canManage ? (
                    <Button onClick={() => router.push(`/forum/groups/${id}/manage`)}>
                      Manage Group
                    </Button>
                  ) : null}
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" disabled={isLeaving}>
                        {isLeaving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Leaving...
                          </>
                        ) : (
                          'Leave Group'
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Leave this group?</AlertDialogTitle>
                        <AlertDialogDescription>
                          You will no longer have access to this group's content and will need to rejoin to participate again.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={leaveGroup}>
                          Leave Group
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              ) : (
                <Button onClick={joinGroup} disabled={isJoining}>
                  {isJoining ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    <>
                      <User className="mr-2 h-4 w-4" />
                      Join Group
                    </>
                  )}
                </Button>
              )}
              
              {(isOwner || isAdmin) && (
                <AlertDialog>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {isOwner && (
                        <DropdownMenuItem onClick={() => router.push(`/forum/groups/${id}/edit`)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Group
                        </DropdownMenuItem>
                      )}
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem className="text-destructive">
                          <Trash className="h-4 w-4 mr-2" />
                          Delete Group
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the group
                        and remove all member associations.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={deleteGroup}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        </div>
        
        {group.description && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="prose dark:prose-invert max-w-none">
                {group.description}
              </div>
            </CardContent>
          </Card>
        )}
        
        <Tabs defaultValue="discussions" className="mb-6">
          <TabsList className="mb-4">
            <TabsTrigger value="discussions">Discussions</TabsTrigger>
            <TabsTrigger value="members">Members ({group.members.length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="discussions">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Group Posts</h2>
                {isMember && (
                  <Button asChild>
                    <Link href={`/forum/new?groupId=${id}`}>
                      <Plus className="mr-2 h-4 w-4" /> New Post
                    </Link>
                  </Button>
                )}
              </div>
              
              {isPostsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : posts.length > 0 ? (
                <div className="space-y-4">
                  {posts.map(post => (
                    <Card key={post.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <Link href={`/forum/posts/${post.id}`} className="hover:underline">
                          <CardTitle className="text-lg">{post.title}</CardTitle>
                        </Link>
                        <div className="flex items-center text-sm text-muted-foreground mt-2">
                          <Avatar className="h-6 w-6 mr-2">
                            <AvatarImage src={post.author.avatar || undefined} alt={post.author.name} />
                            <AvatarFallback>{getInitials(post.author.name)}</AvatarFallback>
                          </Avatar>
                          <span>{post.author.name}</span>
                          <span className="mx-2">•</span>
                          <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="line-clamp-2 text-muted-foreground">
                          {post.content.replace(/<[^>]*>/g, '')}
                        </p>
                      </CardContent>
                      <CardFooter className="text-sm text-muted-foreground">
                        <Link href={`/forum/posts/${post.id}`} className="flex items-center hover:text-primary">
                          <MessageSquare className="h-4 w-4 mr-1" />
                          {post._count.comments} comments
                        </Link>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 border rounded-lg">
                  <p className="text-muted-foreground">No posts in this group yet</p>
                  {isMember && (
                    <Button asChild variant="outline" className="mt-4">
                      <Link href={`/forum/new?groupId=${id}`}>
                        Create the first post
                      </Link>
                    </Button>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="members">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Group Members</h2>
              
              <div className="space-y-2">
                {group.members.map(member => (
                  <div 
                    key={member.id} 
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarImage src={member.user.avatar || undefined} alt={member.user.name} />
                        <AvatarFallback>{getInitials(member.user.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{member.user.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Joined {formatDistanceToNow(new Date(member.joinedAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="outline" 
                        className={`${getRoleBadgeColor(member.role)}`}
                      >
                        {member.user.id === group.ownerId ? 'OWNER' : member.role}
                      </Badge>
                      
                      {/* Add member management options here for owners/admins */}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
