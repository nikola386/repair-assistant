import { NextRequest, NextResponse } from 'next/server'
import { settingsStorage } from '@/lib/settingsStorage'
import { withAuth } from '@/lib/auth.middleware'

export async function GET(request: NextRequest) {
  const authResult = await withAuth(request, { action: 'settings access' })
  if (authResult.response) {
    return authResult.response
  }
  const session = authResult.session

  try {
    let settings = await settingsStorage.findByUserId(session.user.id)
    
    // If settings don't exist, return defaults
    if (!settings) {
      settings = {
        id: '',
        userId: session.user.id,
        primaryColor: '#FFD700',
        secondaryColor: '#000000',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    }

    return NextResponse.json({ settings }, { status: 200 })
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  const authResult = await withAuth(request, { action: 'settings update' })
  if (authResult.response) {
    return authResult.response
  }
  const session = authResult.session

  try {
    const body = await request.json()
    const { primaryColor, secondaryColor } = body

    // Validate color format (hex color)
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
    
    if (primaryColor && !hexColorRegex.test(primaryColor)) {
      return NextResponse.json(
        { error: 'Invalid primary color format. Please use hex format (e.g., #FFD700)' },
        { status: 400 }
      )
    }

    if (secondaryColor && !hexColorRegex.test(secondaryColor)) {
      return NextResponse.json(
        { error: 'Invalid secondary color format. Please use hex format (e.g., #000000)' },
        { status: 400 }
      )
    }

    const updatedSettings = await settingsStorage.updateColors(
      session.user.id,
      primaryColor,
      secondaryColor
    )

    return NextResponse.json(
      { settings: updatedSettings, message: 'Settings updated successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

