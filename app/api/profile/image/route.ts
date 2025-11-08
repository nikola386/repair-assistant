import { NextRequest, NextResponse } from 'next/server'
import { userStorage } from '@/lib/userStorage'
import { uploadFile, deleteFile } from '@/lib/storage'
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

    if (!validateFileType(file, ALLOWED_IMAGE_TYPES)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only images are allowed.' },
        { status: 400 }
      )
    }

    if (!validateFileSize(file, MAX_FILE_SIZE)) {
      return NextResponse.json(
        { error: 'File size too large. Maximum size is 2MB.' },
        { status: 400 }
      )
    }

    const isValidContent = await validateFileContent(file, file.type)
    if (!isValidContent) {
      return NextResponse.json(
        { error: 'File content does not match declared file type. Possible file spoofing detected.' },
        { status: 400 }
      )
    }

    const user = await userStorage.findById(session.user.id)
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const storeId = await userStorage.getStoreId(session.user.id)
    if (!storeId) {
      return NextResponse.json(
        { error: 'User store not found' },
        { status: 404 }
      )
    }

    if (user.profileImage) {
      try {
        await deleteFile(user.profileImage)
      } catch (error) {
        console.error('Error deleting old profile image:', error)
      }
    }

    const processedFile = await compressAndConvertToJpg(file)

    let fileName: string
    try {
      fileName = generateUniqueFileName('profiles', session.user.id, processedFile.name, ALLOWED_IMAGE_EXTENSIONS, storeId)
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Invalid file extension' },
        { status: 400 }
      )
    }

    const fileUrl = await uploadFile(fileName, processedFile, {
      access: 'public',
      contentType: processedFile.type,
    })

    const updatedUser = await userStorage.updateProfileImage(session.user.id, fileUrl)

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

    if (user.profileImage) {
      try {
        await deleteFile(user.profileImage)
      } catch (error) {
        console.error('Error deleting profile image file:', error)
      }
    }

    const updatedUser = await userStorage.updateProfileImage(session.user.id, null)

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

