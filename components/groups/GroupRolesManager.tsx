import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Plus, Trash2, Edit2, Save, X, Check } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

// Define role schema
const roleSchema = z.object({
  name: z.string().min(3).max(50),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
    message: 'Must be a valid hex color code',
  }),
});

// Permission types
interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

// Role types
interface Role {
  id: string;
  name: string;
  color: string;
  permissions: string[];
  memberCount: number;
  isDefault?: boolean;
  isOwner?: boolean;
}

interface GroupRolesManagerProps {
  groupId: string;
  isOwner: boolean;
}

export default function GroupRolesManager({ groupId, isOwner }: GroupRolesManagerProps) {
  const { toast } = useToast();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingRole, setIsAddingRole] = useState(false);
  const [isEditingRole, setIsEditingRole] = useState<string | null>(null);
  const [isEditingPermissions, setIsEditingPermissions] = useState<string | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  
  // Form for adding/editing roles
  const { register, handleSubmit, formState: { errors }, reset } = useForm<z.infer<typeof roleSchema>>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: '',
      color: '#4299e1',
    },
  });
  
  // Fetch roles and permissions data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch roles
        const rolesResponse = await axios.get(`/api/forum/groups/${groupId}/roles`);
        setRoles(rolesResponse.data);
        
        // Fetch permissions
        const permissionsResponse = await axios.get(`/api/forum/groups/permissions`);
        setPermissions(permissionsResponse.data);
      } catch (error) {
        console.error('Error fetching group roles data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load group roles and permissions.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [groupId, toast]);
  
  // Group permissions by category
  const permissionsByCategory = permissions.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);
  
  // Handle role submission (add/edit)
  const onSubmitRole = async (data: z.infer<typeof roleSchema>) => {
    try {
      if (isEditingRole) {
        // Update existing role
        await axios.put(`/api/forum/groups/${groupId}/roles/${isEditingRole}`, data);
        
        // Update local state
        setRoles(roles.map(role => 
          role.id === isEditingRole 
            ? { ...role, name: data.name, color: data.color }
            : role
        ));
        
        toast({
          title: 'Role Updated',
          description: `The role "${data.name}" has been updated.`,
        });
        
        setIsEditingRole(null);
      } else {
        // Create new role
        const response = await axios.post(`/api/forum/groups/${groupId}/roles`, data);
        
        // Add to local state
        setRoles([...roles, { ...response.data, permissions: [], memberCount: 0 }]);
        
        toast({
          title: 'Role Created',
          description: `The role "${data.name}" has been created.`,
        });
        
        setIsAddingRole(false);
      }
      
      // Reset form
      reset();
    } catch (error) {
      console.error('Error saving role:', error);
      toast({
        title: 'Error',
        description: 'Failed to save role. Please try again.',
        variant: 'destructive',
      });
    }
  };
  
  // Start editing a role
  const startEditingRole = (role: Role) => {
    reset({
      name: role.name,
      color: role.color,
    });
    setIsEditingRole(role.id);
  };
  
  // Cancel editing
  const cancelEditing = () => {
    setIsEditingRole(null);
    reset();
  };
  
  // Delete a role
  const deleteRole = async (roleId: string) => {
    try {
      await axios.delete(`/api/forum/groups/${groupId}/roles/${roleId}`);
      
      // Remove from local state
      setRoles(roles.filter(role => role.id !== roleId));
      
      toast({
        title: 'Role Deleted',
        description: 'The role has been deleted successfully.',
      });
      
      setIsDeleting(null);
    } catch (error) {
      console.error('Error deleting role:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete role. Please try again.',
        variant: 'destructive',
      });
    }
  };
  
  // Start editing permissions
  const startEditingPermissions = (role: Role) => {
    setSelectedPermissions(role.permissions);
    setIsEditingPermissions(role.id);
  };
  
  // Save permissions
  const savePermissions = async () => {
    if (!isEditingPermissions) return;
    
    try {
      await axios.put(`/api/forum/groups/${groupId}/roles/${isEditingPermissions}/permissions`, {
        permissions: selectedPermissions,
      });
      
      // Update local state
      setRoles(roles.map(role => 
        role.id === isEditingPermissions 
          ? { ...role, permissions: selectedPermissions }
          : role
      ));
      
      toast({
        title: 'Permissions Updated',
        description: 'The role permissions have been updated successfully.',
      });
      
      setIsEditingPermissions(null);
    } catch (error) {
      console.error('Error updating permissions:', error);
      toast({
        title: 'Error',
        description: 'Failed to update permissions. Please try again.',
        variant: 'destructive',
      });
    }
  };
  
  // Toggle permission selection
  const togglePermission = (permissionId: string) => {
    setSelectedPermissions(prev => 
      prev.includes(permissionId)
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    );
  };
  
  // Check if current user can manage roles
  if (!isOwner) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Group Roles</CardTitle>
          <CardDescription>
            Only the group owner can manage roles and permissions.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Group Roles</CardTitle>
          <CardDescription>
            Loading roles and permissions...
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center py-6">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Group Roles & Permissions</CardTitle>
          <CardDescription>
            Create custom roles for your group members with specific permissions
          </CardDescription>
        </div>
        <Dialog open={isAddingRole} onOpenChange={setIsAddingRole}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Role
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Role</DialogTitle>
              <DialogDescription>
                Create a new role for your group members.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmitRole)}>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Role Name</Label>
                  <Input id="name" {...register('name')} />
                  {errors.name && (
                    <p className="text-sm text-red-500">{errors.name.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color">Role Color</Label>
                  <div className="flex gap-2">
                    <Input id="color" type="color" {...register('color')} className="w-16" />
                    <Input 
                      value={
                        register('color').value ||
                        '#4299e1'
                      }
                      onChange={(e) => register('color').onChange(e)}
                      className="flex-1"
                    />
                  </div>
                  {errors.color && (
                    <p className="text-sm text-red-500">{errors.color.message}</p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddingRole(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Create Role
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {roles.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-muted-foreground mb-4">
              No custom roles have been created yet
            </p>
            <Button onClick={() => setIsAddingRole(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create First Role
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell>
                    {isEditingRole === role.id ? (
                      <div className="space-y-2">
                        <Input 
                          {...register('name')} 
                          defaultValue={role.name} 
                          className="w-full"
                        />
                        {errors.name && (
                          <p className="text-xs text-red-500">{errors.name.message}</p>
                        )}
                        <div className="flex gap-2">
                          <Input 
                            type="color" 
                            {...register('color')} 
                            defaultValue={role.color} 
                            className="w-10"
                          />
                          <Input 
                            {...register('color')} 
                            defaultValue={role.color} 
                            className="flex-1"
                          />
                        </div>
                        {errors.color && (
                          <p className="text-xs text-red-500">{errors.color.message}</p>
                        )}
                        <div className="flex justify-end gap-2 mt-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={cancelEditing}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            onClick={handleSubmit(onSubmitRole)}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Badge
                          className="text-white"
                          style={{ backgroundColor: role.color }}
                        >
                          {role.isOwner ? 'OWNER' : role.isDefault ? 'DEFAULT' : ''}
                        </Badge>
                        <span className="font-medium">{role.name}</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{role.memberCount}</TableCell>
                  <TableCell>
                    {role.permissions.length} permissions
                  </TableCell>
                  <TableCell className="text-right">
                    {!role.isOwner && !role.isDefault && (
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEditingPermissions(role)}
                        >
                          <Check className="h-4 w-4" />
                          <span className="sr-only">Edit Permissions</span>
                        </Button>
                        {isEditingRole !== role.id && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startEditingRole(role)}
                          >
                            <Edit2 className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                        )}
                        <AlertDialog open={isDeleting === role.id} onOpenChange={(open) => !open && setIsDeleting(null)}>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() => setIsDeleting(role.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Role</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete the role "{role.name}"? 
                                This action cannot be undone. Members with this role will be 
                                assigned the default role.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground"
                                onClick={() => deleteRole(role.id)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        
        {/* Permissions Editor Dialog */}
        <Dialog 
          open={isEditingPermissions !== null} 
          onOpenChange={(open) => !open && setIsEditingPermissions(null)}
        >
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Edit Permissions
                {isEditingPermissions && (
                  <Badge className="ml-2" variant="outline">
                    {roles.find(r => r.id === isEditingPermissions)?.name}
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription>
                Select the permissions for this role
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {Object.entries(permissionsByCategory).map(([category, perms]) => (
                <div key={category} className="space-y-2">
                  <h3 className="font-medium">{category}</h3>
                  <div className="space-y-2">
                    {perms.map((permission) => (
                      <div key={permission.id} className="flex items-start space-x-2">
                        <Checkbox
                          id={permission.id}
                          checked={selectedPermissions.includes(permission.id)}
                          onCheckedChange={() => togglePermission(permission.id)}
                        />
                        <div className="grid gap-1.5">
                          <Label
                            htmlFor={permission.id}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {permission.name}
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            {permission.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsEditingPermissions(null)}
              >
                Cancel
              </Button>
              <Button onClick={savePermissions}>
                Save Permissions
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
