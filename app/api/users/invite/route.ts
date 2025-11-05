import { NextRequest, NextResponse } from 'next/server'
import { requireAuthAndPermission } from '@/lib/api-middleware'
import { Permission } from '@/lib/permissions'
import { userStorage } from '@/lib/userStorage'
import { emailService } from '@/lib/email'
import { z } from 'zod'

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'MANAGER', 'TECHNICIAN', 'VIEWER']),
})

export async function POST(request: NextRequest) {
  const { session, response } = await requireAuthAndPermission(
    request,
    Permission.INVITE_USERS
  )
  
  if (response) return response

  try {
    const body = await request.json()
    const { email, role } = inviteSchema.parse(body)

    // Check if user already exists
    const existingUser = await userStorage.findByEmail(email)
    if (existingUser && existingUser.storeId === session.user.storeId) {
      return NextResponse.json(
        { error: 'User already exists in this store' },
        { status: 409 }
      )
    }

    // Create invitation
    const invitation = await userStorage.createInvitation({
      email,
      storeId: session.user.storeId,
      role,
      invitedBy: session.user.id,
    })

    // Send invitation email
    await emailService.sendInvitationEmail(
      email,
      invitation.token,
      session.user.name || session.user.email,
      session.user.storeId
    )

    return NextResponse.json({
      message: 'Invitation sent successfully',
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
      },
    })
  } catch (error) {
    console.error('Invitation error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to send invitation' },
      { status: 500 }
    )
  }
}

