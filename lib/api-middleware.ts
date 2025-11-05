import { NextRequest, NextResponse } from 'next/server'
import { auth } from './auth.config'
import { Permission, hasPermission, UserRole } from './permissions'
import { userStorage } from './userStorage'
import type { Session } from 'next-auth'

export async function requireAuthAndPermission(
  request: NextRequest,
  permission: Permission
): Promise<
  | { session: Session; response: null }
  | { session: null; response: NextResponse }
> {
  const session = await auth()
  
  if (!session?.user?.id) {
    return {
      session: null,
      response: NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      ),
    }
  }

  // Check if user is active
  const user = await userStorage.findById(session.user.id)
  if (!user || !(user as any).isActive) {
    return {
      session: null,
      response: NextResponse.json(
        { error: 'Account is inactive' },
        { status: 403 }
      ),
    }
  }

  // Check permission
  if (!hasPermission((user as any).role as UserRole, permission)) {
    return {
      session: null,
      response: NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      ),
    }
  }

  return { session: session as Session, response: null }
}

// Helper to ensure user belongs to the store
export async function requireStoreAccess(
  userId: string,
  storeId: string
): Promise<void> {
  const user = await userStorage.findById(userId)
  if (!user || user.storeId !== storeId) {
    throw new Error('Access denied: Store mismatch')
  }
}

