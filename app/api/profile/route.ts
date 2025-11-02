import { NextRequest, NextResponse } from 'next/server'
import { userStorage } from '@/lib/userStorage'
import { withAuth } from '@/lib/auth.middleware'

export async function GET(request: NextRequest) {
  const authResult = await withAuth(request, { action: 'profile access' })
  if (authResult.response) {
    return authResult.response
  }
  const session = authResult.session

  try {
    const user = await userStorage.findById(session.user.id)
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Don't return password hash
    const { passwordHash, ...userWithoutPassword } = user
    return NextResponse.json({ user: userWithoutPassword }, { status: 200 })
  } catch (error) {
    console.error('Error fetching profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  const authResult = await withAuth(request, { action: 'profile update' })
  if (authResult.response) {
    return authResult.response
  }
  const session = authResult.session

  try {
    const body = await request.json()
    const { name, email } = body

    // Validate email format if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        )
      }

      // Check if email is already taken by another user
      const existingUser = await userStorage.findByEmail(email)
      if (existingUser && existingUser.id !== session.user.id) {
        return NextResponse.json(
          { error: 'Email is already taken' },
          { status: 400 }
        )
      }
    }

    const updateData: { name?: string; email?: string } = {}
    if (name !== undefined) updateData.name = name
    if (email !== undefined) updateData.email = email

    const updatedUser = await userStorage.updateProfile(session.user.id, updateData)

    // Don't return password hash
    const { passwordHash, ...userWithoutPassword } = updatedUser
    return NextResponse.json(
      { user: userWithoutPassword, message: 'Profile updated successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

