import { GET, POST } from '@/app/api/tickets/[id]/expenses/route'
import { NextRequest, NextResponse } from 'next/server'
import { ticketStorage } from '@/lib/ticketStorage'
import { userStorage } from '@/lib/userStorage'
import { requireAuthAndPermission } from '@/lib/api-middleware'
import { createMockNextRequest, createMockSession, createMockUser, createMockTicket } from '../../../../../utils/test-helpers'

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

describe('/api/tickets/[id]/expenses - GET', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return expenses for ticket', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()
    const mockTicket = createMockTicket()
    const mockExpenses = [
      {
        id: 'expense-1',
        ticketId: 'ticket-1',
        name: 'Screen Replacement',
        quantity: 1,
        price: 50.00,
      },
    ]

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)
    mockTicketStorage.getById.mockResolvedValue(mockTicket as any)
    mockTicketStorage.getExpensesByTicketId.mockResolvedValue(mockExpenses as any)

    const request = createMockNextRequest()
    const params = { id: 'ticket-1' }
    const response = await GET(request, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.expenses).toHaveLength(1)
    expect(mockTicketStorage.getExpensesByTicketId).toHaveBeenCalledWith('ticket-1')
  })

  it('should return 404 when ticket not found', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)
    mockTicketStorage.getById.mockResolvedValue(null)

    const request = createMockNextRequest()
    const params = { id: 'non-existent-id' }
    const response = await GET(request, { params })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Ticket not found')
  })
})

describe('/api/tickets/[id]/expenses - POST', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should create expense successfully', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()
    const mockTicket = createMockTicket()
    const mockExpense = {
      id: 'expense-1',
      ticketId: 'ticket-1',
      name: 'Screen Replacement',
      quantity: 1,
      price: 50.00,
    }
    const expenseData = {
      name: 'Screen Replacement',
      quantity: 1,
      price: 50.00,
    }

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)
    mockTicketStorage.getById.mockResolvedValue(mockTicket as any)
    mockTicketStorage.createExpense.mockResolvedValue(mockExpense as any)

    const request = createMockNextRequest({
      method: 'POST',
      json: jest.fn().mockResolvedValue(expenseData),
    })
    const params = { id: 'ticket-1' }
    const response = await POST(request, { params })
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.expense).toBeDefined()
    expect(data.message).toBe('Expense created successfully')
  })

  it('should return 400 when required fields are missing', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()
    const mockTicket = createMockTicket()

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)
    mockTicketStorage.getById.mockResolvedValue(mockTicket as any)

    const request = createMockNextRequest({
      method: 'POST',
      json: jest.fn().mockResolvedValue({ name: 'Test' }),
    })
    const params = { id: 'ticket-1' }
    const response = await POST(request, { params })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Missing required fields')
  })

  it('should return 400 when quantity is invalid', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()
    const mockTicket = createMockTicket()

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)
    mockTicketStorage.getById.mockResolvedValue(mockTicket as any)

    const request = createMockNextRequest({
      method: 'POST',
      json: jest.fn().mockResolvedValue({
        name: 'Test',
        quantity: -1,
        price: 10,
      }),
    })
    const params = { id: 'ticket-1' }
    const response = await POST(request, { params })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Quantity must be a valid positive number')
  })
})

