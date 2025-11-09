import { GET, PATCH } from '@/app/api/settings/route'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuthAndPermission } from '@/lib/api-middleware'
import { userStorage } from '@/lib/userStorage'
import { settingsStorage } from '@/lib/settingsStorage'
import { db } from '@/lib/db'
import { uploadFile, deleteFile } from '@/lib/storage'
import { validateFileType, validateFileSize, validateFileContent } from '@/lib/fileValidation'
import { generateUniqueFileName, compressAndConvertToJpg } from '@/lib/fileUtils'
import { validateHexColor } from '@/lib/colorValidation'
import { isValidLanguage } from '@/lib/languages'
import { createMockNextRequest, createMockSession, createMockUser, createMockStore } from '../../../utils/test-helpers'

jest.mock('@/lib/api-middleware')
jest.mock('@/lib/userStorage')
jest.mock('@/lib/settingsStorage')
jest.mock('@/lib/db', () => ({
  db: {
    store: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}))
jest.mock('@/lib/storage', () => ({
  uploadFile: jest.fn(),
  deleteFile: jest.fn(),
}))
jest.mock('@/lib/fileValidation', () => ({
  validateFileType: jest.fn(),
  validateFileSize: jest.fn(),
  validateFileContent: jest.fn(),
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png'],
  ALLOWED_IMAGE_EXTENSIONS: ['.jpg', '.jpeg', '.png'],
  MAX_FILE_SIZE: 2 * 1024 * 1024,
}))
jest.mock('@/lib/fileUtils', () => ({
  generateUniqueFileName: jest.fn(),
  compressAndConvertToJpg: jest.fn(),
}))
jest.mock('@/lib/colorValidation', () => ({
  validateHexColor: jest.fn(),
}))
jest.mock('@/lib/languages', () => ({
  isValidLanguage: jest.fn(),
  SUPPORTED_LANGUAGES: ['en', 'bg'],
}))
jest.mock('@/lib/constants', () => ({
  DEFAULT_PRIMARY_COLOR: '#FFD700',
  DEFAULT_SECONDARY_COLOR: '#000000',
}))

const mockRequireAuthAndPermission = requireAuthAndPermission as jest.MockedFunction<typeof requireAuthAndPermission>
const mockUserStorage = userStorage as jest.Mocked<typeof userStorage>
const mockSettingsStorage = settingsStorage as jest.Mocked<typeof settingsStorage>
const mockDb = db as jest.Mocked<typeof db>
const mockUploadFile = uploadFile as jest.MockedFunction<typeof uploadFile>
const mockDeleteFile = deleteFile as jest.MockedFunction<typeof deleteFile>
const mockValidateFileType = validateFileType as jest.MockedFunction<typeof validateFileType>
const mockValidateFileSize = validateFileSize as jest.MockedFunction<typeof validateFileSize>
const mockValidateFileContent = validateFileContent as jest.MockedFunction<typeof validateFileContent>
const mockGenerateUniqueFileName = generateUniqueFileName as jest.MockedFunction<typeof generateUniqueFileName>
const mockCompressAndConvertToJpg = compressAndConvertToJpg as jest.MockedFunction<typeof compressAndConvertToJpg>
const mockValidateHexColor = validateHexColor as jest.MockedFunction<typeof validateHexColor>
const mockIsValidLanguage = isValidLanguage as jest.MockedFunction<typeof isValidLanguage>

describe('/api/settings - GET', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return settings successfully', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()
    const mockStore = createMockStore()
    const mockSettings = {
      id: 'settings-1',
      storeId: mockUser.storeId,
      primaryColor: '#FFD700',
      secondaryColor: '#000000',
      language: 'en',
      defaultWarrantyPeriodDays: 30,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.getStoreId.mockResolvedValue(mockUser.storeId)
    mockDb.store.findUnique.mockResolvedValue(mockStore as any)
    mockSettingsStorage.findByStoreId.mockResolvedValue(mockSettings as any)

    const request = createMockNextRequest()
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.store).toBeDefined()
    expect(data.settings).toBeDefined()
  })

  it('should return default settings when none exist', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()
    const mockStore = createMockStore()

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.getStoreId.mockResolvedValue(mockUser.storeId)
    mockDb.store.findUnique.mockResolvedValue(mockStore as any)
    mockSettingsStorage.findByStoreId.mockResolvedValue(null)

    const request = createMockNextRequest()
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.settings.primaryColor).toBe('#FFD700')
    expect(data.settings.language).toBe('en')
  })

  it('should return 404 when user store not found', async () => {
    const mockSession = createMockSession()

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.getStoreId.mockResolvedValue(null)

    const request = createMockNextRequest()
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('User store not found')
  })

  it('should return 404 when store not found', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.getStoreId.mockResolvedValue(mockUser.storeId)
    mockDb.store.findUnique.mockResolvedValue(null)

    const request = createMockNextRequest()
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Store not found')
  })

  it('should return 500 when an error occurs', async () => {
    const mockSession = createMockSession()

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.getStoreId.mockRejectedValue(new Error('Database error'))

    const request = createMockNextRequest()
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })

  it('should return 401 when not authenticated', async () => {
    mockRequireAuthAndPermission.mockResolvedValue({
      session: null,
      response: { status: 401 } as any,
    })

    const request = createMockNextRequest()
    const response = await GET(request)

    expect(response.status).toBe(401)
  })
})

