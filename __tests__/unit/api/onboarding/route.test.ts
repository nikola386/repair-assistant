import { GET, POST } from '@/app/api/onboarding/route'
import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth.middleware'
import { userStorage } from '@/lib/userStorage'
import { db } from '@/lib/db'
import { uploadFile, deleteFile } from '@/lib/storage'
import { validateFileContent, validateFileType, validateFileSize } from '@/lib/fileValidation'
import { generateUniqueFileName, compressAndConvertToJpg } from '@/lib/fileUtils'
import { validateHexColor } from '@/lib/colorValidation'
import { isValidLanguage } from '@/lib/languages'
import { createMockNextRequest, createMockSession, createMockUser, createMockStore } from '../../../utils/test-helpers'

jest.mock('@/lib/auth.middleware')
jest.mock('@/lib/userStorage')
jest.mock('@/lib/db', () => ({
  db: {
    store: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    settings: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  },
}))
jest.mock('@/lib/storage')
jest.mock('@/lib/fileValidation')
jest.mock('@/lib/fileUtils')
jest.mock('@/lib/colorValidation')
jest.mock('@/lib/languages')

const mockWithAuth = withAuth as jest.MockedFunction<typeof withAuth>
const mockUserStorage = userStorage as jest.Mocked<typeof userStorage>
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

describe('/api/onboarding', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should return onboarding status when complete', async () => {
      const mockSession = createMockSession()
      const mockUser = createMockUser()
      const mockStore = createMockStore({ onboarded: true })
      const mockSettings = { language: 'en', primaryColor: '#000000' }

      mockWithAuth.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })
      mockUserStorage.getStoreId.mockResolvedValue(mockUser.storeId)
      mockDb.store.findUnique.mockResolvedValue(mockStore as any)
      mockDb.settings.findUnique.mockResolvedValue(mockSettings as any)

      const request = createMockNextRequest()
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.isComplete).toBe(true)
      expect(data.store).toEqual(mockStore)
    })

    it('should return onboarding status when incomplete', async () => {
      const mockSession = createMockSession()
      const mockUser = createMockUser()
      const mockStore = createMockStore({ onboarded: false })

      mockWithAuth.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })
      mockUserStorage.getStoreId.mockResolvedValue(mockUser.storeId)
      mockDb.store.findUnique.mockResolvedValue(mockStore as any)
      mockDb.settings.findUnique.mockResolvedValue(null)

      const request = createMockNextRequest()
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.isComplete).toBe(false)
    })

    it('should return isComplete false when store not found', async () => {
      const mockSession = createMockSession()

      mockWithAuth.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })
      mockUserStorage.getStoreId.mockResolvedValue(null)

      const request = createMockNextRequest()
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.isComplete).toBe(false)
    })

    it('should return 401 when not authenticated', async () => {
      mockWithAuth.mockResolvedValue({
        session: null,
        response: { status: 401 } as any,
      })

      const request = createMockNextRequest()
      const response = await GET(request)

      expect(response.status).toBe(401)
    })
  })

  describe('POST', () => {
    it('should complete onboarding successfully', async () => {
      const mockSession = createMockSession()
      const mockUser = createMockUser()
      const mockStore = createMockStore({ onboarded: false })
      const updatedStore = createMockStore({ onboarded: true })
      const mockSettings = { language: 'en', primaryColor: '#000000' }

      mockWithAuth.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })
      mockUserStorage.getStoreId.mockResolvedValue(mockUser.storeId)
      mockDb.store.findUnique.mockResolvedValue(mockStore as any)
      mockDb.store.update.mockResolvedValue(updatedStore as any)
      mockDb.settings.upsert.mockResolvedValue(mockSettings as any)
      mockValidateHexColor.mockReturnValue(null)
      mockIsValidLanguage.mockReturnValue(true)

      const formData = new FormData()
      formData.append('storeName', 'Test Store')
      formData.append('country', 'US')
      formData.append('currency', 'USD')

      const request = createMockNextRequest({
        method: 'POST',
        formData: jest.fn().mockResolvedValue(formData),
      }) as any

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Onboarding completed successfully')
      expect(data.store.onboarded).toBe(true)
    })

    it('should return 400 when store name is missing', async () => {
      const mockSession = createMockSession()
      const mockUser = createMockUser()

      mockWithAuth.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })
      mockUserStorage.getStoreId.mockResolvedValue(mockUser.storeId)

      const formData = new FormData()
      formData.append('country', 'US')

      const request = createMockNextRequest({
        method: 'POST',
        formData: jest.fn().mockResolvedValue(formData),
      }) as any

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Store name is required')
    })

    it('should return 400 when country is missing', async () => {
      const mockSession = createMockSession()
      const mockUser = createMockUser()

      mockWithAuth.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })
      mockUserStorage.getStoreId.mockResolvedValue(mockUser.storeId)

      const formData = new FormData()
      formData.append('storeName', 'Test Store')

      const request = createMockNextRequest({
        method: 'POST',
        formData: jest.fn().mockResolvedValue(formData),
      }) as any

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Country is required')
    })

    it('should return 400 when primary color is invalid', async () => {
      const mockSession = createMockSession()
      const mockUser = createMockUser()

      mockWithAuth.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })
      mockUserStorage.getStoreId.mockResolvedValue(mockUser.storeId)
      mockValidateHexColor.mockReturnValue('Invalid color format')

      const formData = new FormData()
      formData.append('storeName', 'Test Store')
      formData.append('country', 'US')
      formData.append('primaryColor', 'invalid-color')

      const request = createMockNextRequest({
        method: 'POST',
        formData: jest.fn().mockResolvedValue(formData),
      }) as any

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid color format')
    })

    it('should return 400 when language is invalid', async () => {
      const mockSession = createMockSession()
      const mockUser = createMockUser()

      mockWithAuth.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })
      mockUserStorage.getStoreId.mockResolvedValue(mockUser.storeId)
      mockValidateHexColor.mockReturnValue(null)
      mockIsValidLanguage.mockReturnValue(false)

      const formData = new FormData()
      formData.append('storeName', 'Test Store')
      formData.append('country', 'US')
      formData.append('language', 'invalid-lang')

      const request = createMockNextRequest({
        method: 'POST',
        formData: jest.fn().mockResolvedValue(formData),
      }) as any

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid language')
    })

    it('should return 401 when not authenticated', async () => {
      mockWithAuth.mockResolvedValue({
        session: null,
        response: { status: 401 } as any,
      })

      const request = createMockNextRequest({ method: 'POST' })
      const response = await POST(request)

      expect(response.status).toBe(401)
    })
  })
})

