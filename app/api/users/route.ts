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
  
  // Get user's storeId from database
  const user = await userStorage.findById(session.user.id)
  if (!user || !user.storeId) {
    return NextResponse.json(
      { error: 'User store not found' },
      { status: 404 }
    )
  }

  // Get both users and pending invitations
  const [users, pendingInvitations] = await Promise.all([
    userStorage.findByStoreId(user.storeId),
    userStorage.findPendingInvitationsByStoreId(user.storeId),
  ])

  // Combine users and pending invitations
  const teamMembers = [
    // Active users
    ...users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: (user as any).role,
      isActive: (user as any).isActive,
      profileImage: user.profileImage,
      createdAt: user.createdAt,
      invitedBy: (user as any).invitedBy,
      type: 'user' as const,
    })),
    // Pending invitations
    ...pendingInvitations.map(invitation => ({
      id: invitation.id,
      email: invitation.email,
      name: null,
      role: invitation.role,
      isActive: false,
      profileImage: null,
      createdAt: invitation.createdAt,
      invitedBy: invitation.invitedBy,
      type: 'invitation' as const,
      invitationId: invitation.id,
      invitationToken: invitation.token,
      expiresAt: invitation.expiresAt,
    })),
  ]

  return NextResponse.json(teamMembers)
}

