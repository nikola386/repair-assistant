import { Permission, hasPermission, requirePermission, UserRole } from './permissions'
import { userStorage } from './userStorage'

export async function checkPermission(
  userId: string,
  permission: Permission
): Promise<boolean> {
  const user = await userStorage.findById(userId)
  if (!user || !user.isActive) return false
  
  return hasPermission(user.role as UserRole, permission)
}

export async function requireUserPermission(
  userId: string,
  permission: Permission
): Promise<void> {
  const user = await userStorage.findById(userId)
  if (!user || !user.isActive) {
    throw new Error('User not found or inactive')
  }
  
  requirePermission(user.role as UserRole, permission)
}

export async function getUserPermissions(userId: string): Promise<Permission[]> {
  const user = await userStorage.findById(userId)
  if (!user || !user.isActive) return []
  
  const { ROLE_PERMISSIONS } = await import('./permissions')
  return ROLE_PERMISSIONS[user.role as UserRole] || []
}

