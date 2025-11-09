import { POST } from '@/app/api/inventory/[id]/adjust/route'
import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth.middleware'
import { userStorage } from '@/lib/userStorage'
import { inventoryStorage } from '@/lib/inventoryStorage'
import { createMockNextRequest, createMockSession, createMockUser } from '../../../../../utils/test-helpers'

jest.mock('@/lib/auth.middleware')
jest.mock('@/lib/userStorage')
jest.mock('@/lib/inventoryStorage')
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
  generateRequestId: jest.fn(() => 'test-request-id'),
}))

const mockWithAuth = withAuth as jest.MockedFunction<typeof withAuth>
const mockUserStorage = userStorage as jest.Mocked<typeof userStorage>
const mockInventoryStorage = inventoryStorage as jest.Mocked<typeof inventoryStorage>

describe('/api/inventory/[id]/adjust - POST', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should adjust inventory quantity successfully (increase)', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()
    const mockItem = {
      id: 'item-1',
      name: 'Test Item',
      quantity: 15,
    }

    mockWithAuth.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)
    mockInventoryStorage.adjustQuantity.mockResolvedValue(mockItem as any)

    const request = createMockNextRequest({
      method: 'POST',
      json: jest.fn().mockResolvedValue({ quantity: 5, reason: 'Restocked' }),
    })
    const response = await POST(request, { params: { id: 'item-1' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.item).toEqual(mockItem)
    expect(data.message).toContain('increased')
    expect(mockInventoryStorage.adjustQuantity).toHaveBeenCalledWith('item-1', mockUser.storeId, 5)
  })

  it('should adjust inventory quantity successfully (decrease)', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()
    const mockItem = {
      id: 'item-1',
      name: 'Test Item',
      quantity: 5,
    }

    mockWithAuth.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)
    mockInventoryStorage.adjustQuantity.mockResolvedValue(mockItem as any)

    const request = createMockNextRequest({
      method: 'POST',
      json: jest.fn().mockResolvedValue({ quantity: -5, reason: 'Used' }),
    })
    const response = await POST(request, { params: { id: 'item-1' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toContain('decreased')
    expect(mockInventoryStorage.adjustQuantity).toHaveBeenCalledWith('item-1', mockUser.storeId, -5)
  })

  it('should return 400 when quantity is missing', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()

    mockWithAuth.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)

    const request = createMockNextRequest({
      method: 'POST',
      json: jest.fn().mockResolvedValue({}),
    })
    const response = await POST(request, { params: { id: 'item-1' } })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Quantity is required')
  })

  it('should return 400 when quantity is not a valid number', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()

    mockWithAuth.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)

    const request = createMockNextRequest({
      method: 'POST',
      json: jest.fn().mockResolvedValue({ quantity: 'invalid' }),
    })
    const response = await POST(request, { params: { id: 'item-1' } })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Quantity must be a valid number')
  })

  it('should return 400 when quantity change is zero', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()

    mockWithAuth.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)

    const request = createMockNextRequest({
      method: 'POST',
      json: jest.fn().mockResolvedValue({ quantity: 0 }),
    })
    const response = await POST(request, { params: { id: 'item-1' } })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Quantity change cannot be zero')
  })

  it('should return 404 when item not found', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()

    mockWithAuth.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)
    mockInventoryStorage.adjustQuantity.mockRejectedValue(new Error('Inventory item not found'))

    const request = createMockNextRequest({
      method: 'POST',
      json: jest.fn().mockResolvedValue({ quantity: 5 }),
    })
    const response = await POST(request, { params: { id: 'item-1' } })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Inventory item not found')
  })

  it('should return 400 when quantity would be negative', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()

    mockWithAuth.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)
    mockInventoryStorage.adjustQuantity.mockRejectedValue(new Error('Quantity cannot be negative'))

    const request = createMockNextRequest({
      method: 'POST',
      json: jest.fn().mockResolvedValue({ quantity: -100 }),
    })
    const response = await POST(request, { params: { id: 'item-1' } })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Quantity cannot be negative')
  })

  it('should return 401 when not authenticated', async () => {
    mockWithAuth.mockResolvedValue({
      session: null,
      response: { status: 401 } as any,
    })

    const request = createMockNextRequest({ method: 'POST' })
    const response = await POST(request, { params: { id: 'item-1' } })

    expect(response.status).toBe(401)
  })

  it('should return 500 when an error occurs', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()

    mockWithAuth.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)
    mockInventoryStorage.adjustQuantity.mockRejectedValue(new Error('Database error'))

    const request = createMockNextRequest({
      method: 'POST',
      json: jest.fn().mockResolvedValue({ quantity: 5 }),
    })
    const response = await POST(request, { params: { id: 'item-1' } })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })
})
