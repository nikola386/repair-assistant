import { NextRequest, NextResponse } from 'next/server'
import { requireAuthAndPermission } from '@/lib/api-middleware'
import { Permission } from '@/lib/permissions'
import { userStorage } from '@/lib/userStorage'
import { inventoryStorage } from '@/lib/inventoryStorage'
import { UpdateInventoryItemInput } from '@/types/inventory'
import { logger, generateRequestId } from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = request.headers.get('X-Request-ID') || generateRequestId()
  const startTime = Date.now()

  const { session, response } = await requireAuthAndPermission(request, Permission.VIEW_INVENTORY)
  if (response) return response

  // Get user's storeId
  const user = await userStorage.findById(session.user.id)
  if (!user || !user.storeId) {
    logger.error('User or store not found', { userId: session.user.id }, requestId)
    return NextResponse.json({ error: 'User store not found' }, { status: 404 })
  }

  try {
    logger.info('Fetching inventory item', {
      itemId: params.id,
      userId: session.user.id,
      storeId: user.storeId,
    }, requestId)

    const item = await inventoryStorage.getById(params.id, user.storeId)

    if (!item) {
      logger.warn('Inventory item not found', { itemId: params.id, storeId: user.storeId }, requestId)
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 })
    }

    const duration = Date.now() - startTime
    logger.info('Inventory item fetched successfully', { itemId: params.id, duration }, requestId)

    return NextResponse.json({ item }, { status: 200 })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Error fetching inventory item', error, requestId)
    logger.error('Error fetching inventory item details', { itemId: params.id, duration }, requestId)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = request.headers.get('X-Request-ID') || generateRequestId()
  const startTime = Date.now()

  const { session, response } = await requireAuthAndPermission(request, Permission.EDIT_INVENTORY)
  if (response) return response

  // Get user's storeId
  const user = await userStorage.findById(session.user.id)
  if (!user || !user.storeId) {
    logger.error('User or store not found', { userId: session.user.id }, requestId)
    return NextResponse.json({ error: 'User store not found' }, { status: 404 })
  }

  try {
    logger.info('Updating inventory item', {
      itemId: params.id,
      userId: session.user.id,
      storeId: user.storeId,
    }, requestId)

    const body = await request.json()
    const {
      name,
      sku,
      description,
      category,
      location,
      currentQuantity,
      minQuantity,
      unitPrice,
      costPrice,
    } = body

    const input: UpdateInventoryItemInput = {}

    if (name !== undefined) {
      if (!name || !name.trim()) {
        return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
      }
      input.name = name.trim()
    }

    if (sku !== undefined) {
      input.sku = sku?.trim() || undefined
    }

    if (description !== undefined) {
      input.description = description?.trim() || undefined
    }

    if (category !== undefined) {
      input.category = category?.trim() || undefined
    }

    if (location !== undefined) {
      input.location = location?.trim() || undefined
    }

    if (currentQuantity !== undefined) {
      const quantity = parseFloat(currentQuantity)
      if (isNaN(quantity) || quantity < 0) {
        return NextResponse.json({ error: 'Current quantity must be a valid non-negative number' }, { status: 400 })
      }
      input.currentQuantity = quantity
    }

    if (minQuantity !== undefined) {
      const quantity = parseFloat(minQuantity)
      if (isNaN(quantity) || quantity < 0) {
        return NextResponse.json({ error: 'Min quantity must be a valid non-negative number' }, { status: 400 })
      }
      input.minQuantity = quantity
    }

    if (unitPrice !== undefined) {
      if (unitPrice === null || unitPrice === '') {
        input.unitPrice = undefined
      } else {
        const price = parseFloat(unitPrice)
        if (isNaN(price) || price < 0) {
          return NextResponse.json({ error: 'Unit price must be a valid non-negative number' }, { status: 400 })
        }
        input.unitPrice = price
      }
    }

    if (costPrice !== undefined) {
      if (costPrice === null || costPrice === '') {
        input.costPrice = undefined
      } else {
        const price = parseFloat(costPrice)
        if (isNaN(price) || price < 0) {
          return NextResponse.json({ error: 'Cost price must be a valid non-negative number' }, { status: 400 })
        }
        input.costPrice = price
      }
    }

    const item = await inventoryStorage.update(params.id, user.storeId, input)
    const duration = Date.now() - startTime
    logger.info('Inventory item updated successfully', { itemId: params.id, duration }, requestId)

    return NextResponse.json({ item, message: 'Inventory item updated successfully' }, { status: 200 })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Error updating inventory item', error, requestId)
    logger.error('Error updating inventory item details', { itemId: params.id, duration }, requestId)

    if (error instanceof Error) {
      if (error.message.includes('SKU must be unique')) {
        return NextResponse.json({ error: 'SKU must be unique within this store' }, { status: 409 })
      }
      if (error.message.includes('not found')) {
        return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 })
      }
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = request.headers.get('X-Request-ID') || generateRequestId()
  const startTime = Date.now()

  const { session, response } = await requireAuthAndPermission(request, Permission.DELETE_INVENTORY)
  if (response) return response

  // Get user's storeId
  const user = await userStorage.findById(session.user.id)
  if (!user || !user.storeId) {
    logger.error('User or store not found', { userId: session.user.id }, requestId)
    return NextResponse.json({ error: 'User store not found' }, { status: 404 })
  }

  try {
    logger.info('Deleting inventory item', {
      itemId: params.id,
      userId: session.user.id,
      storeId: user.storeId,
    }, requestId)

    const deleted = await inventoryStorage.delete(params.id, user.storeId)

    if (!deleted) {
      logger.warn('Inventory item not found for deletion', { itemId: params.id, storeId: user.storeId }, requestId)
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 })
    }

    const duration = Date.now() - startTime
    logger.info('Inventory item deleted successfully', { itemId: params.id, duration }, requestId)

    return NextResponse.json({ message: 'Inventory item deleted successfully' }, { status: 200 })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Error deleting inventory item', error, requestId)
    logger.error('Error deleting inventory item details', { itemId: params.id, duration }, requestId)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

