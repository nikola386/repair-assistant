import { PATCH, DELETE } from '@/app/api/users/[id]/route'
import { NextRequest } from 'next/server'
import { requireAuthAndPermission } from '@/lib/api-middleware'
import { Permission } from '@/lib/permissions'
import { userStorage } from '@/lib/userStorage'
import { createMockNextRequest, createMockSession, createMockUser } from '../../../../utils/test-helpers'

jest.mock('@/lib/api-middleware')
jest.mock('@/lib/userStorage')

const mockRequireAuthAndPermission = requireAuthAndPermission as jest.MockedFunction<typeof requireAuthAndPermission>
const mockUserStorage = userStorage as jest.Mocked<typeof userStorage>

describe('/api/users/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('PATCH', () => {
    it('should update user successfully', async () => {
      const mockSession = createMockSession({ user: { storeId: 'test-store-id' } })
      const targetUser = createMockUser({ id: 'target-user-id', role: 'TECHNICIAN', storeId: 'test-store-id' })
      const updatedUser = createMockUser({ id: 'target-user-id', role: 'MANAGER', storeId: 'test-store-id' })

      mockRequireAuthAndPermission.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })
      mockUserStorage.findById.mockResolvedValue(targetUser as any)
      mockUserStorage.update.mockResolvedValue(updatedUser as any)

      const request = createMockNextRequest({
        method: 'PATCH',
        json: jest.fn().mockResolvedValue({ role: 'MANAGER' }),
      })
      const response = await PATCH(request, { params: { id: 'target-user-id' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.role).toBe('MANAGER')
      expect(mockUserStorage.update).toHaveBeenCalled()
    })

    it('should return 404 when user not found', async () => {
      const mockSession = createMockSession()

      mockRequireAuthAndPermission.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })
      mockUserStorage.findById.mockResolvedValue(null)

      const request = createMockNextRequest({
        method: 'PATCH',
        json: jest.fn().mockResolvedValue({ role: 'MANAGER' }),
      })
      const response = await PATCH(request, { params: { id: 'target-user-id' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('User not found')
    })

    it('should return 404 when user belongs to different store', async () => {
      const mockSession = createMockSession({ user: { storeId: 'test-store-id' } })
      const targetUser = createMockUser({ id: 'target-user-id', storeId: 'different-store-id' })

      mockRequireAuthAndPermission.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })
      mockUserStorage.findById.mockResolvedValue(targetUser as any)

      const request = createMockNextRequest({
        method: 'PATCH',
        json: jest.fn().mockResolvedValue({ role: 'MANAGER' }),
      })
      const response = await PATCH(request, { params: { id: 'target-user-id' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('User not found')
    })

    it('should return 400 when trying to modify own role', async () => {
      const mockSession = createMockSession({ user: { storeId: 'test-store-id' } })
      const targetUser = createMockUser({ id: mockSession.user.id, storeId: 'test-store-id' })

      mockRequireAuthAndPermission.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })
      mockUserStorage.findById.mockResolvedValue(targetUser as any)

      const request = createMockNextRequest({
        method: 'PATCH',
        json: jest.fn().mockResolvedValue({ role: 'MANAGER' }),
      })
      const response = await PATCH(request, { params: { id: mockSession.user.id } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Cannot modify your own role')
    })

    it('should return 400 when trying to deactivate yourself', async () => {
      const mockSession = createMockSession({ user: { storeId: 'test-store-id' } })
      const targetUser = createMockUser({ id: mockSession.user.id, storeId: 'test-store-id' })

      mockRequireAuthAndPermission.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })
      mockUserStorage.findById.mockResolvedValue(targetUser as any)

      const request = createMockNextRequest({
        method: 'PATCH',
        json: jest.fn().mockResolvedValue({ isActive: false }),
      })
      const response = await PATCH(request, { params: { id: mockSession.user.id } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Cannot modify your own role')
    })

    it('should return 400 when validation fails', async () => {
      const mockSession = createMockSession({ user: { storeId: 'test-store-id' } })
      const targetUser = createMockUser({ id: 'target-user-id', storeId: 'test-store-id' })

      mockRequireAuthAndPermission.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })
      mockUserStorage.findById.mockResolvedValue(targetUser as any)

      const request = createMockNextRequest({
        method: 'PATCH',
        json: jest.fn().mockResolvedValue({ role: 'INVALID_ROLE' }),
      })
      const response = await PATCH(request, { params: { id: 'target-user-id' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request data')
    })

    it('should return 401 when not authenticated', async () => {
      mockRequireAuthAndPermission.mockResolvedValue({
        session: null,
        response: { status: 401 } as any,
      })

      const request = createMockNextRequest({
        method: 'PATCH',
        json: jest.fn().mockResolvedValue({}),
      })
      const response = await PATCH(request, { params: { id: 'target-user-id' } })

      expect(response.status).toBe(401)
    })

    it('should return 500 when an error occurs', async () => {
      const mockSession = createMockSession({ user: { storeId: 'test-store-id' } })
      const targetUser = createMockUser({ id: 'target-user-id', storeId: 'test-store-id' })

      mockRequireAuthAndPermission.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })
      mockUserStorage.findById.mockResolvedValue(targetUser as any)
      mockUserStorage.update.mockRejectedValue(new Error('Database error'))

      const request = createMockNextRequest({
        method: 'PATCH',
        json: jest.fn().mockResolvedValue({ role: 'MANAGER' }),
      })
      const response = await PATCH(request, { params: { id: 'target-user-id' } })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to update user')
    })
  })

  describe('DELETE', () => {
    it('should deactivate user successfully', async () => {
      const mockSession = createMockSession({ user: { storeId: 'test-store-id' } })
      const targetUser = createMockUser({ id: 'target-user-id', storeId: 'test-store-id' })

      mockRequireAuthAndPermission.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })
      mockUserStorage.findById.mockResolvedValue(targetUser as any)
      mockUserStorage.update.mockResolvedValue({ ...targetUser, isActive: false } as any)

      const request = createMockNextRequest({ method: 'DELETE' })
      const response = await DELETE(request, { params: { id: 'target-user-id' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('User deactivated successfully')
      expect(mockUserStorage.update).toHaveBeenCalledWith('target-user-id', { isActive: false })
    })

    it('should return 404 when user not found', async () => {
      const mockSession = createMockSession()

      mockRequireAuthAndPermission.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })
      mockUserStorage.findById.mockResolvedValue(null)

      const request = createMockNextRequest({ method: 'DELETE' })
      const response = await DELETE(request, { params: { id: 'target-user-id' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('User not found')
    })

    it('should return 400 when trying to delete yourself', async () => {
      const mockSession = createMockSession({ user: { storeId: 'test-store-id' } })
      const targetUser = createMockUser({ id: mockSession.user.id, storeId: 'test-store-id' })

      mockRequireAuthAndPermission.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })
      mockUserStorage.findById.mockResolvedValue(targetUser as any)

      const request = createMockNextRequest({ method: 'DELETE' })
      const response = await DELETE(request, { params: { id: mockSession.user.id } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Cannot delete yourself')
    })

    it('should return 401 when not authenticated', async () => {
      mockRequireAuthAndPermission.mockResolvedValue({
        session: null,
        response: { status: 401 } as any,
      })

      const request = createMockNextRequest({ method: 'DELETE' })
      const response = await DELETE(request, { params: { id: 'target-user-id' } })

      expect(response.status).toBe(401)
    })

    it('should return 500 when an error occurs', async () => {
      const mockSession = createMockSession({ user: { storeId: 'test-store-id' } })
      const targetUser = createMockUser({ id: 'target-user-id', storeId: 'test-store-id' })

      mockRequireAuthAndPermission.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })
      mockUserStorage.findById.mockResolvedValue(targetUser as any)
      mockUserStorage.update.mockRejectedValue(new Error('Database error'))

      const request = createMockNextRequest({ method: 'DELETE' })
      const response = await DELETE(request, { params: { id: 'target-user-id' } })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to delete user')
    })
  })
})

