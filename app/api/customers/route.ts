import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth.middleware'
import { userStorage } from '@/lib/userStorage'
import { db } from '@/lib/db'
import { logger, generateRequestId } from '@/lib/logger'

export async function GET(request: NextRequest) {
  const requestId = request.headers.get('X-Request-ID') || generateRequestId()
  const startTime = Date.now()
  
  const authResult = await withAuth(request, { action: 'customer list access' })
  if (authResult.response) {
    return authResult.response
  }
  const session = authResult.session

  // Get user's storeId
  const user = await userStorage.findById(session.user.id)
  if (!user || !user.storeId) {
    logger.error('User or store not found', { userId: session.user.id }, requestId)
    return NextResponse.json(
      { error: 'User store not found' },
      { status: 404 }
    )
  }

  try {
    logger.info('Fetching customers', { userId: session.user.id, storeId: user.storeId }, requestId)
    
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || undefined
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const offset = (page - 1) * limit

    // Build where clause - always filter by storeId
    const where: any = {
      storeId: user.storeId,
    }
    if (search && search.trim()) {
      const searchTerm = search.trim()
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { email: { contains: searchTerm, mode: 'insensitive' } },
        { phone: { contains: searchTerm, mode: 'insensitive' } },
      ]
    }

    // Get total count and paginated results
    const [total, customers] = await Promise.all([
      db.customer.count({ where }),
      db.customer.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              repairTickets: true,
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
        skip: offset,
        take: limit,
      }),
    ])

    const totalPages = Math.ceil(total / limit)

    const duration = Date.now() - startTime
    logger.info('Customers fetched successfully', { count: customers.length, page, limit, duration }, requestId)

    return NextResponse.json(
      {
        customers: customers.map((c) => ({
          id: c.id,
          name: c.name,
          email: c.email,
          phone: c.phone,
          ticketCount: c._count.repairTickets,
          createdAt: c.createdAt.toISOString(),
          updatedAt: c.updatedAt.toISOString(),
        })),
        total,
        page,
        limit,
        totalPages,
      },
      { status: 200 }
    )
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Error fetching customers', error, requestId)
    logger.error('Error fetching customers details', { duration }, requestId)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

