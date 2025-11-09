import { GET } from '@/app/api/dashboard/stats/route'
import { NextRequest, NextResponse } from 'next/server'
import { userStorage } from '@/lib/userStorage'
import { withAuth } from '@/lib/auth.middleware'
import { db } from '@/lib/db'
import { createMockNextRequest, createMockSession, createMockUser } from '../../../utils/test-helpers'

jest.mock('@/lib/userStorage')
jest.mock('@/lib/auth.middleware')
jest.mock('@/lib/db', () => ({
  db: {
    repairTicket: {
      findMany: jest.fn(),
    },
    customer: {
      count: jest.fn(),
    },
    inventoryItem: {
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

const mockUserStorage = userStorage as jest.Mocked<typeof userStorage>
const mockWithAuth = withAuth as jest.MockedFunction<typeof withAuth>
const mockDb = db as jest.Mocked<typeof db>

describe('/api/dashboard/stats - GET', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return dashboard stats successfully', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()

    mockWithAuth.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.getStoreId.mockResolvedValue(mockUser.storeId)
    mockDb.repairTicket.findMany.mockResolvedValue([])
    mockDb.customer.count.mockResolvedValue(0)
    mockDb.inventoryItem.findMany.mockResolvedValue([])

    const request = createMockNextRequest()
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveProperty('totalRepairs')
    expect(data).toHaveProperty('income')
    expect(data).toHaveProperty('expenses')
    expect(data).toHaveProperty('grossProfit')
    expect(data).toHaveProperty('chartData')
  })

  it('should handle different time periods', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()

    mockWithAuth.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.getStoreId.mockResolvedValue(mockUser.storeId)
    mockDb.repairTicket.findMany.mockResolvedValue([])
    mockDb.customer.count.mockResolvedValue(0)
    mockDb.inventoryItem.findMany.mockResolvedValue([])

    const periods = ['7d', '30d', '180d', '360d']
    for (const period of periods) {
      const url = new URL(`http://localhost:3001/api/dashboard/stats?period=${period}`)
      const request = createMockNextRequest({ url: url.toString(), nextUrl: url })
      const response = await GET(request)
      expect(response.status).toBe(200)
    }
  })

  it('should return 404 when store not found', async () => {
    const mockSession = createMockSession()

    mockWithAuth.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.getStoreId.mockResolvedValue(null)

    const request = createMockNextRequest()
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('User store not found')
  })

  it('should handle errors gracefully and return default stats', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()

    mockWithAuth.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.getStoreId.mockResolvedValue(mockUser.storeId)
    mockDb.repairTicket.findMany.mockRejectedValue(new Error('Database error'))

    const request = createMockNextRequest()
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.totalRepairs).toBe(0)
    expect(data.income).toBe(0)
  })
})

