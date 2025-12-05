import { NextRequest, NextResponse } from 'next/server'
import { requireAuthAndPermission } from '@/lib/api-middleware'
import { Permission } from '@/lib/permissions'
import { ticketStorage } from '@/lib/ticketStorage'
import { userStorage } from '@/lib/userStorage'
import sharp from 'sharp'
import QRCode from 'qrcode'

// Mark route as dynamic
export const dynamic = 'force-dynamic'

// Label dimensions (62mm x 20mm at 300 DPI)
const LABEL_WIDTH_MM = 62
const LABEL_HEIGHT_MM = 20
const DPI = 300
const LABEL_WIDTH_PX = Math.round((LABEL_WIDTH_MM / 25.4) * DPI)
const LABEL_HEIGHT_PX = Math.round((LABEL_HEIGHT_MM / 25.4) * DPI)

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, response } = await requireAuthAndPermission(request, Permission.VIEW_TICKETS)
  if (response) return response

  try {
    // Get user and store info
    const user = await userStorage.findById(session.user.id)
    if (!user || !user.storeId) {
      return NextResponse.json(
        { error: 'User store not found' },
        { status: 404 }
      )
    }

    // Get ticket
    const ticket = await ticketStorage.getById(params.id, user.storeId)
    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    // Generate ticket URL
    const origin = request.headers.get('origin') || request.headers.get('host') || 'http://localhost:3001'
    const protocol = origin.startsWith('http') ? '' : 'https://'
    const baseUrl = origin.startsWith('http') ? origin : `${protocol}${origin}`
    const ticketUrl = `${baseUrl}/tickets/${ticket.id}`

    // QR code size (leave some margin for text and padding)
    const qrSize = Math.min(LABEL_WIDTH_PX - 40, LABEL_HEIGHT_PX - 80)
    const qrX = (LABEL_WIDTH_PX - qrSize) / 2
    const qrY = 50

    // Generate QR code as PNG buffer
    const qrCodeBuffer = await QRCode.toBuffer(ticketUrl, {
      type: 'png',
      width: qrSize,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    })

    // Create label image with QR code and ticket number
    const labelImage = await sharp({
      create: {
        width: LABEL_WIDTH_PX,
        height: LABEL_HEIGHT_PX,
        channels: 3,
        background: { r: 255, g: 255, b: 255 }
      }
    })
    .composite([
      // Add ticket number text (we'll use a simple approach with SVG)
      {
        input: Buffer.from(`
          <svg width="${LABEL_WIDTH_PX}" height="30" xmlns="http://www.w3.org/2000/svg">
            <text x="50%" y="20" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="black">${ticket.ticketNumber}</text>
          </svg>
        `),
        top: 10,
        left: 0
      },
      // Add QR code
      {
        input: qrCodeBuffer,
        top: qrY,
        left: qrX
      }
    ])
    .png()
    .toBuffer()

    // Return the image
    return new NextResponse(new Uint8Array(labelImage), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `inline; filename="qr-label-${ticket.ticketNumber}.png"`,
      },
    })
  } catch (error) {
    console.error('Error generating QR label:', error)
    return NextResponse.json(
      { error: 'Failed to generate QR label' },
      { status: 500 }
    )
  }
}

