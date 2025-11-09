import { requireAuthAndPermission, requireStoreAccess } from '@/lib/api-middleware'
import { auth } from '@/lib/auth.config'
import { hasPermission } from '@/lib/permissions'
import { userStorage } from '@/lib/userStorage'
import { Permission, UserRole } from '@/lib/permissions'
import { createMockNextRequest, createMockSession, createMockUser } from '../../utils/test-helpers'

jest.mock('@/lib/auth.config')
jest.mock('@/lib/permissions')
jest.mock('@/lib/userStorage')

const mockAuth = auth as jest.MockedFunction<typeof auth>
const mockHasPermission = hasPermission as jest.MockedFunction<typeof hasPermission>
const mockUserStorage = userStorage as jest.Mocked<typeof userStorage>

describe('api-middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('requireAuthAndPermission', () => {
    it('should return session when user is authenticated and has permission', async () => {
      const mockSession = createMockSession()
      const mockUser = createMockUser()

      mockAuth.mockResolvedValue(mockSession as any)
      mockUserStorage.findById.mockResolvedValue(mockUser as any)
      mockHasPermission.mockReturnValue(true)

      const request = createMockNextRequest()
      const result = await requireAuthAndPermission(request, Permission.VIEW_TICKETS)

      expect(result.session).toEqual(mockSession)
      expect(result.response).toBeNull()
    })

    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValue(null)

      const request = createMockNextRequest()
      const result = await requireAuthAndPermission(request, Permission.VIEW_TICKETS)

      expect(result.session).toBeNull()
      expect(result.response?.status).toBe(401)
    })

    it('should return 403 when user is inactive', async () => {
      const mockSession = createMockSession()
      const mockUser = createMockUser({ isActive: false })

      mockAuth.mockResolvedValue(mockSession as any)
      mockUserStorage.findById.mockResolvedValue(mockUser as any)

      const request = createMockNextRequest()
      const result = await requireAuthAndPermission(request, Permission.VIEW_TICKETS)

      expect(result.session).toBeNull()
      expect(result.response?.status).toBe(403)
    })

    it('should return 403 when user lacks permission', async () => {
      const mockSession = createMockSession()
      const mockUser = createMockUser()

      mockAuth.mockResolvedValue(mockSession as any)
      mockUserStorage.findById.mockResolvedValue(mockUser as any)
      mockHasPermission.mockReturnValue(false)

      const request = createMockNextRequest()
      const result = await requireAuthAndPermission(request, Permission.VIEW_TICKETS)

      expect(result.session).toBeNull()
      expect(result.response?.status).toBe(403)
    })
  })

  describe('requireStoreAccess', () => {
    it('should not throw when user has access to store', async () => {
      const mockUser = createMockUser({ storeId: 'store-1' })

      mockUserStorage.findById.mockResolvedValue(mockUser as any)

      await expect(requireStoreAccess('user-1', 'store-1')).resolves.not.toThrow()
    })

    it('should throw when user does not have access to store', async () => {
      const mockUser = createMockUser({ storeId: 'store-1' })

      mockUserStorage.findById.mockResolvedValue(mockUser as any)

      await expect(requireStoreAccess('user-1', 'store-2')).rejects.toThrow('Access denied')
    })

    it('should throw when user not found', async () => {
      mockUserStorage.findById.mockResolvedValue(null)

      await expect(requireStoreAccess('user-1', 'store-1')).rejects.toThrow('Access denied')
    })
  })
})

