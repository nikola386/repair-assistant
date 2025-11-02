import { NextRequest, NextResponse } from 'next/server'
import { userStorage } from '@/lib/userStorage'
import { withAuth } from '@/lib/auth.middleware'
import { db } from '@/lib/db'

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

    // Fetch store information
    const store = await db.store.findUnique({
      where: { id: user.storeId },
      select: {
        id: true,
        name: true,
        country: true,
        vatNumber: true,
      },
    })

    // Don't return password hash
    const { passwordHash, ...userWithoutPassword } = user
    return NextResponse.json({ 
      user: userWithoutPassword,
      store: store || null,
    }, { status: 200 })
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
    const { name, email, country, vatNumber } = body

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

    // Get user to access storeId
    const user = await userStorage.findById(session.user.id)
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Update user profile
    const updateData: { name?: string; email?: string } = {}
    if (name !== undefined) updateData.name = name
    if (email !== undefined) updateData.email = email

    const updatedUser = await userStorage.updateProfile(session.user.id, updateData)

    // Update store country and VAT if provided
    if (country !== undefined || vatNumber !== undefined) {
      const storeUpdateData: { country?: string | null; vatNumber?: string | null } = {}
      if (country !== undefined) {
        storeUpdateData.country = country?.trim() || null
      }
      if (vatNumber !== undefined) {
        storeUpdateData.vatNumber = vatNumber?.trim() || null
      }

      await db.store.update({
        where: { id: user.storeId },
        data: storeUpdateData,
      })
    }

    // Fetch updated store
    const store = await db.store.findUnique({
      where: { id: user.storeId },
      select: {
        id: true,
        name: true,
        country: true,
        vatNumber: true,
      },
    })

    // Don't return password hash
    const { passwordHash, ...userWithoutPassword } = updatedUser
    return NextResponse.json(
      { 
        user: userWithoutPassword,
        store: store || null,
        message: 'Profile updated successfully' 
      },
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

