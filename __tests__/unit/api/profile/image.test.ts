import { POST, DELETE } from '@/app/api/profile/image/route'
import { NextRequest } from 'next/server'
import { userStorage } from '@/lib/userStorage'
import { uploadFile, deleteFile } from '@/lib/storage'
import { withAuth } from '@/lib/auth.middleware'
import { validateFileContent, validateFileType, validateFileSize } from '@/lib/fileValidation'
import { generateUniqueFileName, compressAndConvertToJpg } from '@/lib/fileUtils'
import { createMockNextRequest, createMockSession, createMockUser } from '../../../utils/test-helpers'

jest.mock('@/lib/userStorage')
jest.mock('@/lib/storage')
jest.mock('@/lib/auth.middleware')
jest.mock('@/lib/fileValidation')
jest.mock('@/lib/fileUtils')

const mockUserStorage = userStorage as jest.Mocked<typeof userStorage>
const mockUploadFile = uploadFile as jest.MockedFunction<typeof uploadFile>
const mockDeleteFile = deleteFile as jest.MockedFunction<typeof deleteFile>
const mockWithAuth = withAuth as jest.MockedFunction<typeof withAuth>
const mockValidateFileType = validateFileType as jest.MockedFunction<typeof validateFileType>
const mockValidateFileSize = validateFileSize as jest.MockedFunction<typeof validateFileSize>
const mockValidateFileContent = validateFileContent as jest.MockedFunction<typeof validateFileContent>
const mockGenerateUniqueFileName = generateUniqueFileName as jest.MockedFunction<typeof generateUniqueFileName>
const mockCompressAndConvertToJpg = compressAndConvertToJpg as jest.MockedFunction<typeof compressAndConvertToJpg>

describe('/api/profile/image', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST', () => {
    it('should upload profile image successfully', async () => {
      const mockSession = createMockSession()
      const mockUser = createMockUser({ profileImage: null })
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const mockProcessedFile = new File(['processed'], 'test.jpg', { type: 'image/jpeg' })
      const updatedUser = createMockUser({ profileImage: 'https://example.com/image.jpg' })

      mockWithAuth.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })
      mockUserStorage.findById.mockResolvedValue(mockUser as any)
      mockUserStorage.getStoreId.mockResolvedValue(mockUser.storeId)
      mockValidateFileType.mockReturnValue(true)
      mockValidateFileSize.mockReturnValue(true)
      mockValidateFileContent.mockResolvedValue(true)
      mockCompressAndConvertToJpg.mockResolvedValue(mockProcessedFile)
      mockGenerateUniqueFileName.mockReturnValue('unique-filename.jpg')
      mockUploadFile.mockResolvedValue('https://example.com/image.jpg')
      mockUserStorage.updateProfileImage.mockResolvedValue(updatedUser as any)

      const formData = new FormData()
      formData.append('file', mockFile)

      const request = createMockNextRequest({
        method: 'POST',
        formData: jest.fn().mockResolvedValue(formData),
      }) as any

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.user.profileImage).toBe('https://example.com/image.jpg')
      expect(data.message).toBe('Profile image uploaded successfully')
    })

    it('should delete old image when uploading new one', async () => {
      const mockSession = createMockSession()
      const mockUser = createMockUser({ profileImage: 'https://example.com/old.jpg' })
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const mockProcessedFile = new File(['processed'], 'test.jpg', { type: 'image/jpeg' })
      const updatedUser = createMockUser({ profileImage: 'https://example.com/new.jpg' })

      mockWithAuth.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })
      mockUserStorage.findById.mockResolvedValue(mockUser as any)
      mockUserStorage.getStoreId.mockResolvedValue(mockUser.storeId)
      mockValidateFileType.mockReturnValue(true)
      mockValidateFileSize.mockReturnValue(true)
      mockValidateFileContent.mockResolvedValue(true)
      mockCompressAndConvertToJpg.mockResolvedValue(mockProcessedFile)
      mockGenerateUniqueFileName.mockReturnValue('unique-filename.jpg')
      mockUploadFile.mockResolvedValue('https://example.com/new.jpg')
      mockUserStorage.updateProfileImage.mockResolvedValue(updatedUser as any)

      const formData = new FormData()
      formData.append('file', mockFile)

      const request = createMockNextRequest({
        method: 'POST',
        formData: jest.fn().mockResolvedValue(formData),
      }) as any

      await POST(request)

      expect(mockDeleteFile).toHaveBeenCalledWith('https://example.com/old.jpg')
    })

    it('should return 400 when file is missing', async () => {
      const mockSession = createMockSession()

      mockWithAuth.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })

      const formData = new FormData()
      const request = createMockNextRequest({
        method: 'POST',
        formData: jest.fn().mockResolvedValue(formData),
      }) as any

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('No file provided')
    })

    it('should return 400 when file type is invalid', async () => {
      const mockSession = createMockSession()
      const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' })

      mockWithAuth.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })
      mockValidateFileType.mockReturnValue(false)

      const formData = new FormData()
      formData.append('file', mockFile)

      const request = createMockNextRequest({
        method: 'POST',
        formData: jest.fn().mockResolvedValue(formData),
      }) as any

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid file type')
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

  describe('DELETE', () => {
    it('should delete profile image successfully', async () => {
      const mockSession = createMockSession()
      const mockUser = createMockUser({ profileImage: 'https://example.com/image.jpg' })
      const updatedUser = createMockUser({ profileImage: null })

      mockWithAuth.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })
      mockUserStorage.findById.mockResolvedValue(mockUser as any)
      mockDeleteFile.mockResolvedValue(undefined)
      mockUserStorage.updateProfileImage.mockResolvedValue(updatedUser as any)

      const request = createMockNextRequest({ method: 'DELETE' })
      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.user.profileImage).toBeNull()
      expect(data.message).toBe('Profile image deleted successfully')
      expect(mockDeleteFile).toHaveBeenCalledWith('https://example.com/image.jpg')
    })

    it('should handle deletion when no image exists', async () => {
      const mockSession = createMockSession()
      const mockUser = createMockUser({ profileImage: null })
      const updatedUser = createMockUser({ profileImage: null })

      mockWithAuth.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })
      mockUserStorage.findById.mockResolvedValue(mockUser as any)
      mockUserStorage.updateProfileImage.mockResolvedValue(updatedUser as any)

      const request = createMockNextRequest({ method: 'DELETE' })
      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Profile image deleted successfully')
      expect(mockDeleteFile).not.toHaveBeenCalled()
    })

    it('should return 401 when not authenticated', async () => {
      mockWithAuth.mockResolvedValue({
        session: null,
        response: { status: 401 } as any,
      })

      const request = createMockNextRequest({ method: 'DELETE' })
      const response = await DELETE(request)

      expect(response.status).toBe(401)
    })
  })
})

