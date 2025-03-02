import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

// Validation schema for permission update
const permissionsSchema = z.object({
  permissions: z.array(z.string()),
});

export async function PUT(
  request: Request,
  { params }: { params: { groupId: string; roleId: string } }
) {
  const { groupId, roleId } = params;
  
  try {
    // Get session to check permissions
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user is the group owner
    const member = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId: session.user.id,
        role: 'OWNER',
      }
    });
    
    if (!member) {
      return NextResponse.json({ error: 'Only the group owner can manage role permissions' }, { status: 403 });
    }
    
    // Get the role
    const role = await prisma.groupRole.findUnique({
      where: {
        id: roleId,
        groupId,
      }
    });
    
    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }
    
    // Don't allow modifying owner role permissions
    if (role.isOwner) {
      return NextResponse.json({ error: 'Cannot modify permissions for the owner role' }, { status: 403 });
    }
    
    // Parse and validate request body
    const body = await request.json();
    const { permissions: newPermissions } = permissionsSchema.parse(body);
    
    // Get current permissions
    const currentPermissions = await prisma.groupRolePermission.findMany({
      where: {
        roleId,
      },
      select: {
        permissionId: true,
      }
    });
    
    const currentPermissionIds = currentPermissions.map(p => p.permissionId);
    
    // Determine which permissions to add and which to remove
    const permissionsToAdd = newPermissions.filter(p => !currentPermissionIds.includes(p));
    const permissionsToRemove = currentPermissionIds.filter(p => !newPermissions.includes(p));
    
    // Update permissions in a transaction
    await prisma.$transaction(async (tx) => {
      // Remove permissions
      if (permissionsToRemove.length > 0) {
        await tx.groupRolePermission.deleteMany({
          where: {
            roleId,
            permissionId: {
              in: permissionsToRemove,
            }
          }
        });
      }
      
      // Add permissions
      for (const permissionId of permissionsToAdd) {
        await tx.groupRolePermission.create({
          data: {
            roleId,
            permissionId,
          }
        });
      }
      
      // Log the update in moderation logs
      await tx.moderationLog.create({
        data: {
          groupId,
          moderatorId: session.user.id,
          action: 'UPDATE_ROLE_PERMISSIONS',
          itemType: 'ROLE',
          itemId: roleId,
          reason: `Updated permissions for role: ${role.name}`,
        }
      });
      
      // Track analytics event
      await tx.analyticsEvent.create({
        data: {
          groupId,
          userId: session.user.id,
          type: 'ROLE_PERMISSIONS_UPDATED',
          data: JSON.stringify({
            roleId,
            roleName: role.name,
            addedPermissions: permissionsToAdd.length,
            removedPermissions: permissionsToRemove.length,
          }),
        }
      });
    });
    
    return NextResponse.json({
      success: true,
      message: 'Role permissions updated successfully',
    });
  } catch (error) {
    console.error('Error updating role permissions:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update role permissions' },
      { status: 500 }
    );
  }
}
