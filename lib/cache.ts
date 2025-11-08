import type { User } from './userStorage'
import { Permission } from './permissions'

/**
 * Generic cache helper functions for localStorage
 */

/**
 * Get a value from localStorage cache
 * @param key - The cache key
 * @returns The cached value or null if not found or invalid
 */
export function getFromCache<T>(key: string): T | null {
  try {
    const cached = localStorage.getItem(key)
    if (cached) {
      return JSON.parse(cached) as T
    }
  } catch (err) {
    localStorage.removeItem(key)
  }
  return null
}

/**
 * Set a value in localStorage cache
 * @param key - The cache key
 * @param value - The value to cache
 */
export function setCache(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (err) {
    console.error(`Error caching ${key}:`, err)
  }
}

/**
 * Remove a value from localStorage cache
 * @param key - The cache key
 */
export function removeCache(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch (err) {
    console.error(`Error removing cache ${key}:`, err)
  }
}

/**
 * Clear all cache entries matching a prefix
 * @param prefix - The prefix to match
 */
export function clearCacheByPrefix(prefix: string): void {
  try {
    const keys = Object.keys(localStorage)
    keys.forEach((key) => {
      if (key.startsWith(prefix)) {
        localStorage.removeItem(key)
      }
    })
  } catch (err) {
    console.error(`Error clearing cache with prefix ${prefix}:`, err)
  }
}

/**
 * Profile cache helper functions
 */

export interface CachedProfileData {
  user: User
  store: {
    id: string
    name: string
    country: string | null
    vatNumber: string | null
  } | null
}

const PROFILE_CACHE_KEY = 'cached_profile'

/**
 * Get cached profile data
 * @returns The cached profile data or null if not found
 */
export function getCachedProfileData(): CachedProfileData | null {
  return getFromCache<CachedProfileData>(PROFILE_CACHE_KEY)
}

/**
 * Update profile cache
 * @param user - The user data to cache
 * @param store - Optional store data to cache (if not provided, existing store data is preserved)
 */
export function updateProfileCache(user: User, store?: CachedProfileData['store']): void {
  const cachedData = getCachedProfileData()
  setCache(PROFILE_CACHE_KEY, {
    user,
    store: store ?? cachedData?.store ?? null,
  })
}

/**
 * Clear profile cache
 */
export function clearProfileCache(): void {
  removeCache(PROFILE_CACHE_KEY)
}

/**
 * Countries cache helper functions
 */

const COUNTRIES_CACHE_KEY = 'cached_countries'

export interface Country {
  id: string
  code: string
  name: string
  requiresVat: boolean
}

/**
 * Get cached countries data
 * @returns The cached countries array or null if not found
 */
export function getCachedCountries(): Country[] | null {
  return getFromCache<Country[]>(COUNTRIES_CACHE_KEY)
}

/**
 * Set cached countries data
 * @param countries - The countries array to cache
 */
export function setCachedCountries(countries: Country[]): void {
  setCache(COUNTRIES_CACHE_KEY, countries)
}

/**
 * Clear countries cache
 */
export function clearCountriesCache(): void {
  removeCache(COUNTRIES_CACHE_KEY)
}

/**
 * Permissions cache helper functions
 */

const PERMISSIONS_CACHE_KEY_PREFIX = 'cached_permissions_'
const PERMISSIONS_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

interface CachedPermissionsData {
  permissions: Permission[]
  timestamp: number
}

/**
 * Get the cache key for a specific user's permissions
 */
function getPermissionsCacheKey(userId: string): string {
  return `${PERMISSIONS_CACHE_KEY_PREFIX}${userId}`
}

/**
 * Get cached permissions for a user
 * @param userId - The user ID
 * @returns The cached permissions array or null if not found or expired
 */
export function getCachedPermissions(userId: string): Permission[] | null {
  const cacheKey = getPermissionsCacheKey(userId)
  const cached = getFromCache<CachedPermissionsData>(cacheKey)
  
  if (!cached) {
    return null
  }
  
  const now = Date.now()
  if (now - cached.timestamp > PERMISSIONS_CACHE_TTL) {
    removeCache(cacheKey)
    return null
  }
  
  return cached.permissions
}

/**
 * Set cached permissions for a user
 * @param userId - The user ID
 * @param permissions - The permissions array to cache
 */
export function setCachedPermissions(userId: string, permissions: Permission[]): void {
  const cacheKey = getPermissionsCacheKey(userId)
  const data: CachedPermissionsData = {
    permissions,
    timestamp: Date.now(),
  }
  setCache(cacheKey, data)
}

/**
 * Clear permissions cache for a specific user
 * @param userId - The user ID
 */
export function clearPermissionsCache(userId?: string): void {
  if (userId) {
    removeCache(getPermissionsCacheKey(userId))
  } else {
    clearCacheByPrefix(PERMISSIONS_CACHE_KEY_PREFIX)
  }
}

