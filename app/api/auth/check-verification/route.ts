import { NextRequest, NextResponse } from 'next/server'
import { userStorage } from '@/lib/userStorage'

/**
 * Check if user exists and requires email verification
 * POST /api/auth/check-verification
 * This endpoint is used by the login page to determine if login failed due to unverified email
 */
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

    // Don't reveal if user exists or not for security
    // Only return requiresVerification if user exists and is not verified
    if (user && !user.emailVerified) {
      return NextResponse.json({
        requiresVerification: true,
      })
    }

    // User doesn't exist or is already verified
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

