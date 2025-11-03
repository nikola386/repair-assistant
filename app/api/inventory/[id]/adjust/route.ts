import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth.middleware'
import { userStorage } from '@/lib/userStorage'
import { inventoryStorage } from '@/lib/inventoryStorage'
import { logger, generateRequestId } from '@/lib/logger'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = request.headers.get('X-Request-ID') || generateRequestId()
  const startTime = Date.now()

  const authResult = await withAuth(request, { action: 'inventory quantity adjustment' })
  if (authResult.response) {
    return authResult.response
  }
  const session = authResult.session

  // Get user's storeId
  const user = await userStorage.findById(session.user.id)
  if (!user || !user.storeId) {
    logger.error('User or store not found', { userId: session.user.id }, requestId)
    return NextResponse.json({ error: 'User store not found' }, { status: 404 })
  }

  try {
    logger.info('Adjusting inventory quantity', {
      itemId: params.id,
      userId: session.user.id,
      storeId: user.storeId,
    }, requestId)

    const body = await request.json()
    const { quantity, reason } = body

    // Validate required fields
    if (quantity === undefined || quantity === null) {
      return NextResponse.json({ error: 'Quantity is required' }, { status: 400 })
    }

    const quantityChange = parseFloat(quantity)
    if (isNaN(quantityChange)) {
      return NextResponse.json({ error: 'Quantity must be a valid number' }, { status: 400 })
    }

    if (quantityChange === 0) {
      return NextResponse.json({ error: 'Quantity change cannot be zero' }, { status: 400 })
    }

    const item = await inventoryStorage.adjustQuantity(params.id, user.storeId, quantityChange)
    const duration = Date.now() - startTime
    logger.info('Inventory quantity adjusted successfully', {
      itemId: params.id,
      quantityChange,
      reason,
      duration,
    }, requestId)

    return NextResponse.json(
      {
        item,
        message: `Quantity ${quantityChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(quantityChange)}`,
      },
      { status: 200 }
    )
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Error adjusting inventory quantity', error, requestId)
    logger.error('Error adjusting inventory quantity details', { itemId: params.id, duration }, requestId)

    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 })
      }
      if (error.message.includes('cannot be negative')) {
        return NextResponse.json({ error: 'Quantity cannot be negative' }, { status: 400 })
      }
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

