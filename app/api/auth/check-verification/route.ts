import { NextRequest, NextResponse } from 'next/server'
import { userStorage } from '@/lib/userStorage'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const user = await userStorage.findByEmail(email)

    if (user && !user.emailVerified) {
      return NextResponse.json({
        requiresVerification: true,
      })
    }

    return NextResponse.json({
      requiresVerification: false,
    })
  } catch (error) {
    console.error('Check verification error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}

