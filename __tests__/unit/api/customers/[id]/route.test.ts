import { GET } from '@/app/api/customers/[id]/route'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuthAndPermission } from '@/lib/api-middleware'
import { userStorage } from '@/lib/userStorage'
import { db } from '@/lib/db'
import { ticketStorage } from '@/lib/ticketStorage'
import { createMockNextRequest, createMockSession, createMockUser } from '../../../../utils/test-helpers'

jest.mock('@/lib/api-middleware')
jest.mock('@/lib/userStorage')
jest.mock('@/lib/db', () => ({
  db: {
    customer: {
      findFirst: jest.fn(),
    },
    repairTicket: {
      findMany: jest.fn(),
    },
  },
}))
jest.mock('@/lib/ticketStorage')
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
const mockTicketStorage = ticketStorage as jest.Mocked<typeof ticketStorage>

describe('/api/customers/[id] - GET', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return customer with tickets', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()
    const mockCustomer = {
      id: 'customer-1',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890',
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: {
        repairTickets: 2,
      },
    }
    const mockTickets = [
      {
        id: 'ticket-1',
        ticketNumber: 'TK-001',
        customerId: 'customer-1',
        customer: {
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

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)
    mockDb.customer.findFirst.mockResolvedValue(mockCustomer as any)
    mockDb.repairTicket.findMany.mockResolvedValue(mockTickets as any)
    mockTicketStorage.getImagesByTicketId.mockResolvedValue([])

    const request = createMockNextRequest()
    const params = { id: 'customer-1' }
    const response = await GET(request, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.customer).toBeDefined()
    expect(data.customer.id).toBe('customer-1')
    expect(data.tickets).toBeDefined()
    expect(Array.isArray(data.tickets)).toBe(true)
  })

  it('should return 404 when customer not found', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)
    mockDb.customer.findFirst.mockResolvedValue(null)

    const request = createMockNextRequest()
    const params = { id: 'non-existent-id' }
    const response = await GET(request, { params })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Customer not found')
  })

  it('should return 401 when unauthorized', async () => {
    mockRequireAuthAndPermission.mockResolvedValue({
      session: null,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) as any,
    })

    const request = createMockNextRequest()
    const params = { id: 'customer-1' }
    const response = await GET(request, { params })

    expect(response.status).toBe(401)
  })
})

