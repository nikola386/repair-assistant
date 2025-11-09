/**
 * Integration tests for Tickets API
 * These tests verify the full flow of API endpoints working together
 */

import { GET, POST } from '@/app/api/tickets/route'
import { GET as GET_BY_ID, PATCH, DELETE } from '@/app/api/tickets/[id]/route'
import { NextRequest } from 'next/server'
import { ticketStorage } from '@/lib/ticketStorage'
import { userStorage } from '@/lib/userStorage'
import { requireAuthAndPermission } from '@/lib/api-middleware'
import { createMockNextRequest, createMockSession, createMockUser, createMockTicket } from '../../utils/test-helpers'

// Mock dependencies
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn((body, init) => ({
      status: init?.status || 200,
      json: jest.fn().mockResolvedValue(body),
      headers: new Headers(init?.headers || {}),
    })),
  },
}))
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

describe('Tickets API Integration', () => {
  const mockSession = createMockSession()
  const mockUser = createMockUser()

  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)
  })

  describe('Create and Retrieve Ticket Flow', () => {
    it('should create a ticket and then retrieve it', async () => {
      const ticketData = {
        customerName: 'John Doe',
        customerEmail: 'john@example.com',
        customerPhone: '+1234567890',
        deviceType: 'Smartphone',
        deviceBrand: 'Apple',
        deviceModel: 'iPhone 13',
        issueDescription: 'Screen replacement needed',
        priority: 'high',
      }

      const createdTicket = createMockTicket({
        ...ticketData,
        id: 'new-ticket-id',
        ticketNumber: 'TK-NEW-001',
      })

      // Create ticket
      mockTicketStorage.create.mockResolvedValue(createdTicket as any)
      const createRequest = createMockNextRequest({
        method: 'POST',
        json: jest.fn().mockResolvedValue(ticketData),
      })
      const createResponse = await POST(createRequest)
      const createData = await createResponse.json()

      expect(createResponse.status).toBe(201)
      expect(createData.ticket.id).toBe('new-ticket-id')

      // Retrieve ticket
      mockTicketStorage.getById.mockResolvedValue(createdTicket as any)
      const getRequest = createMockNextRequest()
      const getResponse = await GET_BY_ID(getRequest, { params: { id: 'new-ticket-id' } })
      const getData = await getResponse.json()

      expect(getResponse.status).toBe(200)
      expect(getData.ticket.id).toBe('new-ticket-id')
      expect(getData.ticket.ticketNumber).toBe('TK-NEW-001')
    })
  })

  describe('Update Ticket Flow', () => {
    it('should create, update, and verify ticket changes', async () => {
      const initialTicket = createMockTicket({
        id: 'update-ticket-id',
        status: 'pending',
        priority: 'medium',
      })

      const updatedTicket = createMockTicket({
        id: 'update-ticket-id',
        status: 'in_progress',
        priority: 'high',
        notes: 'Work in progress',
      })

      // Create ticket
      mockTicketStorage.create.mockResolvedValue(initialTicket as any)
      const createRequest = createMockNextRequest({
        method: 'POST',
        json: jest.fn().mockResolvedValue({
          customerName: 'John Doe',
          customerEmail: 'john@example.com',
          customerPhone: '+1234567890',
          deviceType: 'Smartphone',
          issueDescription: 'Screen replacement',
        }),
      })
      await POST(createRequest)

      // Update ticket
      mockTicketStorage.update.mockResolvedValue(updatedTicket as any)
      const updateRequest = createMockNextRequest({
        method: 'PATCH',
        json: jest.fn().mockResolvedValue({
          status: 'in_progress',
          priority: 'high',
          notes: 'Work in progress',
        }),
      })
      const updateResponse = await PATCH(updateRequest, { params: { id: 'update-ticket-id' } })
      const updateData = await updateResponse.json()

      expect(updateResponse.status).toBe(200)
      expect(updateData.ticket.status).toBe('in_progress')
      expect(updateData.ticket.priority).toBe('high')
      expect(updateData.ticket.notes).toBe('Work in progress')
    })
  })

  describe('List and Filter Tickets Flow', () => {
    it('should list all tickets and filter by status', async () => {
      const allTickets = [
        createMockTicket({ id: 'ticket-1', status: 'pending' }),
        createMockTicket({ id: 'ticket-2', status: 'in_progress' }),
        createMockTicket({ id: 'ticket-3', status: 'completed' }),
      ]

      const pendingTickets = [allTickets[0]]

      // Get all tickets
      mockTicketStorage.getAll.mockResolvedValue(allTickets as any)
      const getAllRequest = createMockNextRequest()
      const getAllResponse = await GET(getAllRequest)
      const getAllData = await getAllResponse.json()

      expect(getAllResponse.status).toBe(200)
      expect(getAllData.tickets).toHaveLength(3)

      // Filter by status
      mockTicketStorage.getPaginated.mockResolvedValue({
        tickets: pendingTickets,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      } as any)

      const url = new URL('http://localhost:3001/api/tickets?status=pending')
      const filterRequest = createMockNextRequest({ url: url.toString(), nextUrl: url })
      const filterResponse = await GET(filterRequest)
      const filterData = await filterResponse.json()

      expect(filterResponse.status).toBe(200)
      expect(filterData.tickets).toHaveLength(1)
      expect(filterData.tickets[0].status).toBe('pending')
    })
  })

  describe('Delete Ticket Flow', () => {
    it('should create and then delete a ticket', async () => {
      const ticketToDelete = createMockTicket({ id: 'delete-ticket-id' })

      // Create ticket
      mockTicketStorage.create.mockResolvedValue(ticketToDelete as any)
      const createRequest = createMockNextRequest({
        method: 'POST',
        json: jest.fn().mockResolvedValue({
          customerName: 'John Doe',
          customerEmail: 'john@example.com',
          customerPhone: '+1234567890',
          deviceType: 'Smartphone',
          issueDescription: 'Screen replacement',
        }),
      })
      await POST(createRequest)

      // Delete ticket
      mockTicketStorage.delete.mockResolvedValue(true)
      const deleteRequest = createMockNextRequest({ method: 'DELETE' })
      const deleteResponse = await DELETE(deleteRequest, { params: { id: 'delete-ticket-id' } })
      const deleteData = await deleteResponse.json()

      expect(deleteResponse.status).toBe(200)
      expect(deleteData.message).toBe('Ticket deleted successfully')

      // Verify ticket is deleted
      mockTicketStorage.getById.mockResolvedValue(null)
      const getRequest = createMockNextRequest()
      const getResponse = await GET_BY_ID(getRequest, { params: { id: 'delete-ticket-id' } })
      expect(getResponse.status).toBe(404)
    })
  })
})

