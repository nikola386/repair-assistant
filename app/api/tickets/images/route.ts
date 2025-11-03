import { NextRequest, NextResponse } from 'next/server'
import { ticketStorage } from '@/lib/ticketStorage'
import { userStorage } from '@/lib/userStorage'
import { put, del } from '@vercel/blob'
import { withAuth } from '@/lib/auth.middleware'

// Magic bytes (file signatures) for file type validation
const MAGIC_BYTES: Record<string, number[][]> = {
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
  'image/gif': [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF header, WEBP follows
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
}

/**
 * Validate file content using magic bytes
 */
async function validateFileContent(file: File, expectedMimeType: string): Promise<boolean> {
  const signatures = MAGIC_BYTES[expectedMimeType]
  if (!signatures) {
    return false
  }

  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)

  return signatures.some(signature => {
    if (bytes.length < signature.length) {
      return false
    }
    return signature.every((byte, index) => bytes[index] === byte)
  })
}

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
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only images and PDF files are allowed.' },
        { status: 400 }
      )
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024 // 2MB
    if (file.size > maxSize) {
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

    // Generate unique filename using secure random
    const timestamp = Date.now()
    const bytes = new Uint8Array(6)
    crypto.getRandomValues(bytes)
    const random = Array.from(bytes, byte => byte.toString(36)).join('').substring(0, 9)
    // Sanitize filename - remove path separators and special characters
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_').replace(/\.\./g, '_')
    const fileExtension = sanitizedFileName.split('.').pop() || 'bin'
    // Validate extension is safe
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf']
    const ext = fileExtension.toLowerCase()
    if (!allowedExtensions.includes(ext)) {
      return NextResponse.json(
        { error: 'Invalid file extension' },
        { status: 400 }
      )
    }
    const fileName = `tickets/${ticketId}-${timestamp}-${random}.${ext}`

    // Upload file to Vercel Blob
    const blob = await put(fileName, file, {
      access: 'public',
      contentType: file.type,
    })

    // Save image record to database (store the blob URL)
    const image = await ticketStorage.createImage(
      ticketId,
      file.name,
      blob.url,
      file.size,
      file.type
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

