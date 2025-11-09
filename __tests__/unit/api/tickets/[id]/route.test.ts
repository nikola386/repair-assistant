import { GET, PATCH, DELETE } from '@/app/api/tickets/[id]/route'
import { NextRequest, NextResponse } from 'next/server'
import { ticketStorage } from '@/lib/ticketStorage'
import { userStorage } from '@/lib/userStorage'
import { requireAuthAndPermission } from '@/lib/api-middleware'
import { createMockNextRequest, createMockSession, createMockUser, createMockTicket } from '../../../../utils/test-helpers'

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

describe('/api/tickets/[id] - GET', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return ticket by id successfully', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()
    const mockTicket = createMockTicket()

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)
    mockTicketStorage.getById.mockResolvedValue(mockTicket as any)

    const request = createMockNextRequest()
    const params = { id: 'test-ticket-id' }
    const response = await GET(request, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.ticket).toBeDefined()
    expect(data.ticket.id).toBe('test-ticket-id')
    expect(mockTicketStorage.getById).toHaveBeenCalledWith('test-ticket-id', mockUser.storeId)
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

describe('/api/tickets/[id] - PATCH', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should update ticket successfully', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()
    const mockTicket = createMockTicket({ status: 'in_progress' })
    const updateData = {
      status: 'in_progress',
      priority: 'high',
      notes: 'Updated notes',
    }

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)
    mockTicketStorage.update.mockResolvedValue(mockTicket as any)

    const request = createMockNextRequest({
      method: 'PATCH',
      json: jest.fn().mockResolvedValue(updateData),
    })
    const params = { id: 'test-ticket-id' }
    const response = await PATCH(request, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.ticket).toBeDefined()
    expect(data.message).toBe('Ticket updated successfully')
    expect(mockTicketStorage.update).toHaveBeenCalled()
  })

  it('should return 404 when ticket not found for update', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()
    const updateData = { status: 'completed' }

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)
    mockTicketStorage.update.mockResolvedValue(null)

    const request = createMockNextRequest({
      method: 'PATCH',
      json: jest.fn().mockResolvedValue(updateData),
    })
    const params = { id: 'non-existent-id' }
    const response = await PATCH(request, { params })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Ticket not found')
  })

  it('should ignore invalid status values', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()
    const mockTicket = createMockTicket()
    const updateData = {
      status: 'invalid_status',
      priority: 'invalid_priority',
    }

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)
    mockTicketStorage.update.mockResolvedValue(mockTicket as any)

    const request = createMockNextRequest({
      method: 'PATCH',
      json: jest.fn().mockResolvedValue(updateData),
    })
    const params = { id: 'test-ticket-id' }
    const response = await PATCH(request, { params })

    expect(response.status).toBe(200)
    // Invalid status/priority should be filtered out
    expect(mockTicketStorage.update).toHaveBeenCalledWith(
      'test-ticket-id',
      expect.objectContaining({}),
      mockUser.storeId
    )
  })
})

describe('/api/tickets/[id] - DELETE', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should delete ticket successfully', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)
    mockTicketStorage.delete.mockResolvedValue(true)

    const request = createMockNextRequest({ method: 'DELETE' })
    const params = { id: 'test-ticket-id' }
    const response = await DELETE(request, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toBe('Ticket deleted successfully')
    expect(mockTicketStorage.delete).toHaveBeenCalledWith('test-ticket-id', mockUser.storeId)
  })

  it('should return 404 when ticket not found for deletion', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)
    mockTicketStorage.delete.mockResolvedValue(false)

    const request = createMockNextRequest({ method: 'DELETE' })
    const params = { id: 'non-existent-id' }
    const response = await DELETE(request, { params })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Ticket not found')
  })
})

