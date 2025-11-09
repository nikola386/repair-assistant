import {
  getFromCache,
  setCache,
  removeCache,
  clearCacheByPrefix,
  getCachedProfileData,
  updateProfileCache,
  clearProfileCache,
  getCachedCountries,
  setCachedCountries,
  clearCountriesCache,
  getCachedPermissions,
  setCachedPermissions,
  clearPermissionsCache,
} from '@/lib/cache'

// Mock localStorage
let localStorageStore: Record<string, string> = {}

const mockLocalStorage = {
  getItem: jest.fn((key: string) => localStorageStore[key] || null),
  setItem: jest.fn((key: string, value: string) => {
    localStorageStore[key] = value
  }),
  removeItem: jest.fn((key: string) => {
    delete localStorageStore[key]
  }),
  clear: jest.fn(() => {
    localStorageStore = {}
  }),
  get length() {
    return Object.keys(localStorageStore).length
  },
  key: jest.fn((index: number) => Object.keys(localStorageStore)[index] || null),
}

// Store original Object.keys
const originalObjectKeys = Object.keys

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
  configurable: true,
})

describe('cache', () => {
  beforeEach(() => {
    localStorageStore = {}
    jest.clearAllMocks()
    Object.keys = originalObjectKeys
  })

  describe('generic cache functions', () => {
    it('should set and get cache value', () => {
      const data = { test: 'value' }
      setCache('test-key', data)
      const retrieved = getFromCache<typeof data>('test-key')

      expect(retrieved).toEqual(data)
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('test-key', JSON.stringify(data))
    })

    it('should return null for non-existent key', () => {
      const retrieved = getFromCache('non-existent')
      expect(retrieved).toBeNull()
    })

    it('should remove cache entry', () => {
      setCache('test-key', { data: 'value' })
      removeCache('test-key')

      const retrieved = getFromCache('test-key')
      expect(retrieved).toBeNull()
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('test-key')
    })

    it('should clear cache by prefix', () => {
      setCache('prefix_key1', 'value1')
      setCache('prefix_key2', 'value2')
      setCache('other_key', 'value3')

      // The clearCacheByPrefix function uses Object.keys(localStorage)
      // We need to ensure our mock localStorage works with Object.keys
      const keysBefore = Object.keys(localStorageStore)
      expect(keysBefore).toContain('prefix_key1')
      expect(keysBefore).toContain('prefix_key2')
      expect(keysBefore).toContain('other_key')

      // Mock Object.keys to work with our localStorage mock
      const originalKeys = Object.keys
      const mockKeys = jest.fn((obj: any) => {
        if (obj === mockLocalStorage || obj === window.localStorage) {
          return Object.keys(localStorageStore)
        }
        return originalKeys(obj)
      })
      Object.keys = mockKeys as any

      clearCacheByPrefix('prefix_')

      // Restore Object.keys
      Object.keys = originalKeys

      expect(getFromCache('prefix_key1')).toBeNull()
      expect(getFromCache('prefix_key2')).toBeNull()
      expect(getFromCache('other_key')).not.toBeNull()
    })

    it('should handle invalid JSON gracefully', () => {
      mockLocalStorage.getItem.mockReturnValueOnce('invalid json')
      const retrieved = getFromCache('invalid-key')
      expect(retrieved).toBeNull()
    })
  })

  describe('profile cache', () => {
    it('should get and update profile cache', () => {
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
      } as any

      updateProfileCache(user)
      const cached = getCachedProfileData()

      expect(cached?.user).toEqual(user)
    })

    it('should preserve store data when updating user', () => {
      const user1 = { id: 'user-1', email: 'test@example.com' } as any
      const store = { id: 'store-1', name: 'Test Store', country: 'US', vatNumber: null }

      updateProfileCache(user1, store)
      const user2 = { id: 'user-1', email: 'updated@example.com' } as any
      updateProfileCache(user2)

      const cached = getCachedProfileData()
      expect(cached?.user).toEqual(user2)
      expect(cached?.store).toEqual(store)
    })

    it('should clear profile cache', () => {
      const user = { id: 'user-1', email: 'test@example.com' } as any
      updateProfileCache(user)
      clearProfileCache()

      const cached = getCachedProfileData()
      expect(cached).toBeNull()
    })
  })

  describe('countries cache', () => {
    it('should set and get countries cache', () => {
      const countries = [
        { id: '1', code: 'US', name: 'United States', requiresVat: false },
        { id: '2', code: 'BG', name: 'Bulgaria', requiresVat: true },
      ]

      setCachedCountries(countries)
      const cached = getCachedCountries()

      expect(cached).toEqual(countries)
    })

    it('should clear countries cache', () => {
      const countries = [{ id: '1', code: 'US', name: 'United States', requiresVat: false }]
      setCachedCountries(countries)
      clearCountriesCache()

      const cached = getCachedCountries()
      expect(cached).toBeNull()
    })
  })

  describe('permissions cache', () => {
    it('should set and get permissions cache', () => {
      const permissions = ['VIEW_TICKETS', 'CREATE_TICKETS'] as any

      setCachedPermissions('user-1', permissions)
      const cached = getCachedPermissions('user-1')

      expect(cached).toEqual(permissions)
    })

    it('should return null for expired cache', () => {
      const permissions = ['VIEW_TICKETS'] as any
      setCachedPermissions('user-1', permissions)

      // Mock Date.now to simulate expired cache
      const originalNow = Date.now
      Date.now = jest.fn(() => originalNow() + 6 * 60 * 1000) // 6 minutes later

      const cached = getCachedPermissions('user-1')
      expect(cached).toBeNull()

      Date.now = originalNow
    })

    it('should clear permissions cache for specific user', () => {
      setCachedPermissions('user-1', ['VIEW_TICKETS'] as any)
      clearPermissionsCache('user-1')

      const cached = getCachedPermissions('user-1')
      expect(cached).toBeNull()
    })

    it('should clear all permissions cache when no userId provided', () => {
      setCachedPermissions('user-1', ['VIEW_TICKETS'] as any)
      setCachedPermissions('user-2', ['VIEW_TICKETS'] as any)

      // Verify they were set
      expect(getCachedPermissions('user-1')).not.toBeNull()
      expect(getCachedPermissions('user-2')).not.toBeNull()

      // Mock Object.keys to work with our localStorage mock
      const originalKeys = Object.keys
      const mockKeys = jest.fn((obj: any) => {
        if (obj === mockLocalStorage || obj === window.localStorage) {
          return Object.keys(localStorageStore)
        }
        return originalKeys(obj)
      })
      Object.keys = mockKeys as any

      clearPermissionsCache()

      // Restore Object.keys
      Object.keys = originalKeys

      expect(getCachedPermissions('user-1')).toBeNull()
      expect(getCachedPermissions('user-2')).toBeNull()
    })
  })
})

