import { fetchPermissions, checkPermission, invalidatePermissionsCache } from '@/lib/permissionsCache'
import { getCachedPermissions, setCachedPermissions, clearPermissionsCache } from '@/lib/cache'
import { Permission } from '@/lib/permissions'

jest.mock('@/lib/cache')
jest.mock('@/lib/permissions', () => ({
  Permission: {
    VIEW_TICKETS: 'tickets.view',
    EDIT_TICKETS: 'tickets.edit',
  },
}))

const mockGetCachedPermissions = getCachedPermissions as jest.MockedFunction<typeof getCachedPermissions>
const mockSetCachedPermissions = setCachedPermissions as jest.MockedFunction<typeof setCachedPermissions>
const mockClearPermissionsCache = clearPermissionsCache as jest.MockedFunction<typeof clearPermissionsCache>

describe('permissionsCache', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  describe('fetchPermissions', () => {
    it('should return cached permissions when available', async () => {
      const cachedPermissions = [Permission.VIEW_TICKETS, Permission.EDIT_TICKETS]
      mockGetCachedPermissions.mockReturnValue(cachedPermissions)

      const result = await fetchPermissions('user-1')

      expect(result).toEqual(cachedPermissions)
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should fetch permissions from API when not cached', async () => {
      const apiPermissions = [Permission.VIEW_TICKETS]
      mockGetCachedPermissions.mockReturnValue(null)
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ permissions: apiPermissions }),
      })

      const result = await fetchPermissions('user-1')

      expect(result).toEqual(apiPermissions)
      expect(global.fetch).toHaveBeenCalledWith('/api/users/permissions')
      expect(mockSetCachedPermissions).toHaveBeenCalledWith('user-1', apiPermissions)
    })

    it('should throw error when API call fails', async () => {
      mockGetCachedPermissions.mockReturnValue(null)
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
      })

      await expect(fetchPermissions('user-1')).rejects.toThrow('Failed to fetch permissions')
    })
  })

  describe('checkPermission', () => {
    it('should return true when cached permissions include permission', async () => {
      const cachedPermissions = [Permission.VIEW_TICKETS, Permission.EDIT_TICKETS]
      mockGetCachedPermissions.mockReturnValue(cachedPermissions)

      const result = await checkPermission('user-1', Permission.VIEW_TICKETS)

      expect(result).toBe(true)
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should return false when cached permissions do not include permission', async () => {
      const cachedPermissions = [Permission.VIEW_TICKETS]
      mockGetCachedPermissions.mockReturnValue(cachedPermissions)

      const result = await checkPermission('user-1', Permission.EDIT_TICKETS)

      expect(result).toBe(false)
    })

    it('should fetch permissions when not cached', async () => {
      const apiPermissions = [Permission.VIEW_TICKETS]
      mockGetCachedPermissions.mockReturnValue(null)
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ permissions: apiPermissions }),
      })

      const result = await checkPermission('user-1', Permission.VIEW_TICKETS)

      expect(result).toBe(true)
      expect(global.fetch).toHaveBeenCalled()
    })

    it('should return false when API call fails', async () => {
      mockGetCachedPermissions.mockReturnValue(null)
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
      })

      const result = await checkPermission('user-1', Permission.VIEW_TICKETS)

      expect(result).toBe(false)
    })
  })

  describe('invalidatePermissionsCache', () => {
    it('should clear cache for specific user', () => {
      invalidatePermissionsCache('user-1')

      expect(mockClearPermissionsCache).toHaveBeenCalledWith('user-1')
    })

    it('should clear all cache when no user provided', () => {
      invalidatePermissionsCache()

      expect(mockClearPermissionsCache).toHaveBeenCalledWith(undefined)
    })
  })
})

