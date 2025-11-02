import { NextRequest, NextResponse } from 'next/server'
import { userStorage } from '@/lib/userStorage'
import { withAuth } from '@/lib/auth.middleware'

export async function PATCH(request: NextRequest) {
  const authResult = await withAuth(request, { action: 'password update' })
  if (authResult.response) {
    return authResult.response
  }
  const session = authResult.session

  try {
    const body = await request.json()
    const { currentPassword, newPassword } = body

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'New password must be at least 6 characters long' },
        { status: 400 }
      )
    }

    // Verify current password
    const user = await userStorage.findById(session.user.id)
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const isValidPassword = await userStorage.verifyPassword(user, currentPassword)
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      )
    }

    // Update password
    await userStorage.updatePassword(session.user.id, newPassword)

    return NextResponse.json(
      { message: 'Password updated successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error updating password:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

