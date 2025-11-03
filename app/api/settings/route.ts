import { NextRequest, NextResponse } from 'next/server'
import { settingsStorage } from '@/lib/settingsStorage'
import { userStorage } from '@/lib/userStorage'
import { withAuth } from '@/lib/auth.middleware'
import { db } from '@/lib/db'
import { put, del } from '@vercel/blob'
import { isValidLanguage, SUPPORTED_LANGUAGES } from '@/lib/languages'

// Magic bytes (file signatures) for file type validation
const MAGIC_BYTES: Record<string, number[][]> = {
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
  'image/gif': [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF header, WEBP follows
}

/**
 * Validate file content using magic bytes
 */
async function validateFileContent(file: File, expectedMimeType: string): Promise<boolean> {
  const signatures = MAGIC_BYTES[expectedMimeType]
  if (!signatures) {
    return false
  }

  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)

  return signatures.some(signature => {
    if (bytes.length < signature.length) {
      return false
    }
    return signature.every((byte, index) => bytes[index] === byte)
  })
}

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
      const language = formData.get('language') as string | null

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

        // Validate file content using magic bytes
        const isValidContent = await validateFileContent(logoFile, logoFile.type)
        if (!isValidContent) {
          return NextResponse.json(
            { error: 'File content does not match declared file type. Possible file spoofing detected.' },
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

        // Generate unique filename using secure random
        const timestamp = Date.now()
        const bytes = new Uint8Array(6)
        crypto.getRandomValues(bytes)
        const random = Array.from(bytes, byte => byte.toString(36)).join('').substring(0, 9)
        // Sanitize filename - remove path separators and special characters
        const sanitizedFileName = logoFile.name.replace(/[^a-zA-Z0-9.-]/g, '_').replace(/\.\./g, '_')
        const fileExtension = sanitizedFileName.split('.').pop() || 'bin'
        // Validate extension is safe
        const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp']
        const ext = fileExtension.toLowerCase()
        if (!allowedExtensions.includes(ext)) {
          return NextResponse.json(
            { error: 'Invalid file extension' },
            { status: 400 }
          )
        }
        const fileName = `stores/${storeId}-${timestamp}-${random}.${ext}`

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

      // Update settings if provided
      const updateSettings: { primaryColor?: string; secondaryColor?: string; language?: string } = {}
      
      if (primaryColor || secondaryColor || language) {
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

        if (language && !isValidLanguage(language)) {
          return NextResponse.json(
            { error: `Invalid language. Must be one of: ${SUPPORTED_LANGUAGES.join(', ')}` },
            { status: 400 }
          )
        }

        if (primaryColor) updateSettings.primaryColor = primaryColor
        if (secondaryColor) updateSettings.secondaryColor = secondaryColor
        if (language) updateSettings.language = language

        await settingsStorage.createOrUpdate(storeId, updateSettings)
      }

      const updatedSettings = await settingsStorage.findByStoreId(storeId)

      return NextResponse.json(
        { store: updatedStore, settings: updatedSettings, message: 'Settings updated successfully' },
        { status: 200 }
      )
    }
    
    // Handle JSON (colors and language for backward compatibility)
    const body = await request.json()
    const { primaryColor, secondaryColor, language } = body

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

    if (language && !isValidLanguage(language)) {
      return NextResponse.json(
        { error: `Invalid language. Must be one of: ${SUPPORTED_LANGUAGES.join(', ')}` },
        { status: 400 }
      )
    }

    const updateSettings: { primaryColor?: string; secondaryColor?: string; language?: string } = {}
    if (primaryColor) updateSettings.primaryColor = primaryColor
    if (secondaryColor) updateSettings.secondaryColor = secondaryColor
    if (language) updateSettings.language = language

    const updatedSettings = await settingsStorage.createOrUpdate(
      storeId,
      updateSettings
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

