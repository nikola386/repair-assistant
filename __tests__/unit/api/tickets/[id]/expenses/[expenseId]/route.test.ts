import { PATCH, DELETE } from '@/app/api/tickets/[id]/expenses/[expenseId]/route'
import { NextRequest } from 'next/server'
import { ticketStorage } from '@/lib/ticketStorage'
import { userStorage } from '@/lib/userStorage'
import { requireAuthAndPermission } from '@/lib/api-middleware'
import { Permission } from '@/lib/permissions'
import { createMockNextRequest, createMockSession, createMockUser, createMockTicket } from '../../../../../../utils/test-helpers'

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

describe('/api/tickets/[id]/expenses/[expenseId]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('PATCH', () => {
    it('should update expense successfully', async () => {
      const mockSession = createMockSession()
      const mockUser = createMockUser()
      const mockTicket = createMockTicket()
      const mockExpense = {
        id: 'expense-1',
        ticketId: mockTicket.id,
        name: 'Updated Name',
        quantity: 2,
        price: 100.00,
      }

      mockRequireAuthAndPermission.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })
      mockUserStorage.findById.mockResolvedValue(mockUser as any)
      mockTicketStorage.getById.mockResolvedValue(mockTicket as any)
      mockTicketStorage.getExpenseById.mockResolvedValue({ id: 'expense-1', ticketId: mockTicket.id } as any)
      mockTicketStorage.updateExpense.mockResolvedValue(mockExpense as any)

      const request = createMockNextRequest({
        method: 'PATCH',
        json: jest.fn().mockResolvedValue({
          name: 'Updated Name',
          quantity: 2,
          price: 100.00,
        }),
      })
      const response = await PATCH(request, { params: { id: mockTicket.id, expenseId: 'expense-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.expense).toEqual(mockExpense)
      expect(data.message).toBe('Expense updated successfully')
    })

    it('should return 400 when name is empty', async () => {
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
        method: 'PATCH',
        json: jest.fn().mockResolvedValue({ name: '' }),
      })
      const response = await PATCH(request, { params: { id: mockTicket.id, expenseId: 'expense-1' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Name cannot be empty')
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
        method: 'PATCH',
        json: jest.fn().mockResolvedValue({ quantity: -1 }),
      })
      const response = await PATCH(request, { params: { id: mockTicket.id, expenseId: 'expense-1' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Quantity must be a valid positive number')
    })

    it('should return 404 when expense does not belong to ticket', async () => {
      const mockSession = createMockSession()
      const mockUser = createMockUser()
      const mockTicket = createMockTicket()

      mockRequireAuthAndPermission.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })
      mockUserStorage.findById.mockResolvedValue(mockUser as any)
      mockTicketStorage.getById.mockResolvedValue(mockTicket as any)
      mockTicketStorage.getExpenseById.mockResolvedValue({ id: 'expense-1', ticketId: 'other-ticket' } as any)

      const request = createMockNextRequest({
        method: 'PATCH',
        json: jest.fn().mockResolvedValue({ name: 'Updated Name' }),
      })
      const response = await PATCH(request, { params: { id: mockTicket.id, expenseId: 'expense-1' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Expense not found')
    })

    it('should return 500 when an error occurs', async () => {
      const mockSession = createMockSession()
      const mockUser = createMockUser()
      const mockTicket = createMockTicket()

      mockRequireAuthAndPermission.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })
      mockUserStorage.findById.mockResolvedValue(mockUser as any)
      mockTicketStorage.getById.mockResolvedValue(mockTicket as any)
      mockTicketStorage.getExpenseById.mockRejectedValue(new Error('Database error'))

      const request = createMockNextRequest({
        method: 'PATCH',
        json: jest.fn().mockResolvedValue({ name: 'Updated Name' }),
      })
      const response = await PATCH(request, { params: { id: mockTicket.id, expenseId: 'expense-1' } })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })

  describe('DELETE', () => {
    it('should delete expense successfully', async () => {
      const mockSession = createMockSession()
      const mockUser = createMockUser()
      const mockTicket = createMockTicket()

      mockRequireAuthAndPermission.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })
      mockUserStorage.findById.mockResolvedValue(mockUser as any)
      mockTicketStorage.getById.mockResolvedValue(mockTicket as any)
      mockTicketStorage.getExpenseById.mockResolvedValue({ id: 'expense-1', ticketId: mockTicket.id } as any)
      mockTicketStorage.deleteExpense.mockResolvedValue(true)

      const request = createMockNextRequest({ method: 'DELETE' })
      const response = await DELETE(request, { params: { id: mockTicket.id, expenseId: 'expense-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Expense deleted successfully')
      expect(mockTicketStorage.deleteExpense).toHaveBeenCalledWith('expense-1')
    })

    it('should return 404 when expense not found', async () => {
      const mockSession = createMockSession()
      const mockUser = createMockUser()
      const mockTicket = createMockTicket()

      mockRequireAuthAndPermission.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })
      mockUserStorage.findById.mockResolvedValue(mockUser as any)
      mockTicketStorage.getById.mockResolvedValue(mockTicket as any)
      mockTicketStorage.getExpenseById.mockResolvedValue(null)

      const request = createMockNextRequest({ method: 'DELETE' })
      const response = await DELETE(request, { params: { id: mockTicket.id, expenseId: 'expense-1' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Expense not found')
    })

    it('should return 500 when an error occurs', async () => {
      const mockSession = createMockSession()
      const mockUser = createMockUser()
      const mockTicket = createMockTicket()

      mockRequireAuthAndPermission.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })
      mockUserStorage.findById.mockResolvedValue(mockUser as any)
      mockTicketStorage.getById.mockResolvedValue(mockTicket as any)
      mockTicketStorage.getExpenseById.mockRejectedValue(new Error('Database error'))

      const request = createMockNextRequest({ method: 'DELETE' })
      const response = await DELETE(request, { params: { id: mockTicket.id, expenseId: 'expense-1' } })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })
})
