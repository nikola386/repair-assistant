import { isOnboardingComplete, getOnboardingStatus } from '@/lib/onboarding'
import { userStorage } from '@/lib/userStorage'
import { db } from '@/lib/db'

jest.mock('@/lib/userStorage')
jest.mock('@/lib/db', () => ({
  db: {
    store: {
      findUnique: jest.fn(),
    },
  },
}))

const mockUserStorage = userStorage as jest.Mocked<typeof userStorage>
const mockDb = db as jest.Mocked<typeof db>

describe('onboarding', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('isOnboardingComplete', () => {
    it('should return true when store is onboarded', async () => {
      mockUserStorage.getStoreId.mockResolvedValue('store-1')
      mockDb.store.findUnique.mockResolvedValue({ onboarded: true } as any)

      const result = await isOnboardingComplete('user-1')

      expect(result).toBe(true)
      expect(mockUserStorage.getStoreId).toHaveBeenCalledWith('user-1')
    })

    it('should return false when store is not onboarded', async () => {
      mockUserStorage.getStoreId.mockResolvedValue('store-1')
      mockDb.store.findUnique.mockResolvedValue({ onboarded: false } as any)

      const result = await isOnboardingComplete('user-1')

      expect(result).toBe(false)
    })

    it('should return false when store does not exist', async () => {
      mockUserStorage.getStoreId.mockResolvedValue('store-1')
      mockDb.store.findUnique.mockResolvedValue(null)

      const result = await isOnboardingComplete('user-1')

      expect(result).toBe(false)
    })

    it('should return false when user has no store', async () => {
      mockUserStorage.getStoreId.mockResolvedValue(null)

      const result = await isOnboardingComplete('user-1')

      expect(result).toBe(false)
    })

    it('should return false when an error occurs', async () => {
      mockUserStorage.getStoreId.mockRejectedValue(new Error('Database error'))

      const result = await isOnboardingComplete('user-1')

      expect(result).toBe(false)
    })
  })

  describe('getOnboardingStatus', () => {
    it('should return complete status when store is onboarded', async () => {
      mockUserStorage.getStoreId.mockResolvedValue('store-1')
      mockDb.store.findUnique.mockResolvedValue({ onboarded: true } as any)

      const result = await getOnboardingStatus('user-1')

      expect(result).toEqual({
        isComplete: true,
        storeId: 'store-1',
        storeOnboarded: true,
      })
    })

    it('should return incomplete status when store is not onboarded', async () => {
      mockUserStorage.getStoreId.mockResolvedValue('store-1')
      mockDb.store.findUnique.mockResolvedValue({ onboarded: false } as any)

      const result = await getOnboardingStatus('user-1')

      expect(result).toEqual({
        isComplete: false,
        storeId: 'store-1',
        storeOnboarded: false,
      })
    })

    it('should return incomplete status when user has no store', async () => {
      mockUserStorage.getStoreId.mockResolvedValue(null)

      const result = await getOnboardingStatus('user-1')

      expect(result).toEqual({
        isComplete: false,
        storeId: null,
        storeOnboarded: false,
      })
    })

    it('should return incomplete status when an error occurs', async () => {
      mockUserStorage.getStoreId.mockRejectedValue(new Error('Database error'))

      const result = await getOnboardingStatus('user-1')

      expect(result).toEqual({
        isComplete: false,
        storeId: null,
        storeOnboarded: false,
      })
    })
  })
})

