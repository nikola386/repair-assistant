import { NextRequest, NextResponse } from 'next/server'
import { userStorage } from '@/lib/userStorage'
import { put, del } from '@vercel/blob'
import { withAuth } from '@/lib/auth.middleware'
import {
  validateFileContent,
  validateFileType,
  validateFileSize,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_IMAGE_EXTENSIONS,
  MAX_FILE_SIZE,
} from '@/lib/fileValidation'
import {
  generateUniqueFileName,
  compressAndConvertToJpg,
} from '@/lib/fileUtils'

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
    if (!validateFileType(file, ALLOWED_IMAGE_TYPES)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only images are allowed.' },
        { status: 400 }
      )
    }

    // Validate file size
    if (!validateFileSize(file, MAX_FILE_SIZE)) {
      return NextResponse.json(
        { error: 'File size too large. Maximum size is 2MB.' },
        { status: 400 }
      )
    }

    // Validate file content using magic bytes
    const isValidContent = await validateFileContent(file, file.type)
    if (!isValidContent) {
      return NextResponse.json(
        { error: 'File content does not match declared file type. Possible file spoofing detected.' },
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

    // Get user's storeId for organizing files
    const storeId = await userStorage.getStoreId(session.user.id)
    if (!storeId) {
      return NextResponse.json(
        { error: 'User store not found' },
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

    // Compress and convert image to JPG
    const processedFile = await compressAndConvertToJpg(file)

    // Generate unique filename using secure random (use processed file name for correct extension)
    let fileName: string
    try {
      fileName = generateUniqueFileName('profiles', session.user.id, processedFile.name, ALLOWED_IMAGE_EXTENSIONS, storeId)
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Invalid file extension' },
        { status: 400 }
      )
    }

    // Upload file to Vercel Blob
    const blob = await put(fileName, processedFile, {
      access: 'public',
      contentType: processedFile.type,
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

