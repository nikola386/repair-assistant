import { NextRequest, NextResponse } from 'next/server'
import { settingsStorage } from '@/lib/settingsStorage'
import { userStorage } from '@/lib/userStorage'
import { requireAuthAndPermission } from '@/lib/api-middleware'
import { Permission } from '@/lib/permissions'
import { db } from '@/lib/db'
import { uploadFile, deleteFile } from '@/lib/storage'
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
  compressAndConvertToJpg,
} from '@/lib/fileUtils'
import { validateHexColor } from '@/lib/colorValidation'
import { DEFAULT_PRIMARY_COLOR, DEFAULT_SECONDARY_COLOR } from '@/lib/constants'
import { Decimal } from '@prisma/client/runtime/library'

export async function GET(request: NextRequest) {
  const { session, response } = await requireAuthAndPermission(request, Permission.VIEW_SETTINGS)
  if (response) return response

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
    }) as any

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
        primaryColor: DEFAULT_PRIMARY_COLOR,
        secondaryColor: DEFAULT_SECONDARY_COLOR,
        language: 'en',
        defaultWarrantyPeriodDays: 30,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    }

    // Convert taxRate from Decimal to number if it exists
    const storeWithTaxRate = {
      ...store,
      taxRate: store.taxRate instanceof Decimal ? store.taxRate.toNumber() : store.taxRate ?? null,
    }

    return NextResponse.json({ store: storeWithTaxRate, settings }, { status: 200 })
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  const { session, response } = await requireAuthAndPermission(request, Permission.EDIT_SETTINGS)
  if (response) return response

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
      const taxEnabled = formData.get('taxEnabled') === 'true'
      const taxRate = formData.get('taxRate') as string | null
      const taxInclusive = formData.get('taxInclusive') === 'true'
      const logoFile = formData.get('logo') as File | null
      const removeLogo = formData.get('removeLogo') === 'true'
      
      // Settings fields
      const primaryColor = formData.get('primaryColor') as string | null
      const secondaryColor = formData.get('secondaryColor') as string | null
      const language = formData.get('language') as string | null
      const defaultWarrantyPeriodDays = formData.get('defaultWarrantyPeriodDays') as string | null

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
            await deleteFile(existingStore.logo)
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
        if (existingStore.logo) {
          try {
            await deleteFile(existingStore.logo)
          } catch (error) {
            console.error('Error deleting old logo:', error)
            // Continue even if deletion fails
          }
        }

        // Compress and convert image to JPG
        const processedFile = await compressAndConvertToJpg(logoFile)

        // Generate unique filename using secure random (use processed file name for correct extension)
        let fileName: string
        try {
          fileName = generateUniqueFileName('stores', storeId, processedFile.name, ALLOWED_IMAGE_EXTENSIONS, storeId)
        } catch (error) {
          return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Invalid file extension' },
            { status: 400 }
          )
        }

        // Upload file to storage (blob or local)
        logoUrl = await uploadFile(fileName, processedFile, {
          access: 'public',
          contentType: processedFile.type,
        })
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
      storeUpdateData.taxEnabled = taxEnabled
      if (taxRate !== null && taxRate.trim() !== '') {
        const taxRateNum = parseFloat(taxRate.trim())
        if (!isNaN(taxRateNum) && taxRateNum >= 0 && taxRateNum <= 100) {
          storeUpdateData.taxRate = taxRateNum
        } else {
          storeUpdateData.taxRate = null
        }
      } else {
        storeUpdateData.taxRate = null
      }
      storeUpdateData.taxInclusive = taxInclusive
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
      const updateSettings: { primaryColor?: string; secondaryColor?: string; language?: string; defaultWarrantyPeriodDays?: number } = {}
      
      if (primaryColor || secondaryColor || language || defaultWarrantyPeriodDays !== null) {
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

        if (language && !isValidLanguage(language)) {
          return NextResponse.json(
            { error: `Invalid language. Must be one of: ${SUPPORTED_LANGUAGES.join(', ')}` },
            { status: 400 }
          )
        }

        if (defaultWarrantyPeriodDays !== null && defaultWarrantyPeriodDays.trim() !== '') {
          const warrantyDays = parseInt(defaultWarrantyPeriodDays.trim())
          if (!isNaN(warrantyDays) && warrantyDays > 0) {
            updateSettings.defaultWarrantyPeriodDays = warrantyDays
          }
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
    const { primaryColor, secondaryColor, language, defaultWarrantyPeriodDays } = body

    // Validate color format
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

    if (language && !isValidLanguage(language)) {
      return NextResponse.json(
        { error: `Invalid language. Must be one of: ${SUPPORTED_LANGUAGES.join(', ')}` },
        { status: 400 }
      )
    }

    const updateSettings: { primaryColor?: string; secondaryColor?: string; language?: string; defaultWarrantyPeriodDays?: number } = {}
    if (primaryColor) updateSettings.primaryColor = primaryColor
    if (secondaryColor) updateSettings.secondaryColor = secondaryColor
    if (language) updateSettings.language = language
    if (defaultWarrantyPeriodDays !== undefined && defaultWarrantyPeriodDays !== null) {
      const warrantyDays = typeof defaultWarrantyPeriodDays === 'number' ? defaultWarrantyPeriodDays : parseInt(defaultWarrantyPeriodDays)
      if (!isNaN(warrantyDays) && warrantyDays > 0) {
        updateSettings.defaultWarrantyPeriodDays = warrantyDays
      }
    }

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

