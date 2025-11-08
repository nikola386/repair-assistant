import { NextRequest, NextResponse } from 'next/server'
import { warrantyStorage } from '@/lib/warrantyStorage'
import { userStorage } from '@/lib/userStorage'
import { requireAuthAndPermission } from '@/lib/api-middleware'
import { Permission } from '@/lib/permissions'
import { logger, generateRequestId } from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: { ticketId: string } }
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
    logger.info('Fetching warranty by ticket ID', { ticketId: params.ticketId, userId: session.user.id, storeId: user.storeId }, requestId)
    const warranty = await warrantyStorage.getByTicketId(params.ticketId, user.storeId)
    
    if (!warranty) {
      logger.warn('Warranty not found for ticket', { ticketId: params.ticketId }, requestId)
      return NextResponse.json(
        { error: 'Warranty not found for this ticket' },
        { status: 404 }
      )
    }
    
    const duration = Date.now() - startTime
    logger.info('Warranty fetched successfully', { warrantyId: warranty.id, duration }, requestId)
    return NextResponse.json({ warranty }, { status: 200 })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Error fetching warranty by ticket', error, requestId)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

