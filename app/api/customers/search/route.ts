import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth.middleware'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  const authResult = await withAuth(request, { action: 'customer search' })
  if (authResult.response) {
    return authResult.response
  }
  const session = authResult.session

  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q') || ''
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ customers: [] }, { status: 200 })
    }

    const customers = await db.customer.findMany({
      where: {
        OR: [
          { phone: { contains: query, mode: 'insensitive' } },
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
      },
      orderBy: {
        name: 'asc',
      },
      take: limit,
    })

    return NextResponse.json({ customers }, { status: 200 })
  } catch (error) {
    console.error('Error searching customers:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
