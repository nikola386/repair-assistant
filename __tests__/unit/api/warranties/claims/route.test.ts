import { GET, POST } from '@/app/api/warranties/claims/route'
import { NextRequest } from 'next/server'
import { warrantyStorage } from '@/lib/warrantyStorage'
import { userStorage } from '@/lib/userStorage'
import { requireAuthAndPermission } from '@/lib/api-middleware'
import { Permission } from '@/lib/permissions'
import { createMockNextRequest, createMockSession, createMockUser } from '../../../../utils/test-helpers'

jest.mock('@/lib/warrantyStorage')
jest.mock('@/lib/userStorage')
jest.mock('@/lib/api-middleware')
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
  generateRequestId: jest.fn(() => 'test-request-id'),
}))

const mockWarrantyStorage = warrantyStorage as jest.Mocked<typeof warrantyStorage>
const mockUserStorage = userStorage as jest.Mocked<typeof userStorage>
const mockRequireAuthAndPermission = requireAuthAndPermission as jest.MockedFunction<typeof requireAuthAndPermission>

describe('/api/warranties/claims', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should return all warranty claims successfully', async () => {
      const mockSession = createMockSession()
      const mockUser = createMockUser()
      const mockClaims = [
        { id: 'claim-1', warrantyId: 'warranty-1', status: 'pending' },
        { id: 'claim-2', warrantyId: 'warranty-2', status: 'approved' },
      ]

      mockRequireAuthAndPermission.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })
      mockUserStorage.findById.mockResolvedValue(mockUser as any)
      mockWarrantyStorage.getAllClaims.mockResolvedValue(mockClaims as any)

      const request = createMockNextRequest()
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.claims).toEqual(mockClaims)
      expect(mockWarrantyStorage.getAllClaims).toHaveBeenCalledWith(mockUser.storeId, undefined)
    })

    it('should filter claims by status', async () => {
      const mockSession = createMockSession()
      const mockUser = createMockUser()
      const mockClaims = [{ id: 'claim-1', warrantyId: 'warranty-1', status: 'pending' }]

      mockRequireAuthAndPermission.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })
      mockUserStorage.findById.mockResolvedValue(mockUser as any)
      mockWarrantyStorage.getAllClaims.mockResolvedValue(mockClaims as any)

      const url = new URL('http://localhost:3001/api/warranties/claims')
      url.searchParams.set('status', 'pending')
      const request = createMockNextRequest({ url: url.toString(), nextUrl: url })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.claims).toEqual(mockClaims)
      expect(mockWarrantyStorage.getAllClaims).toHaveBeenCalledWith(mockUser.storeId, 'pending')
    })

    it('should return 404 when user store not found', async () => {
      const mockSession = createMockSession()

      mockRequireAuthAndPermission.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })
      mockUserStorage.findById.mockResolvedValue(null)

      const request = createMockNextRequest()
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('User store not found')
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

    it('should return 500 when an error occurs', async () => {
      const mockSession = createMockSession()
      const mockUser = createMockUser()

      mockRequireAuthAndPermission.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })
      mockUserStorage.findById.mockResolvedValue(mockUser as any)
      mockWarrantyStorage.getAllClaims.mockRejectedValue(new Error('Database error'))

      const request = createMockNextRequest()
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })

  describe('POST', () => {
    it('should create warranty claim successfully', async () => {
      const mockSession = createMockSession()
      const mockUser = createMockUser()
      const mockClaim = {
        id: 'claim-1',
        warrantyId: 'warranty-1',
        issueDescription: 'Screen cracked',
        status: 'pending',
      }

      mockRequireAuthAndPermission.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })
      mockUserStorage.findById.mockResolvedValue(mockUser as any)
      mockWarrantyStorage.createClaim.mockResolvedValue(mockClaim as any)

      const request = createMockNextRequest({
        method: 'POST',
        json: jest.fn().mockResolvedValue({
          warrantyId: 'warranty-1',
          issueDescription: 'Screen cracked',
        }),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.claim).toEqual(mockClaim)
      expect(data.message).toBe('Warranty claim created successfully')
    })

    it('should return 400 when warrantyId is missing', async () => {
      const mockSession = createMockSession()
      const mockUser = createMockUser()

      mockRequireAuthAndPermission.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })
      mockUserStorage.findById.mockResolvedValue(mockUser as any)

      const request = createMockNextRequest({
        method: 'POST',
        json: jest.fn().mockResolvedValue({
          issueDescription: 'Screen cracked',
        }),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Missing required fields')
    })

    it('should return 400 when issueDescription is missing', async () => {
      const mockSession = createMockSession()
      const mockUser = createMockUser()

      mockRequireAuthAndPermission.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })
      mockUserStorage.findById.mockResolvedValue(mockUser as any)

      const request = createMockNextRequest({
        method: 'POST',
        json: jest.fn().mockResolvedValue({
          warrantyId: 'warranty-1',
        }),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Missing required fields')
    })

    it('should return 404 when warranty not found', async () => {
      const mockSession = createMockSession()
      const mockUser = createMockUser()

      mockRequireAuthAndPermission.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })
      mockUserStorage.findById.mockResolvedValue(mockUser as any)
      mockWarrantyStorage.createClaim.mockRejectedValue(new Error('Warranty not found'))

      const request = createMockNextRequest({
        method: 'POST',
        json: jest.fn().mockResolvedValue({
          warrantyId: 'warranty-1',
          issueDescription: 'Screen cracked',
        }),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Warranty not found')
    })

    it('should return 500 when an error occurs', async () => {
      const mockSession = createMockSession()
      const mockUser = createMockUser()

      mockRequireAuthAndPermission.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })
      mockUserStorage.findById.mockResolvedValue(mockUser as any)
      mockWarrantyStorage.createClaim.mockRejectedValue(new Error('Database error'))

      const request = createMockNextRequest({
        method: 'POST',
        json: jest.fn().mockResolvedValue({
          warrantyId: 'warranty-1',
          issueDescription: 'Screen cracked',
        }),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Database error')
    })
  })
})

