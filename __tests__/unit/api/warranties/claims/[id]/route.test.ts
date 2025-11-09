import { GET, PATCH } from '@/app/api/warranties/claims/[id]/route'
import { NextRequest } from 'next/server'
import { warrantyStorage } from '@/lib/warrantyStorage'
import { userStorage } from '@/lib/userStorage'
import { requireAuthAndPermission } from '@/lib/api-middleware'
import { Permission } from '@/lib/permissions'
import { createMockNextRequest, createMockSession, createMockUser } from '../../../../../utils/test-helpers'

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

describe('/api/warranties/claims/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should return warranty claim successfully', async () => {
      const mockSession = createMockSession()
      const mockUser = createMockUser()
      const mockClaim = {
        id: 'claim-1',
        warrantyId: 'warranty-1',
        status: 'pending',
        issueDescription: 'Screen cracked',
      }

      mockRequireAuthAndPermission.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })
      mockUserStorage.findById.mockResolvedValue(mockUser as any)
      mockWarrantyStorage.getClaimById.mockResolvedValue(mockClaim as any)

      const request = createMockNextRequest()
      const response = await GET(request, { params: { id: 'claim-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.claim).toEqual(mockClaim)
      expect(mockWarrantyStorage.getClaimById).toHaveBeenCalledWith('claim-1', mockUser.storeId)
    })

    it('should return 404 when claim not found', async () => {
      const mockSession = createMockSession()
      const mockUser = createMockUser()

      mockRequireAuthAndPermission.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })
      mockUserStorage.findById.mockResolvedValue(mockUser as any)
      mockWarrantyStorage.getClaimById.mockResolvedValue(null)

      const request = createMockNextRequest()
      const response = await GET(request, { params: { id: 'claim-1' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Warranty claim not found')
    })

    it('should return 401 when not authenticated', async () => {
      mockRequireAuthAndPermission.mockResolvedValue({
        session: null,
        response: { status: 401 } as any,
      })

      const request = createMockNextRequest()
      const response = await GET(request, { params: { id: 'claim-1' } })

      expect(response.status).toBe(401)
    })
  })

  describe('PATCH', () => {
    it('should update warranty claim successfully', async () => {
      const mockSession = createMockSession()
      const mockUser = createMockUser()
      const updatedClaim = {
        id: 'claim-1',
        status: 'approved',
        resolutionNotes: 'Approved for replacement',
      }

      mockRequireAuthAndPermission.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })
      mockUserStorage.findById.mockResolvedValue(mockUser as any)
      mockWarrantyStorage.updateClaim.mockResolvedValue(updatedClaim as any)

      const request = createMockNextRequest({
        method: 'PATCH',
        json: jest.fn().mockResolvedValue({
          status: 'approved',
          resolutionNotes: 'Approved for replacement',
        }),
      })
      const response = await PATCH(request, { params: { id: 'claim-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.claim).toEqual(updatedClaim)
      expect(data.message).toBe('Warranty claim updated successfully')
    })

    it('should ignore invalid status values', async () => {
      const mockSession = createMockSession()
      const mockUser = createMockUser()
      const updatedClaim = {
        id: 'claim-1',
        status: 'pending',
      }

      mockRequireAuthAndPermission.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })
      mockUserStorage.findById.mockResolvedValue(mockUser as any)
      mockWarrantyStorage.updateClaim.mockResolvedValue(updatedClaim as any)

      const request = createMockNextRequest({
        method: 'PATCH',
        json: jest.fn().mockResolvedValue({ status: 'invalid-status' }),
      })
      const response = await PATCH(request, { params: { id: 'claim-1' } })

      expect(response.status).toBe(200)
      expect(mockWarrantyStorage.updateClaim).toHaveBeenCalled()
    })

    it('should return 404 when claim not found', async () => {
      const mockSession = createMockSession()
      const mockUser = createMockUser()

      mockRequireAuthAndPermission.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })
      mockUserStorage.findById.mockResolvedValue(mockUser as any)
      mockWarrantyStorage.updateClaim.mockResolvedValue(null)

      const request = createMockNextRequest({
        method: 'PATCH',
        json: jest.fn().mockResolvedValue({ status: 'approved' }),
      })
      const response = await PATCH(request, { params: { id: 'claim-1' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Warranty claim not found')
    })

    it('should return 500 when an error occurs', async () => {
      const mockSession = createMockSession()
      const mockUser = createMockUser()

      mockRequireAuthAndPermission.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })
      mockUserStorage.findById.mockResolvedValue(mockUser as any)
      mockWarrantyStorage.updateClaim.mockRejectedValue(new Error('Database error'))

      const request = createMockNextRequest({
        method: 'PATCH',
        json: jest.fn().mockResolvedValue({ status: 'approved' }),
      })
      const response = await PATCH(request, { params: { id: 'claim-1' } })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })
})
