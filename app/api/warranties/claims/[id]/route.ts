import { NextRequest, NextResponse } from 'next/server'
import { warrantyStorage } from '@/lib/warrantyStorage'
import { userStorage } from '@/lib/userStorage'
import { UpdateWarrantyClaimInput, WarrantyClaimStatus } from '@/types/warranty'
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
    logger.info('Fetching warranty claim by ID', { claimId: params.id, userId: session.user.id, storeId: user.storeId }, requestId)
    const claim = await warrantyStorage.getClaimById(params.id, user.storeId)
    
    if (!claim) {
      logger.warn('Warranty claim not found', { claimId: params.id }, requestId)
      return NextResponse.json(
        { error: 'Warranty claim not found' },
        { status: 404 }
      )
    }
    
    const duration = Date.now() - startTime
    logger.info('Warranty claim fetched successfully', { claimId: params.id, duration }, requestId)
    return NextResponse.json({ claim }, { status: 200 })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Error fetching warranty claim', error, requestId)
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
    logger.info('Updating warranty claim', { claimId: params.id, userId: session.user.id, storeId: user.storeId }, requestId)
    const body = await request.json()
    const {
      status,
      resolutionNotes,
      resolutionDate,
      relatedTicketId,
    } = body

    const validStatuses: WarrantyClaimStatus[] = ['pending', 'approved', 'rejected', 'completed']
    const validatedStatus: WarrantyClaimStatus | undefined = status && validStatuses.includes(status as WarrantyClaimStatus) 
      ? (status as WarrantyClaimStatus) 
      : undefined

    const updateInput: UpdateWarrantyClaimInput = {
      ...(validatedStatus && { status: validatedStatus }),
      ...(resolutionNotes !== undefined && { resolutionNotes }),
      ...(resolutionDate !== undefined && { resolutionDate }),
      ...(relatedTicketId !== undefined && { relatedTicketId }),
    }

    const claim = await warrantyStorage.updateClaim(params.id, updateInput, user.storeId)
    
    if (!claim) {
      logger.warn('Warranty claim not found for update', { claimId: params.id, storeId: user.storeId }, requestId)
      return NextResponse.json(
        { error: 'Warranty claim not found' },
        { status: 404 }
      )
    }
    
    const duration = Date.now() - startTime
    logger.info('Warranty claim updated successfully', { claimId: params.id, duration }, requestId)
    return NextResponse.json(
      { claim, message: 'Warranty claim updated successfully' },
      { status: 200 }
    )
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Error updating warranty claim', error, requestId)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

