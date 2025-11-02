import { NextRequest, NextResponse } from 'next/server'
import { userStorage } from '@/lib/userStorage'
import { z } from 'zod'

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required'),
})

export async function POST(request: NextRequest) {
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

    return NextResponse.json(
      { 
        message: 'User registered successfully',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        }
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Failed to register user' },
      { status: 500 }
    )
  }
}

