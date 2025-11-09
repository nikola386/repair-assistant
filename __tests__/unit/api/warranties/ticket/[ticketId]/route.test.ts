import { GET } from '@/app/api/warranties/ticket/[ticketId]/route'
import { NextRequest } from 'next/server'
import { warrantyStorage } from '@/lib/warrantyStorage'
import { userStorage } from '@/lib/userStorage'
import { requireAuthAndPermission } from '@/lib/api-middleware'
import { Permission } from '@/lib/permissions'
import { createMockNextRequest, createMockSession, createMockUser } from '../../../../../utils/test-helpers'

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

describe('/api/warranties/ticket/[ticketId] - GET', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return warranty by ticket ID successfully', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()
    const mockWarranty = {
      id: 'warranty-1',
      ticketId: 'ticket-1',
      status: 'active',
    }

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)
    mockWarrantyStorage.getByTicketId.mockResolvedValue(mockWarranty as any)

    const request = createMockNextRequest()
    const response = await GET(request, { params: { ticketId: 'ticket-1' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.warranty).toEqual(mockWarranty)
    expect(mockWarrantyStorage.getByTicketId).toHaveBeenCalledWith('ticket-1', mockUser.storeId)
  })

  it('should return 404 when warranty not found for ticket', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)
    mockWarrantyStorage.getByTicketId.mockResolvedValue(null)

    const request = createMockNextRequest()
    const response = await GET(request, { params: { ticketId: 'ticket-1' } })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Warranty not found for this ticket')
  })

  it('should return 404 when user store not found', async () => {
    const mockSession = createMockSession()

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(null)

    const request = createMockNextRequest()
    const response = await GET(request, { params: { ticketId: 'ticket-1' } })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('User store not found')
  })

  it('should return 401 when not authenticated', async () => {
    mockRequireAuthAndPermission.mockResolvedValue({
      session: null,
      response: { status: 401 } as any,
    })

    const request = createMockNextRequest()
    const response = await GET(request, { params: { ticketId: 'ticket-1' } })

    expect(response.status).toBe(401)
  })

  it('should return 500 when an error occurs', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)
    mockWarrantyStorage.getByTicketId.mockRejectedValue(new Error('Database error'))

    const request = createMockNextRequest()
    const response = await GET(request, { params: { ticketId: 'ticket-1' } })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })
})
