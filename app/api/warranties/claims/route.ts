import { NextRequest, NextResponse } from 'next/server'
import { warrantyStorage } from '@/lib/warrantyStorage'
import { userStorage } from '@/lib/userStorage'
import { CreateWarrantyClaimInput, WarrantyClaimStatus } from '@/types/warranty'
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
    logger.info('Fetching warranty claims', { userId: session.user.id, storeId: user.storeId }, requestId)
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') as WarrantyClaimStatus | null
    
    const claims = await warrantyStorage.getAllClaims(user.storeId, status || undefined)
    const duration = Date.now() - startTime
    logger.info('Warranty claims fetched successfully', { count: claims.length, duration }, requestId)
    return NextResponse.json({ claims }, { status: 200 })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Error fetching warranty claims', error, requestId)
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
    logger.info('Creating new warranty claim', { userId: session.user.id, storeId: user.storeId }, requestId)
    const body = await request.json()
    const {
      warrantyId,
      issueDescription,
      claimDate,
    } = body

    if (!warrantyId || !issueDescription) {
      logger.warn('Warranty claim creation validation failed: missing required fields', {}, requestId)
      return NextResponse.json(
        { error: 'Missing required fields: warrantyId and issueDescription' },
        { status: 400 }
      )
    }

    const claimInput: CreateWarrantyClaimInput = {
      warrantyId,
      issueDescription,
      claimDate,
    }

    const claim = await warrantyStorage.createClaim(claimInput, user.storeId)
    const duration = Date.now() - startTime
    logger.info('Warranty claim created successfully', { claimId: claim.id, duration }, requestId)

    return NextResponse.json(
      { claim, message: 'Warranty claim created successfully' },
      { status: 201 }
    )
  } catch (error: any) {
    const duration = Date.now() - startTime
    logger.error('Error creating warranty claim', error, requestId)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.message?.includes('not found') ? 404 : 500 }
    )
  }
}

