import { NextRequest, NextResponse } from 'next/server'
import { settingsStorage } from '@/lib/settingsStorage'
import { userStorage } from '@/lib/userStorage'
import { withAuth } from '@/lib/auth.middleware'
import { db } from '@/lib/db'
import { put, del } from '@vercel/blob'

export async function GET(request: NextRequest) {
  const authResult = await withAuth(request, { action: 'settings access' })
  if (authResult.response) {
    return authResult.response
  }
  const session = authResult.session

  try {
    // Get user's storeId
    const storeId = await userStorage.getStoreId(session.user.id)
    if (!storeId) {
      return NextResponse.json(
        { error: 'User store not found' },
        { status: 404 }
      )
    }

    // Fetch store and settings
    const store = await db.store.findUnique({
      where: { id: storeId },
    })

    if (!store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      )
    }

    let settings = await settingsStorage.findByStoreId(storeId)
    
    // If settings don't exist, return defaults
    if (!settings) {
      settings = {
        id: '',
        storeId: storeId,
        primaryColor: '#FFD700',
        secondaryColor: '#000000',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    }

    return NextResponse.json({ store, settings }, { status: 200 })
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
    // Get user's storeId
    const storeId = await userStorage.getStoreId(session.user.id)
    if (!storeId) {
      return NextResponse.json(
        { error: 'User store not found' },
        { status: 404 }
      )
    }

    const contentType = request.headers.get('content-type') || ''
    const isFormData = contentType.includes('multipart/form-data')
    
    // Handle FormData (store updates with logo)
    if (isFormData) {
      const formData = await request.formData()
      
      // Store fields
      const storeName = formData.get('storeName') as string | null
      const street = formData.get('street') as string | null
      const city = formData.get('city') as string | null
      const state = formData.get('state') as string | null
      const postalCode = formData.get('postalCode') as string | null
      const country = formData.get('country') as string | null
      const website = formData.get('website') as string | null
      const phone = formData.get('phone') as string | null
      const currency = formData.get('currency') as string | null
      const vatNumber = formData.get('vatNumber') as string | null
      const logoFile = formData.get('logo') as File | null
      const removeLogo = formData.get('removeLogo') === 'true'
      
      // Settings fields
      const primaryColor = formData.get('primaryColor') as string | null
      const secondaryColor = formData.get('secondaryColor') as string | null

      // Get existing store
      const existingStore = await db.store.findUnique({
        where: { id: storeId },
      })

      if (!existingStore) {
        return NextResponse.json(
          { error: 'Store not found' },
          { status: 404 }
        )
      }

      let logoUrl: string | null = existingStore.logo

      // Handle logo removal if requested
      if (removeLogo) {
        // Delete old logo if exists
        if (existingStore.logo) {
          try {
            if (existingStore.logo.startsWith('https://')) {
              await del(existingStore.logo)
            }
          } catch (error) {
            console.error('Error deleting logo:', error)
            // Continue even if deletion fails
          }
        }
        logoUrl = null
      }
      // Handle logo upload if provided
      else if (logoFile && logoFile.size > 0) {
        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
        if (!allowedTypes.includes(logoFile.type)) {
          return NextResponse.json(
            { error: 'Invalid file type. Only images are allowed.' },
            { status: 400 }
          )
        }

        // Validate file size (max 2MB)
        const maxSize = 2 * 1024 * 1024 // 2MB
        if (logoFile.size > maxSize) {
          return NextResponse.json(
            { error: 'File size too large. Maximum size is 2MB.' },
            { status: 400 }
          )
        }

        // Delete old logo if exists
        if (existingStore.logo) {
          try {
            if (existingStore.logo.startsWith('https://')) {
              await del(existingStore.logo)
            }
          } catch (error) {
            console.error('Error deleting old logo:', error)
            // Continue even if deletion fails
          }
        }

        // Generate unique filename
        const timestamp = Date.now()
        const random = Math.random().toString(36).substring(2, 9)
        const fileExtension = logoFile.name.split('.').pop()
        const fileName = `stores/${storeId}-${timestamp}-${random}.${fileExtension}`

        // Upload file to Vercel Blob
        const blob = await put(fileName, logoFile, {
          access: 'public',
          contentType: logoFile.type,
        })

        logoUrl = blob.url
      }

      // Build address string from components if available
      const addressParts = [street, city, state, postalCode, country].filter(Boolean)
      const address = addressParts.length > 0 ? addressParts.join(', ') : null

      // Update store
      const storeUpdateData: any = {}
      if (storeName !== null) storeUpdateData.name = storeName.trim()
      if (address !== null) storeUpdateData.address = address
      if (street !== null) storeUpdateData.street = street.trim() || null
      if (city !== null) storeUpdateData.city = city.trim() || null
      if (state !== null) storeUpdateData.state = state.trim() || null
      if (postalCode !== null) storeUpdateData.postalCode = postalCode.trim() || null
      if (country !== null) storeUpdateData.country = country.trim() || null
      if (website !== null) storeUpdateData.website = website.trim() || null
      if (phone !== null) storeUpdateData.phone = phone.trim() || null
      if (currency !== null) storeUpdateData.currency = currency.trim() || 'USD'
      if (vatNumber !== null) storeUpdateData.vatNumber = vatNumber.trim() || null
      if (logoFile && logoFile.size > 0) storeUpdateData.logo = logoUrl
      if (removeLogo) storeUpdateData.logo = null

      let updatedStore = existingStore
      if (Object.keys(storeUpdateData).length > 0) {
        updatedStore = await db.store.update({
          where: { id: storeId },
          data: storeUpdateData,
        })
      }

      // Update settings colors if provided
      if (primaryColor || secondaryColor) {
        const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
        
        if (primaryColor && !colorRegex.test(primaryColor)) {
          return NextResponse.json(
            { error: 'Invalid primary color format' },
            { status: 400 }
          )
        }
        
        if (secondaryColor && !colorRegex.test(secondaryColor)) {
          return NextResponse.json(
            { error: 'Invalid secondary color format' },
            { status: 400 }
          )
        }

        await settingsStorage.updateColors(
          storeId,
          primaryColor || undefined,
          secondaryColor || undefined
        )
      }

      const updatedSettings = await settingsStorage.findByStoreId(storeId)

      return NextResponse.json(
        { store: updatedStore, settings: updatedSettings, message: 'Settings updated successfully' },
        { status: 200 }
      )
    }
    
    // Handle JSON (colors only for backward compatibility)
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
      storeId,
      primaryColor,
      secondaryColor
    )

    const store = await db.store.findUnique({
      where: { id: storeId },
    })

    return NextResponse.json(
      { store, settings: updatedSettings, message: 'Settings updated successfully' },
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

