import { NextRequest, NextResponse } from 'next/server'
import { warrantyStorage } from '@/lib/warrantyStorage'
import { userStorage } from '@/lib/userStorage'
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
    logger.info('Fetching expiring warranties', { userId: session.user.id, storeId: user.storeId }, requestId)
    const searchParams = request.nextUrl.searchParams
    const daysAhead = parseInt(searchParams.get('days') || '30')
    
    const warranties = await warrantyStorage.getActiveWarranties(user.storeId, daysAhead)
    const duration = Date.now() - startTime
    logger.info('Expiring warranties fetched successfully', { count: warranties.length, daysAhead, duration }, requestId)
    return NextResponse.json({ warranties }, { status: 200 })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Error fetching expiring warranties', error, requestId)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

