import { ticketStorage } from '@/lib/ticketStorage'
import { db } from '@/lib/db'
import { CreateTicketInput, UpdateTicketInput } from '@/types/ticket'
import { Decimal } from '@prisma/client/runtime/library'

jest.mock('@/lib/db', () => ({
  db: {
    customer: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    repairTicket: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    ticketImage: {
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    expense: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    settings: {
      findUnique: jest.fn(),
    },
  },
}))
jest.mock('@/lib/storage', () => ({
  deleteFile: jest.fn(),
}))
jest.mock('@/lib/inventoryStorage', () => ({
  inventoryStorage: {
    adjustQuantity: jest.fn(),
  },
}))
jest.mock('@/lib/warrantyStorage', () => ({
  warrantyStorage: {
    getByTicketId: jest.fn(),
  },
}))

const mockDb = db as jest.Mocked<typeof db>

describe('ticketStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getAll', () => {
    it('should return all tickets for store', async () => {
      const mockTickets = [
        {
          id: 'ticket-1',
          ticketNumber: 'TK-001',
          customerId: 'customer-1',
          storeId: 'store-1',
          customer: {
            id: 'customer-1',
            name: 'John Doe',
            email: 'john@example.com',
            phone: '+1234567890',
          },
          deviceType: 'Smartphone',
          status: 'pending',
          priority: 'medium',
          createdAt: new Date(),
          updatedAt: new Date(),
          actualCost: null,
          estimatedCost: null,
          actualCompletionDate: null,
          estimatedCompletionDate: null,
        },
      ]

      mockDb.repairTicket.findMany.mockResolvedValue(mockTickets as any)
      mockDb.ticketImage.findMany.mockResolvedValue([])
      mockDb.expense.findMany.mockResolvedValue([])

      const result = await ticketStorage.getAll('store-1')

      expect(result).toHaveLength(1)
      expect(mockDb.repairTicket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { storeId: 'store-1' },
        })
      )
    })
  })

  describe('getById', () => {
    it('should return ticket by id', async () => {
      const mockTicket = {
        id: 'ticket-1',
        ticketNumber: 'TK-001',
        customerId: 'customer-1',
        storeId: 'store-1',
        customer: {
          id: 'customer-1',
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890',
        },
        deviceType: 'Smartphone',
        status: 'pending',
        priority: 'medium',
        createdAt: new Date(),
        updatedAt: new Date(),
        actualCost: null,
        estimatedCost: null,
        actualCompletionDate: null,
        estimatedCompletionDate: null,
      }

      mockDb.repairTicket.findFirst.mockResolvedValue(mockTicket as any)
      mockDb.ticketImage.findMany.mockResolvedValue([])
      mockDb.expense.findMany.mockResolvedValue([])

      const result = await ticketStorage.getById('ticket-1', 'store-1')

      expect(result).toBeDefined()
      expect(result?.id).toBe('ticket-1')
    })

    it('should return undefined when ticket not found', async () => {
      mockDb.repairTicket.findFirst.mockResolvedValue(null)

      const result = await ticketStorage.getById('non-existent', 'store-1')

      expect(result).toBeUndefined()
    })
  })

  describe('create', () => {
    it('should create new ticket', async () => {
      const input: CreateTicketInput = {
        customerName: 'John Doe',
        customerEmail: 'john@example.com',
        customerPhone: '+1234567890',
        deviceType: 'Smartphone',
        issueDescription: 'Screen replacement',
        priority: 'high',
      }

      mockDb.customer.findFirst.mockResolvedValue(null)
      mockDb.customer.create.mockResolvedValue({
        id: 'customer-1',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        storeId: 'store-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any)

      mockDb.repairTicket.create.mockResolvedValue({
        id: 'ticket-1',
        ticketNumber: 'TK-TEST-001',
        customerId: 'customer-1',
        storeId: 'store-1',
        deviceType: 'Smartphone',
        status: 'pending',
        priority: 'high',
        createdAt: new Date(),
        actualCost: null,
        estimatedCost: null,
        actualCompletionDate: null,
        estimatedCompletionDate: null,
      } as any)

      mockDb.repairTicket.findFirst.mockResolvedValue({
        id: 'ticket-1',
        ticketNumber: 'TK-TEST-001',
        customerId: 'customer-1',
        storeId: 'store-1',
        customer: {
          id: 'customer-1',
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890',
        },
        deviceType: 'Smartphone',
        status: 'pending',
        priority: 'high',
        createdAt: new Date(),
        updatedAt: new Date(),
        actualCost: null,
        estimatedCost: null,
        actualCompletionDate: null,
        estimatedCompletionDate: null,
      } as any)

      mockDb.ticketImage.findMany.mockResolvedValue([])
      mockDb.expense.findMany.mockResolvedValue([])

      const result = await ticketStorage.create(input, 'store-1')

      expect(result).toBeDefined()
      expect(result.ticketNumber).toContain('TK-')
      expect(mockDb.repairTicket.create).toHaveBeenCalled()
    })

    it('should use existing customer when found', async () => {
      const input: CreateTicketInput = {
        customerName: 'John Doe',
        customerEmail: 'john@example.com',
        customerPhone: '+1234567890',
        deviceType: 'Smartphone',
        issueDescription: 'Screen replacement',
      }

      mockDb.customer.findFirst.mockResolvedValue({
        id: 'existing-customer-1',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        storeId: 'store-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any)

      mockDb.customer.update.mockResolvedValue({} as any)
      mockDb.repairTicket.create.mockResolvedValue({
        id: 'ticket-1',
        ticketNumber: 'TK-TEST-001',
        customerId: 'existing-customer-1',
        storeId: 'store-1',
        deviceType: 'Smartphone',
        status: 'pending',
        priority: 'medium',
        createdAt: new Date(),
        actualCost: null,
        estimatedCost: null,
        actualCompletionDate: null,
        estimatedCompletionDate: null,
      } as any)

      mockDb.repairTicket.findFirst.mockResolvedValue({
        id: 'ticket-1',
        ticketNumber: 'TK-TEST-001',
        customerId: 'existing-customer-1',
        storeId: 'store-1',
        customer: {
          id: 'existing-customer-1',
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890',
        },
        deviceType: 'Smartphone',
        status: 'pending',
        priority: 'medium',
        createdAt: new Date(),
        updatedAt: new Date(),
        actualCost: null,
        estimatedCost: null,
        actualCompletionDate: null,
        estimatedCompletionDate: null,
      } as any)

      mockDb.ticketImage.findMany.mockResolvedValue([])
      mockDb.expense.findMany.mockResolvedValue([])

      await ticketStorage.create(input, 'store-1')

      expect(mockDb.customer.update).toHaveBeenCalled()
      expect(mockDb.customer.create).not.toHaveBeenCalled()
    })
  })

  describe('update', () => {
    it('should update ticket', async () => {
      const updateInput: UpdateTicketInput = {
        status: 'completed',
        actualCost: 100.00,
      }

      const mockActualCost = new Decimal(100.00)

      mockDb.repairTicket.findFirst.mockResolvedValue({
        id: 'ticket-1',
        ticketNumber: 'TK-001',
        customerId: 'customer-1',
        storeId: 'store-1',
        customer: {
          id: 'customer-1',
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890',
        },
        deviceType: 'Smartphone',
        status: 'completed',
        priority: 'medium',
        createdAt: new Date(),
        updatedAt: new Date(),
        actualCost: mockActualCost,
        estimatedCost: null,
        actualCompletionDate: null,
        estimatedCompletionDate: null,
      } as any)

      mockDb.repairTicket.update.mockResolvedValue({
        id: 'ticket-1',
        ticketNumber: 'TK-001',
        customerId: 'customer-1',
        storeId: 'store-1',
        customer: {
          id: 'customer-1',
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890',
        },
        deviceType: 'Smartphone',
        status: 'completed',
        priority: 'medium',
        createdAt: new Date(),
        updatedAt: new Date(),
        actualCost: mockActualCost,
        estimatedCost: null,
        actualCompletionDate: null,
        estimatedCompletionDate: null,
      } as any)

      mockDb.ticketImage.findMany.mockResolvedValue([])
      mockDb.expense.findMany.mockResolvedValue([])

      const result = await ticketStorage.update('ticket-1', updateInput, 'store-1')

      expect(result).toBeDefined()
      expect(result?.status).toBe('completed')
      expect(mockDb.repairTicket.update).toHaveBeenCalled()
    })
  })

  describe('delete', () => {
    it('should delete ticket', async () => {
      mockDb.repairTicket.findFirst.mockResolvedValue({
        id: 'ticket-1',
        ticketNumber: 'TK-001',
        customerId: 'customer-1',
        storeId: 'store-1',
        customer: {
          id: 'customer-1',
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890',
        },
        deviceType: 'Smartphone',
        status: 'pending',
        priority: 'medium',
        createdAt: new Date(),
        updatedAt: new Date(),
        actualCost: null,
        estimatedCost: null,
        actualCompletionDate: null,
        estimatedCompletionDate: null,
      } as any)

      mockDb.ticketImage.findMany.mockResolvedValue([])
      mockDb.repairTicket.delete.mockResolvedValue({} as any)

      const result = await ticketStorage.delete('ticket-1', 'store-1')

      expect(result).toBe(true)
      expect(mockDb.repairTicket.delete).toHaveBeenCalled()
    })

    it('should return false when ticket not found', async () => {
      mockDb.repairTicket.findFirst.mockResolvedValue(null)

      const result = await ticketStorage.delete('non-existent', 'store-1')

      expect(result).toBe(false)
      expect(mockDb.repairTicket.delete).not.toHaveBeenCalled()
    })
  })
})

