import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const countries = await db.country.findMany({
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json({ countries }, { status: 200 })
  } catch (error) {
    console.error('Error fetching countries:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

