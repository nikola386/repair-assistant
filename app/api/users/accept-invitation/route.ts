import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { userStorage } from '@/lib/userStorage'

const acceptSchema = z.object({
  token: z.string(),
  password: z.string().min(8),
  name: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, password, name } = acceptSchema.parse(body)

    const invitation = await userStorage.findInvitationByToken(token)
    
    if (!invitation) {
      return NextResponse.json(
        { error: 'Invalid invitation token' },
        { status: 400 }
      )
    }

    if (invitation.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 400 }
      )
    }

    if (invitation.acceptedAt) {
      return NextResponse.json(
        { error: 'Invitation has already been accepted' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await userStorage.findByEmail(invitation.email)
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    // Create user and mark invitation as accepted
    const user = await userStorage.create({
      email: invitation.email,
      password,
      name: name || invitation.email,
      storeId: invitation.storeId,
      role: invitation.role,
      invitedBy: invitation.invitedBy,
      invitedAt: new Date(),
    })

    await userStorage.acceptInvitation(invitation.id)

    return NextResponse.json({
      message: 'Account created successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    })
  } catch (error) {
    console.error('Accept invitation error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to accept invitation' },
      { status: 500 }
    )
  }
}

