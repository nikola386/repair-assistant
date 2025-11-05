import { NextRequest, NextResponse } from 'next/server'
import { requireAuthAndPermission } from '@/lib/api-middleware'
import { Permission } from '@/lib/permissions'
import { userStorage } from '@/lib/userStorage'
import type { Session } from 'next-auth'

export async function GET(request: NextRequest) {
  const authResult = await requireAuthAndPermission(
    request,
    Permission.VIEW_USERS
  )
  
  if (authResult.response) return authResult.response
  if (!authResult.session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const session = authResult.session
  const users = await userStorage.findByStoreId(session.user.storeId)
  
  // Don't return sensitive data
  return NextResponse.json(
    users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: (user as any).role,
      isActive: (user as any).isActive,
      profileImage: user.profileImage,
      createdAt: user.createdAt,
      invitedBy: (user as any).invitedBy,
    }))
  )
}

