'use client'

import { Permission } from './permissions'
import { getCachedPermissions, setCachedPermissions, clearPermissionsCache } from './cache'

/**
 * Client-side utility for fetching user permissions with caching
 * This prevents unnecessary API calls by caching permissions in localStorage
 */

/**
 * Fetch all permissions for a user (with caching)
 * @param userId - The user ID
 * @returns Promise that resolves to the permissions array
 */
export async function fetchPermissions(userId: string): Promise<Permission[]> {
  const cached = getCachedPermissions(userId)
  if (cached) {
    return cached
  }

  try {
    const response = await fetch('/api/users/permissions')
    if (!response.ok) {
      throw new Error('Failed to fetch permissions')
    }
    const data = await response.json()
    const permissions = data.permissions || []
    
    setCachedPermissions(userId, permissions)
    
    return permissions
  } catch (error) {
    console.error('Error fetching permissions:', error)
    throw error
  }
}

/**
 * Check if a user has a specific permission (with caching)
 * @param userId - The user ID
 * @param permission - The permission to check
 * @returns Promise that resolves to true if the user has the permission
 */
export async function checkPermission(userId: string, permission: Permission): Promise<boolean> {
  const cached = getCachedPermissions(userId)
  if (cached) {
    return cached.includes(permission)
  }

  try {
    const permissions = await fetchPermissions(userId)
    return permissions.includes(permission)
  } catch (error) {
    console.error('Error checking permission:', error)
    return false
  }
}

/**
 * Invalidate permissions cache for a user
 * Call this when user permissions might have changed (e.g., role change)
 * @param userId - The user ID (optional, clears all if not provided)
 */
export function invalidatePermissionsCache(userId?: string): void {
  clearPermissionsCache(userId)
}

