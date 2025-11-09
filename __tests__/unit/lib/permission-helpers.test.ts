import { checkPermission, requireUserPermission, getUserPermissions } from '@/lib/permission-helpers'
import { userStorage } from '@/lib/userStorage'
import { Permission, UserRole } from '@/lib/permissions'
import { createMockUser } from '../../utils/test-helpers'

jest.mock('@/lib/userStorage')

const mockUserStorage = userStorage as jest.Mocked<typeof userStorage>

describe('permission-helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('checkPermission', () => {
    it('should return true when user has permission', async () => {
      const mockUser = createMockUser({ role: UserRole.ADMIN })

      mockUserStorage.findById.mockResolvedValue(mockUser as any)

      const result = await checkPermission('user-1', Permission.VIEW_TICKETS)

      expect(result).toBe(true)
      expect(mockUserStorage.findById).toHaveBeenCalledWith('user-1')
    })

    it('should return false when user does not have permission', async () => {
      const mockUser = createMockUser({ role: UserRole.VIEWER })

      mockUserStorage.findById.mockResolvedValue(mockUser as any)

      const result = await checkPermission('user-1', Permission.EDIT_TICKETS)

      expect(result).toBe(false)
    })

    it('should return false when user is inactive', async () => {
      const mockUser = createMockUser({ role: UserRole.ADMIN, isActive: false })

      mockUserStorage.findById.mockResolvedValue(mockUser as any)

      const result = await checkPermission('user-1', Permission.VIEW_TICKETS)

      expect(result).toBe(false)
    })

    it('should return false when user not found', async () => {
      mockUserStorage.findById.mockResolvedValue(null)

      const result = await checkPermission('user-1', Permission.VIEW_TICKETS)

      expect(result).toBe(false)
    })
  })

  describe('requireUserPermission', () => {
    it('should not throw when user has permission', async () => {
      const mockUser = createMockUser({ role: UserRole.ADMIN })

      mockUserStorage.findById.mockResolvedValue(mockUser as any)

      await expect(requireUserPermission('user-1', Permission.VIEW_TICKETS)).resolves.not.toThrow()
    })

    it('should throw when user does not have permission', async () => {
      const mockUser = createMockUser({ role: UserRole.VIEWER })

      mockUserStorage.findById.mockResolvedValue(mockUser as any)

      await expect(requireUserPermission('user-1', Permission.EDIT_TICKETS)).rejects.toThrow()
    })

    it('should throw when user is inactive', async () => {
      const mockUser = createMockUser({ role: UserRole.ADMIN, isActive: false })

      mockUserStorage.findById.mockResolvedValue(mockUser as any)

      await expect(requireUserPermission('user-1', Permission.VIEW_TICKETS)).rejects.toThrow('User not found or inactive')
    })

    it('should throw when user not found', async () => {
      mockUserStorage.findById.mockResolvedValue(null)

      await expect(requireUserPermission('user-1', Permission.VIEW_TICKETS)).rejects.toThrow('User not found or inactive')
    })
  })

  describe('getUserPermissions', () => {
    it('should return permissions for active user', async () => {
      const mockUser = createMockUser({ role: UserRole.ADMIN })

      mockUserStorage.findById.mockResolvedValue(mockUser as any)

      const permissions = await getUserPermissions('user-1')

      expect(Array.isArray(permissions)).toBe(true)
      expect(permissions.length).toBeGreaterThan(0)
      expect(permissions).toContain(Permission.VIEW_TICKETS)
    })

    it('should return empty array when user is inactive', async () => {
      const mockUser = createMockUser({ role: UserRole.ADMIN, isActive: false })

      mockUserStorage.findById.mockResolvedValue(mockUser as any)

      const permissions = await getUserPermissions('user-1')

      expect(permissions).toEqual([])
    })

    it('should return empty array when user not found', async () => {
      mockUserStorage.findById.mockResolvedValue(null)

      const permissions = await getUserPermissions('user-1')

      expect(permissions).toEqual([])
    })
  })
})
