import { NextRequest, NextResponse } from 'next/server'
import { warrantyStorage } from '@/lib/warrantyStorage'
import { userStorage } from '@/lib/userStorage'
import { UpdateWarrantyInput, WarrantyStatus, WarrantyType } from '@/types/warranty'
import { requireAuthAndPermission } from '@/lib/api-middleware'
import { Permission } from '@/lib/permissions'
import { logger, generateRequestId } from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    logger.info('Fetching warranty by ID', { warrantyId: params.id, userId: session.user.id, storeId: user.storeId }, requestId)
    const warranty = await warrantyStorage.getById(params.id, user.storeId)
    
    if (!warranty) {
      logger.warn('Warranty not found', { warrantyId: params.id }, requestId)
      return NextResponse.json(
        { error: 'Warranty not found' },
        { status: 404 }
      )
    }
    
    const duration = Date.now() - startTime
    logger.info('Warranty fetched successfully', { warrantyId: params.id, duration }, requestId)
    return NextResponse.json({ warranty }, { status: 200 })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Error fetching warranty', error, requestId)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    logger.info('Updating warranty', { warrantyId: params.id, userId: session.user.id, storeId: user.storeId }, requestId)
    const body = await request.json()
    const {
      warrantyPeriodDays,
      warrantyType,
      status,
      terms,
      notes,
    } = body

    const validStatuses: WarrantyStatus[] = ['active', 'expired', 'voided', 'claimed']
    const validatedStatus: WarrantyStatus | undefined = status && validStatuses.includes(status as WarrantyStatus) 
      ? (status as WarrantyStatus) 
      : undefined

    const validTypes: WarrantyType[] = ['parts', 'labor', 'both']
    const validatedType: WarrantyType | undefined = warrantyType && validTypes.includes(warrantyType as WarrantyType)
      ? (warrantyType as WarrantyType)
      : undefined

    const updateInput: UpdateWarrantyInput = {
      ...(warrantyPeriodDays !== undefined && { warrantyPeriodDays }),
      ...(validatedType && { warrantyType: validatedType }),
      ...(validatedStatus && { status: validatedStatus }),
      ...(terms !== undefined && { terms }),
      ...(notes !== undefined && { notes }),
    }

    const warranty = await warrantyStorage.update(params.id, updateInput, user.storeId)
    
    if (!warranty) {
      logger.warn('Warranty not found for update', { warrantyId: params.id, storeId: user.storeId }, requestId)
      return NextResponse.json(
        { error: 'Warranty not found' },
        { status: 404 }
      )
    }
    
    const duration = Date.now() - startTime
    logger.info('Warranty updated successfully', { warrantyId: params.id, duration }, requestId)
    return NextResponse.json(
      { warranty, message: 'Warranty updated successfully' },
      { status: 200 }
    )
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Error updating warranty', error, requestId)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    logger.info('Voiding warranty', { warrantyId: params.id, userId: session.user.id, storeId: user.storeId }, requestId)
    const warranty = await warrantyStorage.voidWarranty(params.id, user.storeId)
    
    if (!warranty) {
      logger.warn('Warranty not found for void', { warrantyId: params.id }, requestId)
      return NextResponse.json(
        { error: 'Warranty not found' },
        { status: 404 }
      )
    }
    
    const duration = Date.now() - startTime
    logger.info('Warranty voided successfully', { warrantyId: params.id, duration }, requestId)
    return NextResponse.json(
      { warranty, message: 'Warranty voided successfully' },
      { status: 200 }
    )
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Error voiding warranty', error, requestId)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

