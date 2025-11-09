import { inventoryStorage } from '@/lib/inventoryStorage'
import { db } from '@/lib/db'
import { CreateInventoryItemInput, UpdateInventoryItemInput } from '@/types/inventory'

jest.mock('@/lib/db', () => ({
  db: {
    inventoryItem: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

const mockDb = db as jest.Mocked<typeof db>

describe('inventoryStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getAll', () => {
    it('should return paginated inventory items', async () => {
      const mockItems = [
        {
          id: 'item-1',
          storeId: 'store-1',
          name: 'Screen Protector',
          sku: 'SP-001',
          currentQuantity: { toNumber: () => 50 },
          minQuantity: { toNumber: () => 10 },
          unitPrice: { toNumber: () => 5.99 },
          costPrice: { toNumber: () => 3.50 },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      mockDb.inventoryItem.findMany.mockResolvedValue(mockItems as any)

      const result = await inventoryStorage.getAll('store-1', {
        page: 1,
        limit: 10,
      })

      expect(result.items).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(result.page).toBe(1)
      expect(result.limit).toBe(10)
    })

    it('should filter by search term', async () => {
      mockDb.inventoryItem.findMany.mockResolvedValue([])

      await inventoryStorage.getAll('store-1', {
        search: 'screen',
        page: 1,
        limit: 10,
      })

      expect(mockDb.inventoryItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { name: { contains: 'screen', mode: 'insensitive' } },
            ]),
          }),
        })
      )
    })

    it('should filter by low stock', async () => {
      const mockItems = [
        {
          id: 'item-1',
          currentQuantity: { toNumber: () => 5 },
          minQuantity: { toNumber: () => 10 },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'item-2',
          currentQuantity: { toNumber: () => 20 },
          minQuantity: { toNumber: () => 10 },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      mockDb.inventoryItem.findMany.mockResolvedValue(mockItems as any)

      const result = await inventoryStorage.getAll('store-1', {
        lowStock: true,
        page: 1,
        limit: 10,
      })

      expect(result.items).toHaveLength(1) // Only item-1 is low stock
    })
  })

  describe('getById', () => {
    it('should return inventory item by id', async () => {
      const mockItem = {
        id: 'item-1',
        storeId: 'store-1',
        name: 'Screen Protector',
        currentQuantity: { toNumber: () => 50 },
        minQuantity: { toNumber: () => 10 },
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockDb.inventoryItem.findFirst.mockResolvedValue(mockItem as any)

      const result = await inventoryStorage.getById('item-1', 'store-1')

      expect(result).toBeDefined()
      expect(result?.id).toBe('item-1')
    })

    it('should return undefined when item not found', async () => {
      mockDb.inventoryItem.findFirst.mockResolvedValue(null)

      const result = await inventoryStorage.getById('non-existent', 'store-1')

      expect(result).toBeUndefined()
    })
  })

  describe('create', () => {
    it('should create new inventory item', async () => {
      const input: CreateInventoryItemInput = {
        name: 'Screen Protector',
        sku: 'SP-001',
        currentQuantity: 50,
        minQuantity: 10,
        unitPrice: 5.99,
        costPrice: 3.50,
      }

      mockDb.inventoryItem.create.mockResolvedValue({
        id: 'item-1',
        storeId: 'store-1',
        name: 'Screen Protector',
        sku: 'SP-001',
        currentQuantity: { toNumber: () => 50 },
        minQuantity: { toNumber: () => 10 },
        unitPrice: { toNumber: () => 5.99 },
        costPrice: { toNumber: () => 3.50 },
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any)

      const result = await inventoryStorage.create('store-1', input)

      expect(result).toBeDefined()
      expect(result.name).toBe('Screen Protector')
      expect(mockDb.inventoryItem.create).toHaveBeenCalled()
    })
  })

  describe('update', () => {
    it('should update inventory item', async () => {
      const updateInput: UpdateInventoryItemInput = {
        name: 'Updated Screen Protector',
        currentQuantity: 60,
      }

      mockDb.inventoryItem.findFirst.mockResolvedValue({
        id: 'item-1',
        storeId: 'store-1',
      } as any)

      mockDb.inventoryItem.update.mockResolvedValue({
        id: 'item-1',
        storeId: 'store-1',
        name: 'Updated Screen Protector',
        currentQuantity: { toNumber: () => 60 },
        minQuantity: { toNumber: () => 10 },
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any)

      const result = await inventoryStorage.update('item-1', updateInput, 'store-1')

      expect(result).toBeDefined()
      expect(result?.name).toBe('Updated Screen Protector')
      expect(mockDb.inventoryItem.update).toHaveBeenCalled()
    })
  })

  describe('delete', () => {
    it('should delete inventory item', async () => {
      mockDb.inventoryItem.findFirst.mockResolvedValue({
        id: 'item-1',
        storeId: 'store-1',
      } as any)

      mockDb.inventoryItem.delete.mockResolvedValue({} as any)

      const result = await inventoryStorage.delete('item-1', 'store-1')

      expect(result).toBe(true)
      expect(mockDb.inventoryItem.delete).toHaveBeenCalled()
    })
  })
})

