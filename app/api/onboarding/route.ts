import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth.middleware'
import { userStorage } from '@/lib/userStorage'
import { db } from '@/lib/db'
import { put, del } from '@vercel/blob'
import { isValidLanguage, SUPPORTED_LANGUAGES } from '@/lib/languages'
import {
  validateFileContent,
  validateFileType,
  validateFileSize,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_IMAGE_EXTENSIONS,
  MAX_FILE_SIZE,
} from '@/lib/fileValidation'
import {
  generateUniqueFileName,
} from '@/lib/fileUtils'
import { validateHexColor } from '@/lib/colorValidation'
import { DEFAULT_PRIMARY_COLOR, DEFAULT_SECONDARY_COLOR } from '@/lib/constants'

export async function POST(request: NextRequest) {
  const authResult = await withAuth(request, { action: 'onboarding setup' })
  if (authResult.response) {
    return authResult.response
  }
  const session = authResult.session

  try {
    const formData = await request.formData()
    const storeName = formData.get('storeName') as string
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
    const primaryColor = formData.get('primaryColor') as string | null
    const secondaryColor = formData.get('secondaryColor') as string | null
    const language = formData.get('language') as string | null

    // Validate required fields
    if (!storeName || storeName.trim().length === 0) {
      return NextResponse.json(
        { error: 'Store name is required' },
        { status: 400 }
      )
    }

    // Validate colors if provided
    if (primaryColor) {
      const colorError = validateHexColor(primaryColor, 'Primary color')
      if (colorError) {
        return NextResponse.json(
          { error: colorError },
          { status: 400 }
        )
      }
    }
    if (secondaryColor) {
      const colorError = validateHexColor(secondaryColor, 'Secondary color')
      if (colorError) {
        return NextResponse.json(
          { error: colorError },
          { status: 400 }
        )
      }
    }
    
    // Validate language if provided
    if (language && !isValidLanguage(language)) {
      return NextResponse.json(
        { error: `Invalid language. Must be one of: ${SUPPORTED_LANGUAGES.join(', ')}` },
        { status: 400 }
      )
    }

    // Get user's store ID
    const storeId = await userStorage.getStoreId(session.user.id)
    if (!storeId) {
      return NextResponse.json(
        { error: 'User store not found' },
        { status: 404 }
      )
    }

    // Get existing store to check for old logo
    const existingStore = await db.store.findUnique({
      where: { id: storeId },
    })

    let logoUrl: string | null = null

    // Handle logo upload if provided
    if (logoFile && logoFile.size > 0) {
      // Validate file type
      if (!validateFileType(logoFile, ALLOWED_IMAGE_TYPES)) {
        return NextResponse.json(
          { error: 'Invalid file type. Only images are allowed.' },
          { status: 400 }
        )
      }

      // Validate file size
      if (!validateFileSize(logoFile, MAX_FILE_SIZE)) {
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
      if (existingStore?.logo) {
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
      let fileName: string
      try {
        fileName = generateUniqueFileName('stores', storeId, logoFile.name, ALLOWED_IMAGE_EXTENSIONS)
      } catch (error) {
        return NextResponse.json(
          { error: error instanceof Error ? error.message : 'Invalid file extension' },
          { status: 400 }
        )
      }

      // Upload file to Vercel Blob
      const blob = await put(fileName, logoFile, {
        access: 'public',
        contentType: logoFile.type,
      })

      logoUrl = blob.url
    } else if (existingStore?.logo) {
      // Keep existing logo if no new one provided
      logoUrl = existingStore.logo
    }

    // Build address string from components if available
    const addressParts = [street, city, state, postalCode, country].filter(Boolean)
    const address = addressParts.length > 0 ? addressParts.join(', ') : null

    // Update store with all information
    const updatedStore = await db.store.update({
      where: { id: storeId },
      data: { 
        name: storeName.trim(),
        address: address,
        street: street?.trim() || null,
        city: city?.trim() || null,
        state: state?.trim() || null,
        postalCode: postalCode?.trim() || null,
        country: country?.trim() || null,
        website: website?.trim() || null,
        phone: phone?.trim() || null,
        currency: currency?.trim() || 'USD',
        vatNumber: vatNumber?.trim() || null,
        logo: logoUrl,
        onboarded: true,
      },
    })

    // Update or create settings with colors and language
    const updatedSettings = await db.settings.upsert({
      where: { storeId },
      create: {
        storeId,
        primaryColor: primaryColor?.trim() || DEFAULT_PRIMARY_COLOR,
        secondaryColor: secondaryColor?.trim() || DEFAULT_SECONDARY_COLOR,
        language: language?.trim() || 'en',
      },
      update: {
        primaryColor: primaryColor?.trim() || DEFAULT_PRIMARY_COLOR,
        secondaryColor: secondaryColor?.trim() || DEFAULT_SECONDARY_COLOR,
        language: language?.trim() || 'en',
      },
    })

    return NextResponse.json(
      { 
        message: 'Onboarding completed successfully',
        store: updatedStore,
        settings: updatedSettings,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Onboarding error:', error)
    return NextResponse.json(
      { error: 'Failed to complete onboarding' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const authResult = await withAuth(request, { action: 'onboarding status' })
  if (authResult.response) {
    return authResult.response
  }
  const session = authResult.session

  try {
    // Get user's store ID
    const storeId = await userStorage.getStoreId(session.user.id)
    if (!storeId) {
      return NextResponse.json(
        { isComplete: false, store: null },
        { status: 200 }
      )
    }

    // Get store info and settings
    const store = await db.store.findUnique({
      where: { id: storeId },
    })

    const settings = await db.settings.findUnique({
      where: { storeId },
    })

    // Check if onboarding is complete: store must be onboarded
    const isComplete = store?.onboarded === true

    return NextResponse.json(
      { 
        isComplete,
        store,
        settings,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Onboarding status error:', error)
    return NextResponse.json(
      { error: 'Failed to check onboarding status' },
      { status: 500 }
    )
  }
}

