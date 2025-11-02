import { NextRequest, NextResponse } from 'next/server'
import { ticketStorage } from '@/lib/ticketStorage'
import { put, del } from '@vercel/blob'
import { withAuth } from '@/lib/auth.middleware'

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

    // Verify ticket exists
    const ticket = await ticketStorage.getById(ticketId)
    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    // Generate unique filename
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 9)
    const fileExtension = file.name.split('.').pop()
    const fileName = `tickets/${ticketId}-${timestamp}-${random}.${fileExtension}`

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

