import { NextRequest, NextResponse } from 'next/server'
import { warrantyStorage } from '@/lib/warrantyStorage'
import { userStorage } from '@/lib/userStorage'
import { CreateWarrantyInput, WarrantyStatus, WarrantyType } from '@/types/warranty'
import { requireAuthAndPermission } from '@/lib/api-middleware'
import { Permission } from '@/lib/permissions'
import { logger, generateRequestId } from '@/lib/logger'

export async function GET(request: NextRequest) {
  const requestId = request.headers.get('X-Request-ID') || generateRequestId()
  const startTime = Date.now()
  
  const { session, response } = await requireAuthAndPermission(request, Permission.VIEW_TICKETS)
  if (response) return response

  const user = await userStorage.findById(session.user.id)
  if (!user || !user.storeId) {
    logger.error('User or store not found', { userId: session.user.id }, requestId)
    return NextResponse.json(
      { error: 'User store not found' },
      { status: 404 }
    )
  }

  try {
    logger.info('Fetching warranties', { userId: session.user.id, storeId: user.storeId }, requestId)
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || undefined
    const status = searchParams.get('status') || undefined
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const result = await warrantyStorage.getAll(user.storeId, {
      search,
      status,
      page,
      limit,
    })
    
    const duration = Date.now() - startTime
    logger.info('Warranties fetched successfully', {
      count: result.warranties.length,
      page,
      limit,
      duration,
    }, requestId)
    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Error fetching warranties', error, requestId)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const requestId = request.headers.get('X-Request-ID') || generateRequestId()
  const startTime = Date.now()
  
  const { session, response } = await requireAuthAndPermission(request, Permission.EDIT_TICKETS)
  if (response) return response

  const user = await userStorage.findById(session.user.id)
  if (!user || !user.storeId) {
    logger.error('User or store not found', { userId: session.user.id }, requestId)
    return NextResponse.json(
      { error: 'User store not found' },
      { status: 404 }
    )
  }

  try {
    logger.info('Creating new warranty', { userId: session.user.id, storeId: user.storeId }, requestId)
    const body = await request.json()
    const {
      ticketId,
      warrantyPeriodDays,
      warrantyType,
      startDate,
      terms,
      notes,
    } = body

    if (!ticketId) {
      logger.warn('Warranty creation validation failed: missing ticketId', {}, requestId)
      return NextResponse.json(
        { error: 'Missing required field: ticketId' },
        { status: 400 }
      )
    }

    const validTypes: WarrantyType[] = ['parts', 'labor', 'both']
    const validatedType: WarrantyType | undefined = warrantyType && validTypes.includes(warrantyType as WarrantyType)
      ? (warrantyType as WarrantyType)
      : undefined

    const warrantyInput: CreateWarrantyInput = {
      ticketId,
      warrantyPeriodDays,
      warrantyType: validatedType,
      startDate,
      terms,
      notes,
    }

    const warranty = await warrantyStorage.create(warrantyInput, user.storeId)
    const duration = Date.now() - startTime
    logger.info('Warranty created successfully', { warrantyId: warranty.id, duration }, requestId)

    return NextResponse.json(
      { warranty, message: 'Warranty created successfully' },
      { status: 201 }
    )
  } catch (error: any) {
    const duration = Date.now() - startTime
    logger.error('Error creating warranty', error, requestId)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.message?.includes('not found') ? 404 : 500 }
    )
  }
}

