import { User } from '@/types/store.types'

// Define permission types
export type Permission = 
  | 'read:products'
  | 'create:products'
  | 'update:products'
  | 'delete:products'
  | 'manage:users'
  | 'manage:vendors'
  | 'access:admin'
  | 'access:marketplace'
  | 'access:chat'

// Define role types
export type Role = 'user' | 'admin' | 'vendor'

// Role-Permission mapping
const rolePermissions: Record<Role, Permission[]> = {
  user: [
    'read:products',
    'access:marketplace',
    'access:chat'
  ],
  vendor: [
    'read:products',
    'create:products',
    'update:products',
    'delete:products',
    'access:marketplace',
    'access:chat'
  ],
  admin: [
    'read:products',
    'create:products',
    'update:products',
    'delete:products',
    'manage:users',
    'manage:vendors',
    'access:admin',
    'access:marketplace',
    'access:chat'
  ]
}

export class RBAC {
  static hasPermission(user: User | null, permission: Permission): boolean {
    if (!user) return false
    return rolePermissions[user.role]?.includes(permission) || false
  }

  static hasRole(user: User | null, role: Role): boolean {
    if (!user) return false
    return user.role === role
  }

  static getAllPermissions(role: Role): Permission[] {
    return rolePermissions[role] || []
  }

  static hasAnyPermission(user: User | null, permissions: Permission[]): boolean {
    if (!user) return false
    return permissions.some(permission => this.hasPermission(user, permission))
  }

  static hasAllPermissions(user: User | null, permissions: Permission[]): boolean {
    if (!user) return false
    return permissions.every(permission => this.hasPermission(user, permission))
  }
}

// Higher-order function to create permission-based guards
export function createPermissionGuard(permission: Permission) {
  return (user: User | null) => RBAC.hasPermission(user, permission)
}

// Higher-order function to create role-based guards
export function createRoleGuard(role: Role) {
  return (user: User | null) => RBAC.hasRole(user, role)
}

// Common permission guards
export const guards = {
  canManageUsers: createPermissionGuard('manage:users'),
  canManageVendors: createPermissionGuard('manage:vendors'),
  canAccessAdmin: createPermissionGuard('access:admin'),
  canCreateProducts: createPermissionGuard('create:products'),
  canUpdateProducts: createPermissionGuard('update:products'),
  canDeleteProducts: createPermissionGuard('delete:products'),
  isAdmin: createRoleGuard('admin'),
  isVendor: createRoleGuard('vendor'),
}

// Middleware helpers
export function withPermission(permission: Permission) {
  return async (req: any, res: any, next: any) => {
    const user = req.user // Assuming user is attached by auth middleware
    if (!RBAC.hasPermission(user, permission)) {
      return res.status(403).json({ message: 'Insufficient permissions' })
    }
    next()
  }
}

export function withRole(role: Role) {
  return async (req: any, res: any, next: any) => {
    const user = req.user // Assuming user is attached by auth middleware
    if (!RBAC.hasRole(user, role)) {
      return res.status(403).json({ message: 'Insufficient role permissions' })
    }
    next()
  }
}