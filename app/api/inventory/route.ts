import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth.middleware'
import { userStorage } from '@/lib/userStorage'
import { inventoryStorage } from '@/lib/inventoryStorage'
import { CreateInventoryItemInput } from '@/types/inventory'
import { logger, generateRequestId } from '@/lib/logger'

export async function GET(request: NextRequest) {
  const requestId = request.headers.get('X-Request-ID') || generateRequestId()
  const startTime = Date.now()

  const authResult = await withAuth(request, { action: 'inventory list access' })
  if (authResult.response) {
    return authResult.response
  }
  const session = authResult.session

  // Get user's storeId
  const user = await userStorage.findById(session.user.id)
  if (!user) {
    logger.error('User not found', { userId: session.user.id }, requestId)
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }
  
  const storeId = await userStorage.getStoreId(session.user.id)
  if (!storeId) {
    logger.error('Store not found', { userId: session.user.id }, requestId)
    return NextResponse.json({ error: 'User store not found' }, { status: 404 })
  }

  try {
    logger.info('Fetching inventory items', { userId: session.user.id, storeId }, requestId)

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || undefined
    const category = searchParams.get('category') || undefined
    const location = searchParams.get('location') || undefined
    const lowStock = searchParams.get('lowStock') === 'true'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const result = await inventoryStorage.getAll(storeId, {
      search,
      category,
      location,
      lowStock,
      page,
      limit,
    })

    const duration = Date.now() - startTime
    logger.info('Inventory items fetched successfully', {
      count: result.items.length,
      page,
      limit,
      duration,
    }, requestId)

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Error fetching inventory items', error, requestId)
    logger.error('Error fetching inventory items details', { duration }, requestId)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const requestId = request.headers.get('X-Request-ID') || generateRequestId()
  const startTime = Date.now()

  const authResult = await withAuth(request, { action: 'inventory creation' })
  if (authResult.response) {
    return authResult.response
  }
  const session = authResult.session

  // Get user's storeId
  const user = await userStorage.findById(session.user.id)
  if (!user) {
    logger.error('User not found', { userId: session.user.id }, requestId)
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }
  
  const storeId = await userStorage.getStoreId(session.user.id)
  if (!storeId) {
    logger.error('Store not found', { userId: session.user.id }, requestId)
    return NextResponse.json({ error: 'User store not found' }, { status: 404 })
  }

  try {
    logger.info('Creating inventory item', { userId: session.user.id, storeId }, requestId)
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

    // Validate required fields
    if (!name || !name.trim()) {
      logger.warn('Inventory item creation validation failed: missing name', {}, requestId)
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const input: CreateInventoryItemInput = {
      name: name.trim(),
      sku: sku?.trim() || undefined,
      description: description?.trim() || undefined,
      category: category?.trim() || undefined,
      location: location?.trim() || undefined,
      currentQuantity: currentQuantity !== undefined ? parseFloat(currentQuantity) : undefined,
      minQuantity: minQuantity !== undefined ? parseFloat(minQuantity) : undefined,
      unitPrice: unitPrice !== undefined ? parseFloat(unitPrice) : undefined,
      costPrice: costPrice !== undefined ? parseFloat(costPrice) : undefined,
    }

    // Validate numeric fields
    if (input.currentQuantity !== undefined && (isNaN(input.currentQuantity) || input.currentQuantity < 0)) {
      return NextResponse.json({ error: 'Current quantity must be a valid non-negative number' }, { status: 400 })
    }

    if (input.minQuantity !== undefined && (isNaN(input.minQuantity) || input.minQuantity < 0)) {
      return NextResponse.json({ error: 'Min quantity must be a valid non-negative number' }, { status: 400 })
    }

    if (input.unitPrice !== undefined && (isNaN(input.unitPrice) || input.unitPrice < 0)) {
      return NextResponse.json({ error: 'Unit price must be a valid non-negative number' }, { status: 400 })
    }

    if (input.costPrice !== undefined && (isNaN(input.costPrice) || input.costPrice < 0)) {
      return NextResponse.json({ error: 'Cost price must be a valid non-negative number' }, { status: 400 })
    }

    const item = await inventoryStorage.create(storeId, input)
    const duration = Date.now() - startTime
    logger.info('Inventory item created successfully', { itemId: item.id, duration }, requestId)

    return NextResponse.json({ item, message: 'Inventory item created successfully' }, { status: 201 })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Error creating inventory item', error, requestId)
    logger.error('Error creating inventory item details', { duration }, requestId)

    // Handle unique constraint violation for SKU
    if (error instanceof Error && error.message.includes('SKU must be unique')) {
      return NextResponse.json({ error: 'SKU must be unique within this store' }, { status: 409 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

