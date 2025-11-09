import { POST, DELETE } from '@/app/api/tickets/images/route'
import { NextRequest } from 'next/server'
import { ticketStorage } from '@/lib/ticketStorage'
import { userStorage } from '@/lib/userStorage'
import { requireAuthAndPermission } from '@/lib/api-middleware'
import { Permission } from '@/lib/permissions'
import { uploadFile } from '@/lib/storage'
import { validateFileContent, validateFileType, validateFileSize } from '@/lib/fileValidation'
import { generateUniqueFileName, compressAndConvertToJpg } from '@/lib/fileUtils'
import { createMockNextRequest, createMockSession, createMockUser, createMockTicket } from '../../../../utils/test-helpers'

jest.mock('@/lib/ticketStorage')
jest.mock('@/lib/userStorage')
jest.mock('@/lib/api-middleware')
jest.mock('@/lib/storage')
jest.mock('@/lib/fileValidation')
jest.mock('@/lib/fileUtils')

const mockTicketStorage = ticketStorage as jest.Mocked<typeof ticketStorage>
const mockUserStorage = userStorage as jest.Mocked<typeof userStorage>
const mockRequireAuthAndPermission = requireAuthAndPermission as jest.MockedFunction<typeof requireAuthAndPermission>
const mockUploadFile = uploadFile as jest.MockedFunction<typeof uploadFile>
const mockValidateFileType = validateFileType as jest.MockedFunction<typeof validateFileType>
const mockValidateFileSize = validateFileSize as jest.MockedFunction<typeof validateFileSize>
const mockValidateFileContent = validateFileContent as jest.MockedFunction<typeof validateFileContent>
const mockGenerateUniqueFileName = generateUniqueFileName as jest.MockedFunction<typeof generateUniqueFileName>
const mockCompressAndConvertToJpg = compressAndConvertToJpg as jest.MockedFunction<typeof compressAndConvertToJpg>

