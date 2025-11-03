import { NextRequest, NextResponse } from 'next/server'
import { ticketStorage } from '@/lib/ticketStorage'
import { userStorage } from '@/lib/userStorage'
import { put, del } from '@vercel/blob'
import { withAuth } from '@/lib/auth.middleware'
import {
  validateFileContent,
  validateFileType,
  validateFileSize,
  ALLOWED_FILE_TYPES,
  MAX_FILE_SIZE,
} from '@/lib/fileValidation'
import {
  generateUniqueFileName,
  ALLOWED_FILE_EXTENSIONS,
  compressAndConvertToJpg,
} from '@/lib/fileUtils'

export async function POST(request: NextRequest) {
  const authResult = await withAuth(request, { action: 'ticket image upload' })
  if (authResult.response) {
    return authResult.response
  }
  const session = authResult.session

  try {
    const formData = await request.formData()
    const ticketId = formData.get('ticketId') as string
    const file = formData.get('file') as File | null

    if (!ticketId || !file) {
      return NextResponse.json(
        { error: 'Missing ticketId or file' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!validateFileType(file, ALLOWED_FILE_TYPES)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only images and PDF files are allowed.' },
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

    // Get user's storeId to verify ticket ownership
    const storeId = await userStorage.getStoreId(session.user.id)
    if (!storeId) {
      return NextResponse.json(
        { error: 'User store not found' },
        { status: 404 }
      )
    }

    // Verify ticket exists and belongs to user's store
    const ticket = await ticketStorage.getById(ticketId, storeId)
    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    // Compress and convert image to JPG if it's an image (skip PDFs)
    const processedFile = await compressAndConvertToJpg(file)

    // Generate unique filename using secure random (use processed file name for correct extension)
    let fileName: string
    try {
      fileName = generateUniqueFileName('tickets', ticketId, processedFile.name, ALLOWED_FILE_EXTENSIONS, storeId)
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

    // Save image record to database (store the blob URL)
    // Use original filename for user reference, but store processed file info
    const image = await ticketStorage.createImage(
      ticketId,
      file.name, // Keep original filename for user reference
      blob.url,
      processedFile.size,
      processedFile.type
    )

    return NextResponse.json(
      { image, message: 'Image uploaded successfully' },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error uploading image:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  const authResult = await withAuth(request, { action: 'ticket image deletion' })
  if (authResult.response) {
    return authResult.response
  }
  const session = authResult.session

  try {
    const searchParams = request.nextUrl.searchParams
    const imageId = searchParams.get('imageId')

    if (!imageId) {
      return NextResponse.json(
        { error: 'Missing imageId' },
        { status: 400 }
      )
    }

    // Get user's storeId to verify image ownership
    const storeId = await userStorage.getStoreId(session.user.id)
    if (!storeId) {
      return NextResponse.json(
        { error: 'User store not found' },
        { status: 404 }
      )
    }

    // Get image and verify it belongs to a ticket in user's store
    const image = await ticketStorage.getImageById(imageId)
    if (!image) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      )
    }

    // Verify the ticket belongs to user's store
    const ticket = await ticketStorage.getById(image.ticketId, storeId)
    if (!ticket) {
      return NextResponse.json(
        { error: 'Unauthorized: Image does not belong to your store' },
        { status: 403 }
      )
    }

    // Delete image (this will also delete from Vercel Blob)
    const deleted = await ticketStorage.deleteImage(imageId)

    if (!deleted) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { message: 'Image deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error deleting image:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

