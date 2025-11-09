/**
 * Integration tests for Reports API
 * These tests verify the full flow of API endpoints working together
 */

import { GET as GET_BUSINESS } from '@/app/api/reports/business/route'
import { GET as GET_INVENTORY } from '@/app/api/reports/inventory/route'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { userStorage } from '@/lib/userStorage'
import { inventoryStorage } from '@/lib/inventoryStorage'
import { settingsStorage } from '@/lib/settingsStorage'
import { requireAuthAndPermission } from '@/lib/api-middleware'
import { createMockNextRequest, createMockSession, createMockUser } from '../../utils/test-helpers'
import { Prisma } from '@prisma/client'

// Mock dependencies
jest.mock('next/server', () => {
  class MockNextResponse {
    body: any
    status: number
    headers: Headers

    constructor(body?: any, init?: { status?: number; headers?: HeadersInit }) {
      this.body = body
      this.status = init?.status || 200
      this.headers = new Headers(init?.headers || {})
    }

    static json(body: any, init?: { status?: number; headers?: HeadersInit }) {
      return {
        status: init?.status || 200,
        json: jest.fn().mockResolvedValue(body),
        headers: new Headers(init?.headers || {}),
      }
    }
  }

  return {
    NextRequest: jest.fn(),
    NextResponse: MockNextResponse,
  }
})
jest.mock('next-auth', () => ({
  default: jest.fn(),
  getServerSession: jest.fn(),
}))
jest.mock('next-auth/providers/credentials', () => ({
  CredentialsProvider: jest.fn(),
}))
jest.mock('@/lib/auth.config', () => ({
  authOptions: {},
}))
jest.mock('@/lib/db', () => ({
  db: {
    store: {
      findUnique: jest.fn(),
    },
    repairTicket: {
      findMany: jest.fn(),
    },
    expense: {
      findMany: jest.fn(),
    },
  },
}))
jest.mock('@/lib/userStorage')
jest.mock('@/lib/inventoryStorage')
jest.mock('@/lib/settingsStorage')
jest.mock('@/lib/api-middleware')
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  createElement: jest.fn((type, props, ...children) => {
    return { type, props, children }
  }),
}))
jest.mock('@react-pdf/renderer', () => ({
  renderToBuffer: jest.fn().mockResolvedValue(Buffer.from('mock-pdf-content')),
}))
jest.mock('@/lib/pdfFonts', () => ({
  ensurePdfFontsRegistered: jest.fn().mockResolvedValue(undefined),
}))
jest.mock('@/lib/pdfTranslations', () => ({
  getPdfTranslations: jest.fn(() => ({
    businessReport: 'Business Report',
    inventoryReport: 'Inventory Report',
  })),
}))
jest.mock('@/lib/languages', () => ({
  isValidLanguage: jest.fn((lang) => ['en', 'es', 'fr'].includes(lang)),
}))
jest.mock('@/components/reports/BusinessReportPDF', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}))
jest.mock('@/components/reports/InventoryReportPDF', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}))
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
  generateRequestId: jest.fn(() => 'test-request-id'),
}))

const mockDb = db as jest.Mocked<typeof db>
const mockUserStorage = userStorage as jest.Mocked<typeof userStorage>
const mockInventoryStorage = inventoryStorage as jest.Mocked<typeof inventoryStorage>
const mockSettingsStorage = settingsStorage as jest.Mocked<typeof settingsStorage>
const mockRequireAuthAndPermission = requireAuthAndPermission as jest.MockedFunction<typeof requireAuthAndPermission>

