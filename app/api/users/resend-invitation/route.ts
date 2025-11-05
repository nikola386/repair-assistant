import { NextRequest, NextResponse } from 'next/server'
import { requireAuthAndPermission } from '@/lib/api-middleware'
import { Permission } from '@/lib/permissions'
import { userStorage } from '@/lib/userStorage'
import { emailService } from '@/lib/email'
import { db } from '@/lib/db'
import type { Session } from 'next-auth'

export async function POST(request: NextRequest) {
  const authResult = await requireAuthAndPermission(
    request,
    Permission.INVITE_USERS
  )
  
  if (authResult.response) return authResult.response
  if (!authResult.session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const session = authResult.session

  try {
    // Get user's storeId from database
    const user = await userStorage.findById(session.user.id)
    if (!user || !user.storeId) {
      return NextResponse.json(
        { error: 'User store not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { invitationId } = body

    if (!invitationId) {
      return NextResponse.json(
        { error: 'Invitation ID is required' },
        { status: 400 }
      )
    }

    // Get the invitation
    const invitation = await (db as any).userInvitation.findUnique({
      where: { id: invitationId },
    })
    
    if (!invitation || invitation.storeId !== user.storeId) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      )
    }

    // Check if invitation is still valid
    if (invitation.acceptedAt || invitation.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Invitation is no longer valid' },
        { status: 400 }
      )
    }

    // Resend invitation with new token
    const updatedInvitation = await userStorage.resendInvitation(invitation.id)

    // Send invitation email
    await emailService.sendInvitationEmail(
      invitation.email,
      updatedInvitation.token,
      session.user.name || session.user.email,
      user.storeId
    )

    return NextResponse.json({
      message: 'Invitation resent successfully',
    })
  } catch (error) {
    console.error('Resend invitation error:', error)
    return NextResponse.json(
      { error: 'Failed to resend invitation' },
      { status: 500 }
    )
  }
}

