import { GET, POST } from '@/app/api/tickets/route'
import { NextRequest, NextResponse } from 'next/server'
import { ticketStorage } from '@/lib/ticketStorage'
import { userStorage } from '@/lib/userStorage'
import { requireAuthAndPermission } from '@/lib/api-middleware'
import { createMockNextRequest, createMockSession, createMockUser, createMockTicket } from '../../../utils/test-helpers'

// Mock dependencies
jest.mock('@/lib/ticketStorage')
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

const mockTicketStorage = ticketStorage as jest.Mocked<typeof ticketStorage>
const mockUserStorage = userStorage as jest.Mocked<typeof userStorage>
const mockRequireAuthAndPermission = requireAuthAndPermission as jest.MockedFunction<typeof requireAuthAndPermission>

describe('/api/tickets - GET', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return tickets successfully', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()
    const mockTickets = [createMockTicket(), createMockTicket({ id: 'ticket-2' })]

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)
    mockTicketStorage.getAll.mockResolvedValue(mockTickets as any)

    const request = createMockNextRequest()
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.tickets).toHaveLength(2)
    expect(mockTicketStorage.getAll).toHaveBeenCalledWith(mockUser.storeId)
  })

  it('should return paginated tickets with filters', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()
    const mockPaginatedResult = {
      tickets: [createMockTicket()],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    }

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)
    mockTicketStorage.getPaginated.mockResolvedValue(mockPaginatedResult as any)

    const url = new URL('http://localhost:3001/api/tickets?page=1&limit=10&status=pending&search=test')
    const request = createMockNextRequest({ url: url.toString(), nextUrl: url })
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.tickets).toHaveLength(1)
    expect(data.total).toBe(1)
    expect(mockTicketStorage.getPaginated).toHaveBeenCalledWith(
      mockUser.storeId,
      1,
      10,
      'test',
      'pending',
      undefined
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
    expect(mockTicketStorage.getAll).not.toHaveBeenCalled()
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
})

describe('/api/tickets - POST', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should create ticket successfully', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()
    const mockTicket = createMockTicket()
    const ticketData = {
      customerName: 'John Doe',
      customerEmail: 'john@example.com',
      customerPhone: '+1234567890',
      deviceType: 'Smartphone',
      deviceBrand: 'Apple',
      deviceModel: 'iPhone 13',
      issueDescription: 'Screen replacement',
      priority: 'high',
    }

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)
    mockTicketStorage.create.mockResolvedValue(mockTicket as any)

    const request = createMockNextRequest({
      method: 'POST',
      json: jest.fn().mockResolvedValue(ticketData),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.ticket).toBeDefined()
    expect(data.message).toBe('Ticket created successfully')
    expect(mockTicketStorage.create).toHaveBeenCalled()
  })

  it('should return 400 when required fields are missing', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()
    const ticketData = {
      customerName: 'John Doe',
      // Missing required fields
    }

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)

    const request = createMockNextRequest({
      method: 'POST',
      json: jest.fn().mockResolvedValue(ticketData),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Missing required fields')
    expect(mockTicketStorage.create).not.toHaveBeenCalled()
  })

  it('should return 400 when email format is invalid', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()
    const ticketData = {
      customerName: 'John Doe',
      customerEmail: 'invalid-email',
      customerPhone: '+1234567890',
      deviceType: 'Smartphone',
      issueDescription: 'Screen replacement',
    }

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)

    const request = createMockNextRequest({
      method: 'POST',
      json: jest.fn().mockResolvedValue(ticketData),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid email format')
  })

  it('should handle server errors', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()
    const ticketData = {
      customerName: 'John Doe',
      customerEmail: 'john@example.com',
      customerPhone: '+1234567890',
      deviceType: 'Smartphone',
      issueDescription: 'Screen replacement',
    }

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)
    mockTicketStorage.create.mockRejectedValue(new Error('Database error'))

    const request = createMockNextRequest({
      method: 'POST',
      json: jest.fn().mockResolvedValue(ticketData),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })
})

