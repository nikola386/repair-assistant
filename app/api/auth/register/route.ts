import { NextRequest, NextResponse } from 'next/server'
import { userStorage } from '@/lib/userStorage'
import { z } from 'zod'
import { rateLimit, getRateLimitHeaders } from '@/lib/rateLimit'
import { passwordSchema } from '@/lib/validation'

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: passwordSchema,
  name: z.string().min(1, 'Name is required').max(200, 'Name must be less than 200 characters'),
})

export async function POST(request: NextRequest) {
  // Rate limiting: 3 registrations per IP per hour
  const rateLimitResponse = rateLimit(request, 3, 60 * 60 * 1000)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  try {
    const body = await request.json()
    
    // Validate input
    const validationResult = registerSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0].message },
        { status: 400 }
      )
    }

    const { email, password, name } = validationResult.data

    // Check if user already exists
    const existingUser = await userStorage.findByEmail(email)
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    // Create user with a temporary store (will be updated during onboarding)
    // For now, we'll create the store during registration, but onboarding will allow customization
    const user = await userStorage.create({
      email,
      password,
      name: name.trim(),
      storeName: `${name.trim()}'s Store`, // Temporary store name
    })

    const headers = getRateLimitHeaders(request, 3)
    return NextResponse.json(
      { 
        message: 'User registered successfully',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        }
      },
      { 
        status: 201,
        headers,
      }
    )
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Failed to register user' },
      { status: 500 }
    )
  }
}

