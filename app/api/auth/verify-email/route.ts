import { NextRequest, NextResponse } from 'next/server'
import { userStorage } from '@/lib/userStorage'

/**
 * Verify email address using token
 * GET /api/auth/verify-email?token=...
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Verification token is required' },
        { status: 400 }
      )
    }

    const user = await userStorage.verifyEmail(token)

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired verification token' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: 'Email verified successfully',
      verified: true,
    })
  } catch (error) {
    console.error('Email verification error:', error)
    return NextResponse.json(
      { error: 'An error occurred during verification' },
      { status: 500 }
    )
  }
}

/**
 * Verify email address using token (POST method for form submission)
 * POST /api/auth/verify-email
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json(
        { error: 'Verification token is required' },
        { status: 400 }
      )
    }

    console.log('Attempting to verify email with token:', token.substring(0, 10) + '...')
    
    const user = await userStorage.verifyEmail(token)

    if (!user) {
      console.log('Verification failed: Invalid or expired token')
      return NextResponse.json(
        { error: 'Invalid or expired verification token' },
        { status: 400 }
      )
    }

    console.log('Email verified successfully for user:', user.id, user.email)
    return NextResponse.json({
      message: 'Email verified successfully',
      verified: true,
    })
  } catch (error) {
    console.error('Email verification error:', error)
    // If the error message suggests the user might already be verified, check the DB
    if (error instanceof Error && error.message.includes('update did not persist')) {
      return NextResponse.json(
        { error: 'Verification failed. Please try again or contact support.' },
        { status: 500 }
      )
    }
    return NextResponse.json(
      { error: 'An error occurred during verification' },
      { status: 500 }
    )
  }
}

