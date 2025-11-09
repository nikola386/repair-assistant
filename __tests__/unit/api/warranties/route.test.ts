import { GET, POST } from '@/app/api/warranties/route'
import { NextRequest, NextResponse } from 'next/server'
import { warrantyStorage } from '@/lib/warrantyStorage'
import { userStorage } from '@/lib/userStorage'
import { requireAuthAndPermission } from '@/lib/api-middleware'
import { createMockNextRequest, createMockSession, createMockUser } from '../../../utils/test-helpers'

// Mock dependencies
jest.mock('@/lib/warrantyStorage')
jest.mock('@/lib/userStorage')
jest.mock('@/lib/api-middleware')
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
  generateRequestId: jest.fn(() => 'test-request-id'),
}))

const mockWarrantyStorage = warrantyStorage as jest.Mocked<typeof warrantyStorage>
const mockUserStorage = userStorage as jest.Mocked<typeof userStorage>
const mockRequireAuthAndPermission = requireAuthAndPermission as jest.MockedFunction<typeof requireAuthAndPermission>

describe('/api/warranties - GET', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return warranties successfully', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()
    const mockWarranties = [
      {
        id: 'warranty-1',
        ticketId: 'ticket-1',
        storeId: 'store-1',
        customerId: 'customer-1',
        warrantyPeriodDays: 30,
        startDate: '2024-01-01',
        expiryDate: '2024-01-31',
        warrantyType: 'both',
        status: 'active',
      },
    ]
    const mockResult = {
      warranties: mockWarranties,
      total: 1,
      page: 1,
      limit: 50,
      totalPages: 1,
    }

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)
    mockWarrantyStorage.getAll.mockResolvedValue(mockResult as any)

    const request = createMockNextRequest()
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.warranties).toHaveLength(1)
    expect(data.total).toBe(1)
    expect(mockWarrantyStorage.getAll).toHaveBeenCalledWith(mockUser.storeId, {
      search: undefined,
      status: undefined,
      page: 1,
      limit: 50,
    })
  })

  it('should filter warranties by status', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()
    const mockResult = {
      warranties: [],
      total: 0,
      page: 1,
      limit: 50,
      totalPages: 0,
    }

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)
    mockWarrantyStorage.getAll.mockResolvedValue(mockResult as any)

    const url = new URL('http://localhost:3001/api/warranties?status=active')
    const request = createMockNextRequest({ url: url.toString(), nextUrl: url })
    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(mockWarrantyStorage.getAll).toHaveBeenCalledWith(mockUser.storeId, {
      search: undefined,
      status: 'active',
      page: 1,
      limit: 50,
    })
  })
})

describe('/api/warranties - POST', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should create warranty successfully', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()
    const mockWarranty = {
      id: 'warranty-1',
      ticketId: 'ticket-1',
      storeId: 'store-1',
      customerId: 'customer-1',
      warrantyPeriodDays: 30,
      startDate: '2024-01-01',
      expiryDate: '2024-01-31',
      warrantyType: 'both',
      status: 'active',
    }
    const warrantyData = {
      ticketId: 'ticket-1',
      warrantyPeriodDays: 30,
      warrantyType: 'both',
      startDate: '2024-01-01',
    }

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)
    mockWarrantyStorage.create.mockResolvedValue(mockWarranty as any)

    const request = createMockNextRequest({
      method: 'POST',
      json: jest.fn().mockResolvedValue(warrantyData),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.warranty).toBeDefined()
    expect(data.message).toBe('Warranty created successfully')
    expect(mockWarrantyStorage.create).toHaveBeenCalled()
  })

  it('should return 400 when ticketId is missing', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()
    const warrantyData = {
      warrantyPeriodDays: 30,
      // Missing ticketId
    }

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)

    const request = createMockNextRequest({
      method: 'POST',
      json: jest.fn().mockResolvedValue(warrantyData),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Missing required field: ticketId')
    expect(mockWarrantyStorage.create).not.toHaveBeenCalled()
  })

  it('should ignore invalid warranty type', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()
    const mockWarranty = {
      id: 'warranty-1',
      ticketId: 'ticket-1',
      storeId: 'store-1',
      customerId: 'customer-1',
      warrantyPeriodDays: 30,
      startDate: '2024-01-01',
      expiryDate: '2024-01-31',
      warrantyType: 'both',
      status: 'active',
    }
    const warrantyData = {
      ticketId: 'ticket-1',
      warrantyType: 'invalid_type',
    }

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)
    mockWarrantyStorage.create.mockResolvedValue(mockWarranty as any)

    const request = createMockNextRequest({
      method: 'POST',
      json: jest.fn().mockResolvedValue(warrantyData),
    })
    const response = await POST(request)

    expect(response.status).toBe(201)
    // Invalid type should be filtered out
    expect(mockWarrantyStorage.create).toHaveBeenCalled()
  })
})