describe('/api/tickets/images', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST', () => {
    it('should upload image successfully', async () => {
      const mockSession = createMockSession()
      const mockUser = createMockUser()
      const mockTicket = createMockTicket()
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const mockProcessedFile = new File(['processed'], 'test.jpg', { type: 'image/jpeg' })
      const mockImage = {
        id: 'image-1',
        ticketId: mockTicket.id,
        fileName: 'test.jpg',
        fileUrl: 'https://example.com/image.jpg',
        fileSize: 1000,
        mimeType: 'image/jpeg',
      }

      mockRequireAuthAndPermission.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })
      mockUserStorage.getStoreId.mockResolvedValue(mockUser.storeId)
      mockTicketStorage.getById.mockResolvedValue(mockTicket as any)
      mockValidateFileType.mockReturnValue(true)
      mockValidateFileSize.mockReturnValue(true)
      mockValidateFileContent.mockResolvedValue(true)
      mockCompressAndConvertToJpg.mockResolvedValue(mockProcessedFile)
      mockGenerateUniqueFileName.mockReturnValue('unique-filename.jpg')
      mockUploadFile.mockResolvedValue('https://example.com/image.jpg')
      mockTicketStorage.createImage.mockResolvedValue(mockImage as any)

      const formData = new FormData()
      formData.append('ticketId', mockTicket.id)
      formData.append('file', mockFile)

      const request = createMockNextRequest({
        method: 'POST',
        formData: jest.fn().mockResolvedValue(formData),
      }) as any

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.image).toEqual(mockImage)
      expect(data.message).toBe('Image uploaded successfully')
    })

    it('should return 400 when ticketId is missing', async () => {
      const mockSession = createMockSession()
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

      mockRequireAuthAndPermission.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })

      const formData = new FormData()
      formData.append('file', mockFile)

      const request = createMockNextRequest({
        method: 'POST',
        formData: jest.fn().mockResolvedValue(formData),
      }) as any

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Missing ticketId or file')
    })

    it('should return 400 when file is missing', async () => {
      const mockSession = createMockSession()

      mockRequireAuthAndPermission.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })

      const formData = new FormData()
      formData.append('ticketId', 'ticket-1')

      const request = createMockNextRequest({
        method: 'POST',
        formData: jest.fn().mockResolvedValue(formData),
      }) as any

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Missing ticketId or file')
    })

    it('should return 400 when file type is invalid', async () => {
      const mockSession = createMockSession()
      const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' })

      mockRequireAuthAndPermission.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })
      mockValidateFileType.mockReturnValue(false)

      const formData = new FormData()
      formData.append('ticketId', 'ticket-1')
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

    it('should return 400 when file size is too large', async () => {
      const mockSession = createMockSession()
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

      mockRequireAuthAndPermission.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })
      mockValidateFileType.mockReturnValue(true)
      mockValidateFileSize.mockReturnValue(false)

      const formData = new FormData()
      formData.append('ticketId', 'ticket-1')
      formData.append('file', mockFile)

      const request = createMockNextRequest({
        method: 'POST',
        formData: jest.fn().mockResolvedValue(formData),
      }) as any

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('File size too large')
    })

    it('should return 404 when ticket not found', async () => {
      const mockSession = createMockSession()
      const mockUser = createMockUser()
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

      mockRequireAuthAndPermission.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })
      mockUserStorage.getStoreId.mockResolvedValue(mockUser.storeId)
      mockTicketStorage.getById.mockResolvedValue(null)
      mockValidateFileType.mockReturnValue(true)
      mockValidateFileSize.mockReturnValue(true)
      mockValidateFileContent.mockResolvedValue(true)

      const formData = new FormData()
      formData.append('ticketId', 'ticket-1')
      formData.append('file', mockFile)

      const request = createMockNextRequest({
        method: 'POST',
        formData: jest.fn().mockResolvedValue(formData),
      }) as any

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Ticket not found')
    })

    it('should return 401 when not authenticated', async () => {
      mockRequireAuthAndPermission.mockResolvedValue({
        session: null,
        response: { status: 401 } as any,
      })

      const request = createMockNextRequest({ method: 'POST' })
      const response = await POST(request)

      expect(response.status).toBe(401)
    })
  })

  describe('DELETE', () => {
    it('should delete image successfully', async () => {
      const mockSession = createMockSession()
      const mockUser = createMockUser()
      const mockTicket = createMockTicket()
      const mockImage = {
        id: 'image-1',
        ticketId: mockTicket.id,
        fileName: 'test.jpg',
        fileUrl: 'https://example.com/image.jpg',
      }

      mockRequireAuthAndPermission.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })
      mockUserStorage.getStoreId.mockResolvedValue(mockUser.storeId)
      mockTicketStorage.getImageById.mockResolvedValue(mockImage as any)
      mockTicketStorage.getById.mockResolvedValue(mockTicket as any)
      mockTicketStorage.deleteImage.mockResolvedValue(true)

      const url = new URL('http://localhost:3001/api/tickets/images')
      url.searchParams.set('imageId', 'image-1')
      const request = createMockNextRequest({
        method: 'DELETE',
        url: url.toString(),
        nextUrl: url,
      })
      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Image deleted successfully')
      expect(mockTicketStorage.deleteImage).toHaveBeenCalledWith('image-1')
    })

    it('should return 400 when imageId is missing', async () => {
      const mockSession = createMockSession()

      mockRequireAuthAndPermission.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })

      const request = createMockNextRequest({ method: 'DELETE' })
      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Missing imageId')
    })

    it('should return 404 when image not found', async () => {
      const mockSession = createMockSession()
      const mockUser = createMockUser()

      mockRequireAuthAndPermission.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })
      mockUserStorage.getStoreId.mockResolvedValue(mockUser.storeId)
      mockTicketStorage.getImageById.mockResolvedValue(null)

      const url = new URL('http://localhost:3001/api/tickets/images')
      url.searchParams.set('imageId', 'image-1')
      const request = createMockNextRequest({
        method: 'DELETE',
        url: url.toString(),
        nextUrl: url,
      })
      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Image not found')
    })

    it('should return 403 when image does not belong to user store', async () => {
      const mockSession = createMockSession()
      const mockUser = createMockUser()
      const mockImage = {
        id: 'image-1',
        ticketId: 'ticket-1',
        fileName: 'test.jpg',
        fileUrl: 'https://example.com/image.jpg',
      }

      mockRequireAuthAndPermission.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })
      mockUserStorage.getStoreId.mockResolvedValue(mockUser.storeId)
      mockTicketStorage.getImageById.mockResolvedValue(mockImage as any)
      mockTicketStorage.getById.mockResolvedValue(null)

      const url = new URL('http://localhost:3001/api/tickets/images')
      url.searchParams.set('imageId', 'image-1')
      const request = createMockNextRequest({
        method: 'DELETE',
        url: url.toString(),
        nextUrl: url,
      })
      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toContain('Unauthorized')
    })

    it('should return 401 when not authenticated', async () => {
      mockRequireAuthAndPermission.mockResolvedValue({
        session: null,
        response: { status: 401 } as any,
      })

      const request = createMockNextRequest({ method: 'DELETE' })
      const response = await DELETE(request)

      expect(response.status).toBe(401)
    })
  })
})