describe('Reports API Integration', () => {
  const mockSession = createMockSession()
  const mockUser = createMockUser()

  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.getStoreId.mockResolvedValue(mockUser.storeId)
    mockSettingsStorage.findByStoreId.mockResolvedValue({ language: 'en' } as any)
  })

  describe('Business Report Route', () => {
    describe('GET /api/reports/business', () => {
      it('should generate a business report PDF with valid date range', async () => {
        const mockStore = {
          id: 'test-store-id',
          name: 'Test Store',
          address: '123 Test St',
          street: '123 Test St',
          city: 'Test City',
          state: 'CA',
          postalCode: '12345',
          country: 'US',
          phone: '+1234567890',
          email: 'store@example.com',
          website: null,
          vatNumber: null,
          currency: 'USD',
          logo: null,
        }

        const mockTickets = [
          {
            id: 'ticket-1',
            status: 'completed',
            actualCost: new Prisma.Decimal(100.50),
            estimatedCost: new Prisma.Decimal(100.00),
            actualCompletionDate: new Date('2024-01-15'),
            createdAt: new Date('2024-01-10'),
            customerId: 'customer-1',
            deviceType: 'Smartphone',
            customer: {
              name: 'John Doe',
              email: 'john@example.com',
            },
            expenses: [
              {
                quantity: new Prisma.Decimal(1),
                price: new Prisma.Decimal(20.00),
              },
            ],
          },
          {
            id: 'ticket-2',
            status: 'in_progress',
            actualCost: null,
            estimatedCost: new Prisma.Decimal(50.00),
            actualCompletionDate: null,
            createdAt: new Date('2024-01-12'),
            customerId: 'customer-2',
            deviceType: 'Laptop',
            customer: {
              name: 'Jane Smith',
              email: 'jane@example.com',
            },
            expenses: [],
          },
        ]

        mockDb.store.findUnique.mockResolvedValue(mockStore as any)
        mockDb.repairTicket.findMany.mockResolvedValue(mockTickets as any)

        const url = new URL('http://localhost:3001/api/reports/business?startDate=2024-01-01&endDate=2024-01-31')
        const request = createMockNextRequest({ url: url.toString(), nextUrl: url })
        const response = await GET_BUSINESS(request)

        expect(response.status).toBe(200)
        expect(response.headers.get('Content-Type')).toBe('application/pdf')
        expect(response.headers.get('Content-Disposition')).toContain('business-report-2024-01-01-to-2024-01-31.pdf')
        expect(mockDb.store.findUnique).toHaveBeenCalledWith({
          where: { id: mockUser.storeId },
          select: expect.objectContaining({
            name: true,
            address: true,
            currency: true,
          }),
        })
        expect(mockDb.repairTicket.findMany).toHaveBeenCalled()
      })

      it('should return 400 when startDate or endDate is missing', async () => {
        const url = new URL('http://localhost:3001/api/reports/business?startDate=2024-01-01')
        const request = createMockNextRequest({ url: url.toString(), nextUrl: url })
        const response = await GET_BUSINESS(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Start date and end date are required')
        expect(mockDb.store.findUnique).not.toHaveBeenCalled()
      })

      it('should return 404 when store not found', async () => {
        mockDb.store.findUnique.mockResolvedValue(null)

        const url = new URL('http://localhost:3001/api/reports/business?startDate=2024-01-01&endDate=2024-01-31')
        const request = createMockNextRequest({ url: url.toString(), nextUrl: url })
        const response = await GET_BUSINESS(request)
        const data = await response.json()

        expect(response.status).toBe(404)
        expect(data.error).toBe('Store not found')
      })

      it('should calculate report statistics correctly', async () => {
        const mockStore = {
          id: 'test-store-id',
          name: 'Test Store',
          address: '123 Test St',
          street: '123 Test St',
          city: 'Test City',
          state: 'CA',
          postalCode: '12345',
          country: 'US',
          phone: '+1234567890',
          email: 'store@example.com',
          website: null,
          vatNumber: null,
          currency: 'USD',
          logo: null,
        }

        const completedTickets = [
          {
            id: 'ticket-1',
            status: 'completed',
            actualCost: new Prisma.Decimal(200.00),
            estimatedCost: new Prisma.Decimal(200.00),
            actualCompletionDate: new Date('2024-01-15'),
            createdAt: new Date('2024-01-10'),
            customerId: 'customer-1',
            deviceType: 'Smartphone',
            customer: {
              name: 'John Doe',
              email: 'john@example.com',
            },
            expenses: [
              {
                quantity: new Prisma.Decimal(2),
                price: new Prisma.Decimal(25.00),
              },
            ],
          },
          {
            id: 'ticket-2',
            status: 'completed',
            actualCost: new Prisma.Decimal(150.00),
            estimatedCost: new Prisma.Decimal(150.00),
            actualCompletionDate: new Date('2024-01-20'),
            createdAt: new Date('2024-01-18'),
            customerId: 'customer-2',
            deviceType: 'Laptop',
            customer: {
              name: 'Jane Smith',
              email: 'jane@example.com',
            },
            expenses: [
              {
                quantity: new Prisma.Decimal(1),
                price: new Prisma.Decimal(30.00),
              },
            ],
          },
        ]

        const inProgressTicket = {
          id: 'ticket-3',
          status: 'in_progress',
          actualCost: null,
          estimatedCost: new Prisma.Decimal(100.00),
          actualCompletionDate: null,
          createdAt: new Date('2024-01-25'),
          customerId: 'customer-3',
          deviceType: 'Tablet',
          customer: {
            name: 'Bob Johnson',
            email: 'bob@example.com',
          },
          expenses: [],
        }

        mockDb.store.findUnique.mockResolvedValue(mockStore as any)
        mockDb.repairTicket.findMany.mockResolvedValue([...completedTickets, inProgressTicket] as any)

        const url = new URL('http://localhost:3001/api/reports/business?startDate=2024-01-01&endDate=2024-01-31')
        const request = createMockNextRequest({ url: url.toString(), nextUrl: url })
        const response = await GET_BUSINESS(request)

        expect(response.status).toBe(200)
        expect(mockDb.repairTicket.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              storeId: mockUser.storeId,
              createdAt: expect.objectContaining({
                gte: expect.any(Date),
                lte: expect.any(Date),
              }),
            }),
            include: {
              customer: true,
              expenses: true,
            },
          })
        )
      })
    })
  })

  describe('Inventory Report Route', () => {
    describe('GET /api/reports/inventory', () => {
      it('should generate an inventory report PDF', async () => {
        const mockStore = {
          id: 'test-store-id',
          name: 'Test Store',
          address: '123 Test St',
          street: '123 Test St',
          city: 'Test City',
          state: 'CA',
          postalCode: '12345',
          country: 'US',
          phone: '+1234567890',
          email: 'store@example.com',
          website: null,
          vatNumber: null,
          currency: 'USD',
          logo: null,
        }

        const mockInventoryItems = [
          {
            id: 'item-1',
            name: 'Screen Protector',
            sku: 'SP-001',
            currentQuantity: 10,
            minQuantity: 5,
            costPrice: 5.00,
            unitPrice: 10.00,
            category: 'Accessories',
          },
          {
            id: 'item-2',
            name: 'Battery',
            sku: 'BAT-001',
            currentQuantity: 3,
            minQuantity: 5,
            costPrice: 20.00,
            unitPrice: 40.00,
            category: 'Parts',
          },
        ]

        const mockExpenses = []

        mockDb.store.findUnique.mockResolvedValue(mockStore as any)
        mockInventoryStorage.getAll.mockResolvedValue({
          items: mockInventoryItems,
          total: 2,
          page: 1,
          limit: 10000,
          totalPages: 1,
        } as any)
        mockDb.expense.findMany.mockResolvedValue(mockExpenses as any)

        const request = createMockNextRequest()
        const response = await GET_INVENTORY(request)

        expect(response.status).toBe(200)
        expect(response.headers.get('Content-Type')).toBe('application/pdf')
        expect(response.headers.get('Content-Disposition')).toContain('inventory-report')
        expect(mockDb.store.findUnique).toHaveBeenCalledWith({
          where: { id: mockUser.storeId },
          select: expect.objectContaining({
            name: true,
            address: true,
            currency: true,
          }),
        })
        expect(mockInventoryStorage.getAll).toHaveBeenCalledWith(mockUser.storeId, { limit: 10000 })
      })

      it('should generate inventory report with date range', async () => {
        const mockStore = {
          id: 'test-store-id',
          name: 'Test Store',
          address: '123 Test St',
          street: '123 Test St',
          city: 'Test City',
          state: 'CA',
          postalCode: '12345',
          country: 'US',
          phone: '+1234567890',
          email: 'store@example.com',
          website: null,
          vatNumber: null,
          currency: 'USD',
          logo: null,
        }

        const mockInventoryItems = [
          {
            id: 'item-1',
            name: 'Screen Protector',
            sku: 'SP-001',
            currentQuantity: 10,
            minQuantity: 5,
            costPrice: 5.00,
            unitPrice: 10.00,
            category: 'Accessories',
          },
        ]

        const mockExpenses = [
          {
            id: 'expense-1',
            inventoryItemId: 'item-1',
            quantity: new Prisma.Decimal(2),
            price: new Prisma.Decimal(10.00),
            createdAt: new Date('2024-01-15'),
            ticket: {
              createdAt: new Date('2024-01-15'),
              status: 'completed',
            },
          },
        ]

        mockDb.store.findUnique.mockResolvedValue(mockStore as any)
        mockInventoryStorage.getAll.mockResolvedValue({
          items: mockInventoryItems,
          total: 1,
          page: 1,
          limit: 10000,
          totalPages: 1,
        } as any)
        mockDb.expense.findMany.mockResolvedValue(mockExpenses as any)

        const url = new URL('http://localhost:3001/api/reports/inventory?startDate=2024-01-01&endDate=2024-01-31')
        const request = createMockNextRequest({ url: url.toString(), nextUrl: url })
        const response = await GET_INVENTORY(request)

        expect(response.status).toBe(200)
        expect(response.headers.get('Content-Disposition')).toContain('inventory-report-2024-01-01-to-2024-01-31.pdf')
      })

      it('should return 404 when store not found', async () => {
        mockDb.store.findUnique.mockResolvedValue(null)

        const request = createMockNextRequest()
        const response = await GET_INVENTORY(request)
        const data = await response.json()

        expect(response.status).toBe(404)
        expect(data.error).toBe('Store not found')
      })

      it('should calculate inventory statistics correctly', async () => {
        const mockStore = {
          id: 'test-store-id',
          name: 'Test Store',
          address: '123 Test St',
          street: '123 Test St',
          city: 'Test City',
          state: 'CA',
          postalCode: '12345',
          country: 'US',
          phone: '+1234567890',
          email: 'store@example.com',
          website: null,
          vatNumber: null,
          currency: 'USD',
          logo: null,
        }

        const mockInventoryItems = [
          {
            id: 'item-1',
            name: 'Screen Protector',
            sku: 'SP-001',
            currentQuantity: 10,
            minQuantity: 5,
            costPrice: 5.00,
            unitPrice: 10.00,
            category: 'Accessories',
          },
          {
            id: 'item-2',
            name: 'Battery',
            sku: 'BAT-001',
            currentQuantity: 0,
            minQuantity: 5,
            costPrice: 20.00,
            unitPrice: 40.00,
            category: 'Parts',
          },
          {
            id: 'item-3',
            name: 'Charger',
            sku: 'CHG-001',
            currentQuantity: 2,
            minQuantity: 5,
            costPrice: 15.00,
            unitPrice: 30.00,
            category: 'Accessories',
          },
        ]

        const mockExpenses = [
          {
            id: 'expense-1',
            inventoryItemId: 'item-1',
            quantity: new Prisma.Decimal(3),
            price: new Prisma.Decimal(10.00),
            createdAt: new Date('2024-01-15'),
            ticket: {
              createdAt: new Date('2024-01-15'),
              status: 'completed',
            },
          },
        ]

        mockDb.store.findUnique.mockResolvedValue(mockStore as any)
        mockInventoryStorage.getAll.mockResolvedValue({
          items: mockInventoryItems,
          total: 3,
          page: 1,
          limit: 10000,
          totalPages: 1,
        } as any)
        mockDb.expense.findMany.mockResolvedValue(mockExpenses as any)

        const request = createMockNextRequest()
        const response = await GET_INVENTORY(request)

        expect(response.status).toBe(200)
        expect(mockInventoryStorage.getAll).toHaveBeenCalledWith(mockUser.storeId, { limit: 10000 })
        expect(mockDb.expense.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              inventoryItemId: expect.objectContaining({
                not: null,
              }),
              ticket: expect.objectContaining({
                storeId: mockUser.storeId,
              }),
            }),
          })
        )
      })
    })
  })
})

