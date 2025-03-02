'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CardContent, CardFooter } from '@/components/ui/card';
import { 
  Search, 
  UserPlus, 
  UserMinus, 
  Shield, 
  UserCog, 
  ChevronLeft, 
  ChevronRight 
} from 'lucide-react';
import { toast } from 'sonner';

interface Member {
  id: string;
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  };
  role: string;
  joinedAt: string;
}

interface MembersTabProps {
  groupId: string;
  isOwner: boolean;
  userRole: string;
  memberCount: number;
}

export default function MembersTab({ 
  groupId, 
  isOwner, 
  userRole,
  memberCount: initialMemberCount,
}: MembersTabProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalMembers, setTotalMembers] = useState(initialMemberCount);
  const [totalPages, setTotalPages] = useState(Math.ceil(initialMemberCount / limit));
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState<'remove' | 'role'>('remove');
  const [newRole, setNewRole] = useState('');
  
  const router = useRouter();

  // Fetch members
  const fetchMembers = async () => {
    try {
      setLoading(true);
      
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(searchQuery && { search: searchQuery }),
      });
      
      const response = await fetch(`/api/forum/groups/${groupId}/members?${queryParams}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch members');
      }
      
      const data = await response.json();
      setMembers(data.members);
      setTotalMembers(data.pagination.totalItems);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error('Error fetching members:', error);
      toast.error('Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  // Update member role
  const updateMemberRole = async (memberId: string, role: string) => {
    try {
      const response = await fetch(`/api/forum/groups/${groupId}/members/${memberId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update member role');
      }
      
      // Update the member in the list
      setMembers(prev => 
        prev.map(member => 
          member.id === memberId ? { ...member, role } : member
        )
      );
      
      toast.success('Member role updated successfully');
    } catch (error) {
      console.error('Error updating member role:', error);
      toast.error('Failed to update member role');
    }
  };

  // Remove member
  const removeMember = async (memberId: string) => {
    try {
      const response = await fetch(`/api/forum/groups/${groupId}/members/${memberId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to remove member');
      }
      
      // Remove the member from the list
      setMembers(prev => prev.filter(member => member.id !== memberId));
      setTotalMembers(prev => prev - 1);
      
      toast.success('Member removed successfully');
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Failed to remove member');
    }
  };

  // Handle role change
  const handleRoleChange = (memberId: string, role: string) => {
    const member = members.find(m => m.id === memberId);
    
    if (!member) return;
    
    // If the member is the group owner, don't allow role change
    if (member.user.id === member.user.id && isOwner) {
      toast.error("You can't change the owner's role");
      return;
    }
    
    // Open the confirmation dialog
    setSelectedMember(member);
    setNewRole(role);
    setDialogAction('role');
    setDialogOpen(true);
  };

  // Handle member removal
  const handleRemoveMember = (member: Member) => {
    // If the member is the group owner, don't allow removal
    if (member.user.id === member.user.id && isOwner) {
      toast.error("You can't remove the owner");
      return;
    }
    
    // Open the confirmation dialog
    setSelectedMember(member);
    setDialogAction('remove');
    setDialogOpen(true);
  };

  // Confirm dialog action
  const confirmDialogAction = () => {
    if (!selectedMember) return;
    
    if (dialogAction === 'remove') {
      removeMember(selectedMember.id);
    } else if (dialogAction === 'role') {
      updateMemberRole(selectedMember.id, newRole);
    }
    
    setDialogOpen(false);
  };

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchMembers();
  };

  // Handle page change
  const changePage = (newPage: number) => {
    setPage(newPage);
  };

  // Initial fetch
  useEffect(() => {
    fetchMembers();
  }, [groupId, page, limit]);

  // When page or limit changes, fetch members
  useEffect(() => {
    fetchMembers();
  }, [page, limit]);

  return (
    <>
      <CardContent className="p-6">
        <div className="flex flex-col space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Group Members</h2>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => router.push(`/forum/groups/${groupId}/invite`)}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Members
            </Button>
          </div>
          
          <form onSubmit={handleSearch} className="flex w-full max-w-sm items-center space-x-2">
            <Input
              type="search"
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
            <Button type="submit" size="icon">
              <Search className="h-4 w-4" />
              <span className="sr-only">Search</span>
            </Button>
          </form>
          
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="space-y-1">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-3 w-32" />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="h-8 w-16 ml-auto" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : members.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                      No members found
                    </TableCell>
                  </TableRow>
                ) : (
                  members.map(member => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={member.user.avatar || undefined} />
                            <AvatarFallback>
                              {member.user.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{member.user.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {member.user.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {isOwner || (userRole === 'ADMIN' && member.role !== 'ADMIN') ? (
                          <Select
                            value={member.role}
                            onValueChange={(value) => handleRoleChange(member.id, value)}
                            disabled={member.user.id === member.user.id && isOwner}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="MEMBER">Member</SelectItem>
                              <SelectItem value="MODERATOR">Moderator</SelectItem>
                              {isOwner && (
                                <SelectItem value="ADMIN">Admin</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant={
                            member.role === 'ADMIN' ? 'destructive' :
                            member.role === 'MODERATOR' ? 'default' : 'secondary'
                          }>
                            {member.role.charAt(0) + member.role.slice(1).toLowerCase()}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(member.joinedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push(`/profile/${member.user.id}`)}
                          >
                            <UserCog className="h-4 w-4" />
                            <span className="sr-only">View Profile</span>
                          </Button>
                          
                          {(isOwner || (userRole === 'ADMIN' && member.role !== 'ADMIN')) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => handleRemoveMember(member)}
                              disabled={member.user.id === member.user.id && isOwner}
                            >
                              <UserMinus className="h-4 w-4" />
                              <span className="sr-only">Remove Member</span>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between border-t p-6">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Show
          </span>
          <Select
            value={limit.toString()}
            onValueChange={(value) => setLimit(Number(value))}
          >
            <SelectTrigger className="h-8 w-16">
              <SelectValue placeholder="10" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            per page
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            disabled={page === 1}
            onClick={() => changePage(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Previous Page</span>
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="icon"
            disabled={page === totalPages}
            onClick={() => changePage(page + 1)}
          >
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">Next Page</span>
          </Button>
        </div>
      </CardFooter>
      
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {dialogAction === 'remove' ? 'Remove Member' : 'Change Member Role'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {dialogAction === 'remove' ? (
                <>
                  Are you sure you want to remove <strong>{selectedMember?.user.name}</strong> from the group?
                  This action cannot be undone.
                </>
              ) : (
                <>
                  Are you sure you want to change <strong>{selectedMember?.user.name}</strong>'s role to <strong>{newRole.toLowerCase()}</strong>?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDialogAction}>
              {dialogAction === 'remove' ? 'Remove' : 'Change Role'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
