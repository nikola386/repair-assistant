import { GET } from '@/app/api/customers/route'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuthAndPermission } from '@/lib/api-middleware'
import { userStorage } from '@/lib/userStorage'
import { db } from '@/lib/db'
import { createMockNextRequest, createMockSession, createMockUser } from '../../../utils/test-helpers'

// Mock dependencies
jest.mock('@/lib/api-middleware')
jest.mock('@/lib/userStorage')
jest.mock('@/lib/db', () => ({
  db: {
    customer: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
  },
}))
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
  generateRequestId: jest.fn(() => 'test-request-id'),
}))

const mockRequireAuthAndPermission = requireAuthAndPermission as jest.MockedFunction<typeof requireAuthAndPermission>
const mockUserStorage = userStorage as jest.Mocked<typeof userStorage>
const mockDb = db as jest.Mocked<typeof db>

describe('/api/customers - GET', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return customers successfully', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()
    const mockCustomers = [
      {
        id: 'customer-1',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { repairTickets: 5 },
      },
      {
        id: 'customer-2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '+0987654321',
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { repairTickets: 2 },
      },
    ]

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)
    mockDb.customer.count.mockResolvedValue(2)
    mockDb.customer.findMany.mockResolvedValue(mockCustomers as any)

    const request = createMockNextRequest()
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.customers).toHaveLength(2)
    expect(data.total).toBe(2)
    expect(data.page).toBe(1)
    expect(data.limit).toBe(20)
    expect(mockDb.customer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { storeId: mockUser.storeId },
        skip: 0,
        take: 20,
      })
    )
  })

  it('should filter customers by search term', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()
    const mockCustomers = [
      {
        id: 'customer-1',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { repairTickets: 5 },
      },
    ]

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)
    mockDb.customer.count.mockResolvedValue(1)
    mockDb.customer.findMany.mockResolvedValue(mockCustomers as any)

    const url = new URL('http://localhost:3001/api/customers?search=john')
    const request = createMockNextRequest({ url: url.toString(), nextUrl: url })
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.customers).toHaveLength(1)
    expect(mockDb.customer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          storeId: mockUser.storeId,
          OR: [
            { name: { contains: 'john', mode: 'insensitive' } },
            { email: { contains: 'john', mode: 'insensitive' } },
            { phone: { contains: 'john', mode: 'insensitive' } },
          ],
        },
      })
    )
  })

  it('should handle pagination correctly', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)
    mockDb.customer.count.mockResolvedValue(50)
    mockDb.customer.findMany.mockResolvedValue([])

    const url = new URL('http://localhost:3001/api/customers?page=2&limit=10')
    const request = createMockNextRequest({ url: url.toString(), nextUrl: url })
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.page).toBe(2)
    expect(data.limit).toBe(10)
    expect(data.totalPages).toBe(5)
    expect(mockDb.customer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
      })
    )
  })

  it('should return 401 when unauthorized', async () => {
    mockRequireAuthAndPermission.mockResolvedValue({
      session: null,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) as any,
    })

    const request = createMockNextRequest()
    const response = await GET(request)

    expect(response.status).toBe(401)
    expect(mockDb.customer.findMany).not.toHaveBeenCalled()
  })

  it('should return 404 when user store not found', async () => {
    const mockSession = createMockSession()

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(null)

    const request = createMockNextRequest()
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('User store not found')
  })

  it('should handle server errors', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)
    mockDb.customer.count.mockRejectedValue(new Error('Database error'))

    const request = createMockNextRequest()
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })
})