describe('/api/settings - PATCH', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should update settings successfully', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()
    const mockStore = createMockStore()
    const updateData = {
      primaryColor: '#FF0000',
      secondaryColor: '#00FF00',
      language: 'bg',
    }

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.getStoreId.mockResolvedValue(mockUser.storeId)
    mockDb.store.findUnique.mockResolvedValue(mockStore as any)
    mockValidateHexColor.mockReturnValue(null)
    mockIsValidLanguage.mockReturnValue(true)
    mockSettingsStorage.createOrUpdate.mockResolvedValue({
      id: 'settings-1',
      storeId: mockUser.storeId,
      primaryColor: '#FF0000',
      secondaryColor: '#00FF00',
      language: 'bg',
      defaultWarrantyPeriodDays: 30,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any)

    const request = createMockNextRequest({
      method: 'PATCH',
      json: jest.fn().mockResolvedValue(updateData),
    })
    const response = await PATCH(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toBe('Settings updated successfully')
    expect(mockSettingsStorage.createOrUpdate).toHaveBeenCalled()
  })

  it('should return 400 for invalid color', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.getStoreId.mockResolvedValue(mockUser.storeId)
    mockValidateHexColor.mockReturnValue('Invalid color format')

    const request = createMockNextRequest({
      method: 'PATCH',
      json: jest.fn().mockResolvedValue({
        primaryColor: 'invalid-color',
      }),
    })
    const response = await PATCH(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid color format')
  })

  it('should return 400 for invalid language', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.getStoreId.mockResolvedValue(mockUser.storeId)
    mockIsValidLanguage.mockReturnValue(false)

    const request = createMockNextRequest({
      method: 'PATCH',
      json: jest.fn().mockResolvedValue({
        language: 'invalid-lang',
      }),
    })
    const response = await PATCH(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Invalid language')
  })

  it('should update settings with defaultWarrantyPeriodDays', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()
    const mockStore = createMockStore()

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.getStoreId.mockResolvedValue(mockUser.storeId)
    mockDb.store.findUnique.mockResolvedValue(mockStore as any)
    mockSettingsStorage.createOrUpdate.mockResolvedValue({
      id: 'settings-1',
      storeId: mockUser.storeId,
      primaryColor: '#FFD700',
      secondaryColor: '#000000',
      language: 'en',
      defaultWarrantyPeriodDays: 60,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any)

    const request = createMockNextRequest({
      method: 'PATCH',
      json: jest.fn().mockResolvedValue({
        defaultWarrantyPeriodDays: 60,
      }),
    })
    const response = await PATCH(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(mockSettingsStorage.createOrUpdate).toHaveBeenCalledWith(
      mockUser.storeId,
      expect.objectContaining({ defaultWarrantyPeriodDays: 60 })
    )
  })

  it('should handle form data update with store information', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()
    const mockStore = { ...createMockStore(), logo: null }

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.getStoreId.mockResolvedValue(mockUser.storeId)
    mockDb.store.findUnique.mockResolvedValue(mockStore as any)
    mockDb.store.update.mockResolvedValue({
      ...mockStore,
      name: 'Updated Store',
      street: '456 New St',
    } as any)
    mockSettingsStorage.findByStoreId.mockResolvedValue({
      id: 'settings-1',
      storeId: mockUser.storeId,
      primaryColor: '#FFD700',
      secondaryColor: '#000000',
      language: 'en',
      defaultWarrantyPeriodDays: 30,
    } as any)
    mockValidateHexColor.mockReturnValue(null)
    mockIsValidLanguage.mockReturnValue(true)

    const formData = new FormData()
    formData.append('storeName', 'Updated Store')
    formData.append('street', '456 New St')
    formData.append('city', 'New City')
    formData.append('primaryColor', '#FF0000')

    const request = createMockNextRequest({
      method: 'PATCH',
      headers: new Headers({ 'Content-Type': 'multipart/form-data' }),
      formData: jest.fn().mockResolvedValue(formData),
    })
    const response = await PATCH(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toBe('Settings updated successfully')
    expect(mockDb.store.update).toHaveBeenCalled()
  })

  it('should handle logo removal', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()
    const mockStore = { ...createMockStore(), logo: 'https://example.com/logo.jpg' }

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.getStoreId.mockResolvedValue(mockUser.storeId)
    mockDb.store.findUnique.mockResolvedValue(mockStore as any)
    mockDb.store.update.mockResolvedValue({ ...mockStore, logo: null } as any)
    mockDeleteFile.mockResolvedValue(undefined)
    mockSettingsStorage.findByStoreId.mockResolvedValue({
      id: 'settings-1',
      storeId: mockUser.storeId,
    } as any)

    const formData = new FormData()
    formData.append('removeLogo', 'true')

    const request = createMockNextRequest({
      method: 'PATCH',
      headers: new Headers({ 'Content-Type': 'multipart/form-data' }),
      formData: jest.fn().mockResolvedValue(formData),
    })
    const response = await PATCH(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(mockDeleteFile).toHaveBeenCalledWith('https://example.com/logo.jpg')
    expect(mockDb.store.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: mockUser.storeId }),
        data: expect.objectContaining({ logo: null }),
      })
    )
  })

  it('should handle logo upload', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()
    const mockStore = { ...createMockStore(), logo: null }
    const mockFile = new File(['dummy'], 'logo.jpg', { type: 'image/jpeg' })
    const processedFile = new File(['processed'], 'logo.jpg', { type: 'image/jpeg' })

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.getStoreId.mockResolvedValue(mockUser.storeId)
    mockDb.store.findUnique.mockResolvedValue(mockStore as any)
    mockValidateFileType.mockReturnValue(true)
    mockValidateFileSize.mockReturnValue(true)
    mockValidateFileContent.mockResolvedValue(true)
    mockCompressAndConvertToJpg.mockResolvedValue(processedFile)
    mockGenerateUniqueFileName.mockReturnValue('stores/store123/logo-123.jpg')
    mockUploadFile.mockResolvedValue('https://example.com/logo-123.jpg')
    mockDb.store.update.mockResolvedValue({ ...mockStore, logo: 'https://example.com/logo-123.jpg' } as any)
    mockSettingsStorage.findByStoreId.mockResolvedValue({
      id: 'settings-1',
      storeId: mockUser.storeId,
    } as any)

    const formData = new FormData()
    formData.append('logo', mockFile)

    const request = createMockNextRequest({
      method: 'PATCH',
      headers: new Headers({ 'Content-Type': 'multipart/form-data' }),
      formData: jest.fn().mockResolvedValue(formData),
    })
    const response = await PATCH(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(mockValidateFileType).toHaveBeenCalled()
    expect(mockValidateFileSize).toHaveBeenCalled()
    expect(mockValidateFileContent).toHaveBeenCalled()
    expect(mockCompressAndConvertToJpg).toHaveBeenCalled()
    expect(mockUploadFile).toHaveBeenCalled()
  })

  it('should return 400 for invalid file type', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()
    const mockStore = createMockStore()
    const mockFile = new File(['dummy'], 'document.pdf', { type: 'application/pdf' })

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.getStoreId.mockResolvedValue(mockUser.storeId)
    mockDb.store.findUnique.mockResolvedValue(mockStore as any)
    mockValidateFileType.mockReturnValue(false)

    const formData = new FormData()
    formData.append('logo', mockFile)

    const request = createMockNextRequest({
      method: 'PATCH',
      headers: new Headers({ 'Content-Type': 'multipart/form-data' }),
      formData: jest.fn().mockResolvedValue(formData),
    })
    const response = await PATCH(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid file type. Only images are allowed.')
  })

  it('should return 400 for file too large', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()
    const mockStore = createMockStore()
    const mockFile = new File(['dummy'], 'logo.jpg', { type: 'image/jpeg' })

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.getStoreId.mockResolvedValue(mockUser.storeId)
    mockDb.store.findUnique.mockResolvedValue(mockStore as any)
    mockValidateFileType.mockReturnValue(true)
    mockValidateFileSize.mockReturnValue(false)

    const formData = new FormData()
    formData.append('logo', mockFile)

    const request = createMockNextRequest({
      method: 'PATCH',
      headers: new Headers({ 'Content-Type': 'multipart/form-data' }),
      formData: jest.fn().mockResolvedValue(formData),
    })
    const response = await PATCH(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('File size too large. Maximum size is 2MB.')
  })

  it('should return 400 for invalid file content', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()
    const mockStore = createMockStore()
    const mockFile = new File(['dummy'], 'logo.jpg', { type: 'image/jpeg' })

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.getStoreId.mockResolvedValue(mockUser.storeId)
    mockDb.store.findUnique.mockResolvedValue(mockStore as any)
    mockValidateFileType.mockReturnValue(true)
    mockValidateFileSize.mockReturnValue(true)
    mockValidateFileContent.mockResolvedValue(false)

    const formData = new FormData()
    formData.append('logo', mockFile)

    const request = createMockNextRequest({
      method: 'PATCH',
      headers: new Headers({ 'Content-Type': 'multipart/form-data' }),
      formData: jest.fn().mockResolvedValue(formData),
    })
    const response = await PATCH(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('File content does not match')
  })

  it('should return 404 when store not found during PATCH', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.getStoreId.mockResolvedValue(mockUser.storeId)
    mockDb.store.findUnique.mockResolvedValue(null)

    const formData = new FormData()
    formData.append('storeName', 'Updated Store')

    const request = createMockNextRequest({
      method: 'PATCH',
      headers: new Headers({ 'Content-Type': 'multipart/form-data' }),
      formData: jest.fn().mockResolvedValue(formData),
    })
    const response = await PATCH(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Store not found')
  })

  it('should return 500 when an error occurs during PATCH', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.getStoreId.mockResolvedValue(mockUser.storeId)
    mockDb.store.findUnique.mockRejectedValue(new Error('Database error'))

    const request = createMockNextRequest({
      method: 'PATCH',
      json: jest.fn().mockResolvedValue({ primaryColor: '#FF0000' }),
    })
    const response = await PATCH(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })

  it('should return 401 when not authenticated for PATCH', async () => {
    mockRequireAuthAndPermission.mockResolvedValue({
      session: null,
      response: { status: 401 } as any,
    })

    const request = createMockNextRequest({
      method: 'PATCH',
      json: jest.fn().mockResolvedValue({}),
    })
    const response = await PATCH(request)

    expect(response.status).toBe(401)
  })
})

