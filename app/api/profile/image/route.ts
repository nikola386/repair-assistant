import { NextRequest, NextResponse } from 'next/server'
import { userStorage } from '@/lib/userStorage'
import { put, del } from '@vercel/blob'
import { withAuth } from '@/lib/auth.middleware'

export async function POST(request: NextRequest) {
  const authResult = await withAuth(request, { action: 'profile image upload' })
  if (authResult.response) {
    return authResult.response
  }
  const session = authResult.session

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only images are allowed.' },
        { status: 400 }
      )
    }

    // Validate file size (max 2MB for profile images)
    const maxSize = 2 * 1024 * 1024 // 2MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size too large. Maximum size is 2MB.' },
        { status: 400 }
      )
    }

    // Get current user to delete old image if exists
    const user = await userStorage.findById(session.user.id)
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Delete old profile image from Vercel Blob if exists
    if (user.profileImage) {
      try {
        // Check if it's a Vercel Blob URL (starts with https://)
        if (user.profileImage.startsWith('https://')) {
          await del(user.profileImage)
        }
      } catch (error) {
        console.error('Error deleting old profile image:', error)
        // Continue even if deletion fails
      }
    }

    // Generate unique filename
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 9)
    const fileExtension = file.name.split('.').pop()
    const fileName = `profiles/${session.user.id}-${timestamp}-${random}.${fileExtension}`

    // Upload file to Vercel Blob
    const blob = await put(fileName, file, {
      access: 'public',
      contentType: file.type,
    })

    // Update user profile image (store the blob URL)
    const updatedUser = await userStorage.updateProfileImage(session.user.id, blob.url)

    // Don't return password hash
    const { passwordHash, ...userWithoutPassword } = updatedUser

    return NextResponse.json(
      { user: userWithoutPassword, message: 'Profile image uploaded successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error uploading profile image:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  const authResult = await withAuth(request, { action: 'profile image deletion' })
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

    // Delete profile image from Vercel Blob if exists
    if (user.profileImage) {
      try {
        // Check if it's a Vercel Blob URL (starts with https://)
        if (user.profileImage.startsWith('https://')) {
          await del(user.profileImage)
        }
      } catch (error) {
        console.error('Error deleting profile image file:', error)
        // Continue even if deletion fails
      }
    }

    // Update user to remove profile image reference
    const updatedUser = await userStorage.updateProfileImage(session.user.id, null)

    // Don't return password hash
    const { passwordHash, ...userWithoutPassword } = updatedUser

    return NextResponse.json(
      { user: userWithoutPassword, message: 'Profile image deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error deleting profile image:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

