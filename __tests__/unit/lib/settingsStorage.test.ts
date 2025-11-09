import { settingsStorage } from '@/lib/settingsStorage'
import { db } from '@/lib/db'

jest.mock('@/lib/db', () => ({
  db: {
    settings: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  },
}))

const mockDb = db as jest.Mocked<typeof db>

describe('settingsStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('findByStoreId', () => {
    it('should return settings for store', async () => {
      const mockSettings = {
        id: 'settings-1',
        storeId: 'store-1',
        primaryColor: '#FFD700',
        secondaryColor: '#000000',
        language: 'en',
        defaultWarrantyPeriodDays: 30,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockDb.settings.findUnique.mockResolvedValue(mockSettings as any)

      const result = await settingsStorage.findByStoreId('store-1')

      expect(result).toBeDefined()
      expect(result?.storeId).toBe('store-1')
    })

    it('should return null when settings not found', async () => {
      mockDb.settings.findUnique.mockResolvedValue(null)

      const result = await settingsStorage.findByStoreId('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('createOrUpdate', () => {
    it('should create settings when they do not exist', async () => {
      const updateData = {
        primaryColor: '#FF0000',
        secondaryColor: '#00FF00',
        language: 'bg',
        defaultWarrantyPeriodDays: 60,
      }

      const mockSettings = {
        id: 'settings-1',
        storeId: 'store-1',
        ...updateData,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockDb.settings.upsert.mockResolvedValue(mockSettings as any)

      const result = await settingsStorage.createOrUpdate('store-1', updateData)

      expect(result).toBeDefined()
      expect(result.primaryColor).toBe('#FF0000')
      expect(mockDb.settings.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { storeId: 'store-1' },
        })
      )
    })

    it('should update existing settings', async () => {
      const updateData = {
        primaryColor: '#0000FF',
      }

      const mockSettings = {
        id: 'settings-1',
        storeId: 'store-1',
        primaryColor: '#0000FF',
        secondaryColor: '#000000',
        language: 'en',
        defaultWarrantyPeriodDays: 30,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockDb.settings.upsert.mockResolvedValue(mockSettings as any)

      const result = await settingsStorage.createOrUpdate('store-1', updateData)

      expect(result).toBeDefined()
      expect(result.primaryColor).toBe('#0000FF')
    })
  })

  describe('updateColors', () => {
    it('should update colors', async () => {
      const mockSettings = {
        id: 'settings-1',
        storeId: 'store-1',
        primaryColor: '#FF0000',
        secondaryColor: '#00FF00',
        language: 'en',
        defaultWarrantyPeriodDays: 30,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockDb.settings.upsert.mockResolvedValue(mockSettings as any)

      const result = await settingsStorage.updateColors('store-1', '#FF0000', '#00FF00')

      expect(result).toBeDefined()
      expect(result.primaryColor).toBe('#FF0000')
      expect(result.secondaryColor).toBe('#00FF00')
    })
  })

  describe('updateLanguage', () => {
    it('should update language', async () => {
      const mockSettings = {
        id: 'settings-1',
        storeId: 'store-1',
        primaryColor: '#FFD700',
        secondaryColor: '#000000',
        language: 'bg',
        defaultWarrantyPeriodDays: 30,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockDb.settings.upsert.mockResolvedValue(mockSettings as any)

      const result = await settingsStorage.updateLanguage('store-1', 'bg')

      expect(result).toBeDefined()
      expect(result.language).toBe('bg')
    })
  })
})

