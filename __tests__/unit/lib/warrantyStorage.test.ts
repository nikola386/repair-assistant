import { warrantyStorage } from '@/lib/warrantyStorage'
import { db } from '@/lib/db'
import { CreateWarrantyInput, UpdateWarrantyInput } from '@/types/warranty'

jest.mock('@/lib/db', () => ({
  db: {
    warranty: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    repairTicket: {
      findFirst: jest.fn(),
    },
    settings: {
      findUnique: jest.fn(),
    },
  },
}))

const mockDb = db as jest.Mocked<typeof db>

describe('warrantyStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('create', () => {
    it('should create warranty for ticket', async () => {
      const input: CreateWarrantyInput = {
        ticketId: 'ticket-1',
        warrantyPeriodDays: 30,
        warrantyType: 'both',
      }

      const mockTicket = {
        id: 'ticket-1',
        customerId: 'customer-1',
        storeId: 'store-1',
        actualCompletionDate: new Date(),
        customer: {
          id: 'customer-1',
          name: 'John Doe',
        },
      }

      const mockSettings = {
        defaultWarrantyPeriodDays: 30,
      }

      mockDb.repairTicket.findFirst.mockResolvedValue(mockTicket as any)
      mockDb.warranty.findUnique.mockResolvedValue(null)
      mockDb.settings.findUnique.mockResolvedValue(mockSettings as any)

      const mockWarranty = {
        id: 'warranty-1',
        ticketId: 'ticket-1',
        storeId: 'store-1',
        customerId: 'customer-1',
        warrantyPeriodDays: 30,
        startDate: new Date(),
        expiryDate: new Date(),
        warrantyType: 'both',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        ticket: mockTicket,
        customer: mockTicket.customer,
        warrantyClaims: [],
      }

      mockDb.warranty.create.mockResolvedValue(mockWarranty as any)

      const result = await warrantyStorage.create(input, 'store-1')

      expect(result).toBeDefined()
      expect(result.ticketId).toBe('ticket-1')
      expect(mockDb.warranty.create).toHaveBeenCalled()
    })

    it('should throw error when ticket not found', async () => {
      const input: CreateWarrantyInput = {
        ticketId: 'non-existent',
      }

      mockDb.repairTicket.findFirst.mockResolvedValue(null)

      await expect(warrantyStorage.create(input, 'store-1')).rejects.toThrow(
        'Ticket not found'
      )
    })

    it('should throw error when warranty already exists', async () => {
      const input: CreateWarrantyInput = {
        ticketId: 'ticket-1',
      }

      const mockTicket = {
        id: 'ticket-1',
        customerId: 'customer-1',
        storeId: 'store-1',
        customer: { id: 'customer-1' },
      }

      mockDb.repairTicket.findFirst.mockResolvedValue(mockTicket as any)
      mockDb.warranty.findUnique.mockResolvedValue({
        id: 'existing-warranty',
      } as any)

      await expect(warrantyStorage.create(input, 'store-1')).rejects.toThrow(
        'Warranty already exists'
      )
    })
  })

  describe('getById', () => {
    it('should return warranty by id', async () => {
      const mockWarranty = {
        id: 'warranty-1',
        ticketId: 'ticket-1',
        storeId: 'store-1',
        customerId: 'customer-1',
        warrantyPeriodDays: 30,
        startDate: new Date(),
        expiryDate: new Date(),
        warrantyType: 'both',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        ticket: { id: 'ticket-1' },
        customer: { id: 'customer-1' },
        warrantyClaims: [],
      }

      mockDb.warranty.findFirst.mockResolvedValue(mockWarranty as any)
      mockDb.warranty.findUnique.mockResolvedValue(mockWarranty as any)
      mockDb.warranty.update.mockResolvedValue(mockWarranty as any)

      const result = await warrantyStorage.getById('warranty-1', 'store-1')

      expect(result).toBeDefined()
      expect(result?.id).toBe('warranty-1')
    })

    it('should return undefined when warranty not found', async () => {
      mockDb.warranty.findFirst.mockResolvedValue(null)

      const result = await warrantyStorage.getById('non-existent', 'store-1')

      expect(result).toBeUndefined()
    })
  })

  describe('getAll', () => {
    it('should return paginated warranties', async () => {
      const mockWarranties = [
        {
          id: 'warranty-1',
          ticketId: 'ticket-1',
          storeId: 'store-1',
          customerId: 'customer-1',
          warrantyPeriodDays: 30,
          startDate: new Date(),
          expiryDate: new Date(),
          warrantyType: 'both',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
          ticket: { id: 'ticket-1' },
          customer: { id: 'customer-1' },
          warrantyClaims: [],
        },
      ]

      mockDb.warranty.findMany.mockResolvedValue(mockWarranties as any)
      mockDb.warranty.count.mockResolvedValue(1)

      const result = await warrantyStorage.getAll('store-1', {
        page: 1,
        limit: 10,
      })

      expect(result.warranties).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(result.page).toBe(1)
    })

    it('should filter by status', async () => {
      mockDb.warranty.findMany.mockResolvedValue([])
      mockDb.warranty.count.mockResolvedValue(0)

      await warrantyStorage.getAll('store-1', {
        status: 'active',
        page: 1,
        limit: 10,
      })

      expect(mockDb.warranty.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'active',
          }),
        })
      )
    })
  })

  describe('update', () => {
    it('should update warranty', async () => {
      const updateInput: UpdateWarrantyInput = {
        status: 'expired',
        notes: 'Updated notes',
      }

      const mockWarranty = {
        id: 'warranty-1',
        ticketId: 'ticket-1',
        storeId: 'store-1',
        customerId: 'customer-1',
        warrantyPeriodDays: 30,
        startDate: new Date(),
        expiryDate: new Date(),
        warrantyType: 'both',
        status: 'expired',
        notes: 'Updated notes',
        createdAt: new Date(),
        updatedAt: new Date(),
        ticket: { id: 'ticket-1' },
        customer: { id: 'customer-1' },
        warrantyClaims: [],
      }

      mockDb.warranty.findFirst.mockResolvedValue({
        id: 'warranty-1',
        storeId: 'store-1',
        startDate: new Date(),
      } as any)

      mockDb.warranty.update.mockResolvedValue(mockWarranty as any)
      mockDb.warranty.findUnique.mockResolvedValue(mockWarranty as any)

      const result = await warrantyStorage.update('warranty-1', updateInput, 'store-1')

      expect(result).toBeDefined()
      expect(result?.status).toBe('expired')
      expect(mockDb.warranty.update).toHaveBeenCalled()
    })
  })
})

