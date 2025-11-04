import { NextRequest, NextResponse } from 'next/server'
import { userStorage } from '@/lib/userStorage'
import { emailService } from '@/lib/email'
import { rateLimit } from '@/lib/rateLimit'

/**
 * Resend verification email
 * POST /api/auth/resend-verification
 */
export async function POST(request: NextRequest) {
  try {

    const rateLimitResponse = rateLimit(request, 3, 60 * 60 * 1000)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const user = await userStorage.findByEmail(email)

    if (!user) {
      // Don't reveal if user exists or not for security
      return NextResponse.json({
        message: 'If an account exists with this email, a verification email has been sent.',
      })
    }

    // Check if email is already verified
    if (user.emailVerified) {
      return NextResponse.json(
        { error: 'Email is already verified' },
        { status: 400 }
      )
    }

    // Check rate limit (1 minute)
    const canResend = await userStorage.canResendVerificationEmail(user.id)
    if (!canResend) {
      return NextResponse.json(
        { error: 'Please wait before requesting another verification email' },
        { status: 429 }
      )
    }

    // Generate new verification token
    const verificationToken = emailService.generateVerificationToken()
    await userStorage.generateVerificationToken(user.id, verificationToken)

    // Send verification email
    try {
      await emailService.sendVerificationEmail(
        user.email,
        verificationToken,
        user.name
      )

      return NextResponse.json({
        message: 'Verification email sent successfully',
      })
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError)
      return NextResponse.json(
        { error: 'Failed to send verification email. Please try again later.' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Resend verification error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}

