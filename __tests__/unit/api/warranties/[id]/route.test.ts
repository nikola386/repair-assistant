import { GET, PATCH, DELETE } from '@/app/api/warranties/[id]/route'
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

describe('/api/warranties/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should return warranty successfully', async () => {
      const mockSession = createMockSession()
      const mockUser = createMockUser()
      const mockWarranty = {
        id: 'warranty-1',
        ticketId: 'ticket-1',
        status: 'active',
        warrantyType: 'both',
        warrantyPeriodDays: 30,
      }

      mockRequireAuthAndPermission.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })
      mockUserStorage.findById.mockResolvedValue(mockUser as any)
      mockWarrantyStorage.getById.mockResolvedValue(mockWarranty as any)

      const request = createMockNextRequest()
      const response = await GET(request, { params: { id: 'warranty-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.warranty).toEqual(mockWarranty)
      expect(mockWarrantyStorage.getById).toHaveBeenCalledWith('warranty-1', mockUser.storeId)
    })

    it('should return 404 when warranty not found', async () => {
      const mockSession = createMockSession()
      const mockUser = createMockUser()

      mockRequireAuthAndPermission.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })
      mockUserStorage.findById.mockResolvedValue(mockUser as any)
      mockWarrantyStorage.getById.mockResolvedValue(null)

      const request = createMockNextRequest()
      const response = await GET(request, { params: { id: 'warranty-1' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Warranty not found')
    })

    it('should return 404 when user store not found', async () => {
      const mockSession = createMockSession()

      mockRequireAuthAndPermission.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })
      mockUserStorage.findById.mockResolvedValue(null)

      const request = createMockNextRequest()
      const response = await GET(request, { params: { id: 'warranty-1' } })
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
      const response = await GET(request, { params: { id: 'warranty-1' } })

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
      mockWarrantyStorage.getById.mockRejectedValue(new Error('Database error'))

      const request = createMockNextRequest()
      const response = await GET(request, { params: { id: 'warranty-1' } })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })

  describe('PATCH', () => {
    it('should update warranty successfully', async () => {
      const mockSession = createMockSession()
      const mockUser = createMockUser()
      const updatedWarranty = {
        id: 'warranty-1',
        status: 'active',
        warrantyType: 'parts',
        warrantyPeriodDays: 60,
      }

      mockRequireAuthAndPermission.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })
      mockUserStorage.findById.mockResolvedValue(mockUser as any)
      mockWarrantyStorage.update.mockResolvedValue(updatedWarranty as any)

      const request = createMockNextRequest({
        method: 'PATCH',
        json: jest.fn().mockResolvedValue({
          status: 'active',
          warrantyType: 'parts',
          warrantyPeriodDays: 60,
        }),
      })
      const response = await PATCH(request, { params: { id: 'warranty-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.warranty).toEqual(updatedWarranty)
      expect(data.message).toBe('Warranty updated successfully')
    })

    it('should return 404 when warranty not found', async () => {
      const mockSession = createMockSession()
      const mockUser = createMockUser()

      mockRequireAuthAndPermission.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })
      mockUserStorage.findById.mockResolvedValue(mockUser as any)
      mockWarrantyStorage.update.mockResolvedValue(null)

      const request = createMockNextRequest({
        method: 'PATCH',
        json: jest.fn().mockResolvedValue({ status: 'active' }),
      })
      const response = await PATCH(request, { params: { id: 'warranty-1' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Warranty not found')
    })

    it('should ignore invalid status values', async () => {
      const mockSession = createMockSession()
      const mockUser = createMockUser()
      const updatedWarranty = {
        id: 'warranty-1',
        status: 'active',
      }

      mockRequireAuthAndPermission.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })
      mockUserStorage.findById.mockResolvedValue(mockUser as any)
      mockWarrantyStorage.update.mockResolvedValue(updatedWarranty as any)

      const request = createMockNextRequest({
        method: 'PATCH',
        json: jest.fn().mockResolvedValue({ status: 'invalid-status' }),
      })
      const response = await PATCH(request, { params: { id: 'warranty-1' } })

      expect(response.status).toBe(200)
      expect(mockWarrantyStorage.update).toHaveBeenCalled()
    })

    it('should return 500 when an error occurs', async () => {
      const mockSession = createMockSession()
      const mockUser = createMockUser()

      mockRequireAuthAndPermission.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })
      mockUserStorage.findById.mockResolvedValue(mockUser as any)
      mockWarrantyStorage.update.mockRejectedValue(new Error('Database error'))

      const request = createMockNextRequest({
        method: 'PATCH',
        json: jest.fn().mockResolvedValue({ status: 'active' }),
      })
      const response = await PATCH(request, { params: { id: 'warranty-1' } })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })

  describe('DELETE', () => {
    it('should void warranty successfully', async () => {
      const mockSession = createMockSession()
      const mockUser = createMockUser()
      const voidedWarranty = {
        id: 'warranty-1',
        status: 'voided',
      }

      mockRequireAuthAndPermission.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })
      mockUserStorage.findById.mockResolvedValue(mockUser as any)
      mockWarrantyStorage.voidWarranty.mockResolvedValue(voidedWarranty as any)

      const request = createMockNextRequest({ method: 'DELETE' })
      const response = await DELETE(request, { params: { id: 'warranty-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.warranty).toEqual(voidedWarranty)
      expect(data.message).toBe('Warranty voided successfully')
      expect(mockWarrantyStorage.voidWarranty).toHaveBeenCalledWith('warranty-1', mockUser.storeId)
    })

    it('should return 404 when warranty not found', async () => {
      const mockSession = createMockSession()
      const mockUser = createMockUser()

      mockRequireAuthAndPermission.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })
      mockUserStorage.findById.mockResolvedValue(mockUser as any)
      mockWarrantyStorage.voidWarranty.mockResolvedValue(null)

      const request = createMockNextRequest({ method: 'DELETE' })
      const response = await DELETE(request, { params: { id: 'warranty-1' } })
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
      mockWarrantyStorage.voidWarranty.mockRejectedValue(new Error('Database error'))

      const request = createMockNextRequest({ method: 'DELETE' })
      const response = await DELETE(request, { params: { id: 'warranty-1' } })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })
})

