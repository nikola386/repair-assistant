import { GET, PATCH, DELETE } from '@/app/api/inventory/[id]/route'
import { NextRequest, NextResponse } from 'next/server'
import { inventoryStorage } from '@/lib/inventoryStorage'
import { userStorage } from '@/lib/userStorage'
import { requireAuthAndPermission } from '@/lib/api-middleware'
import { createMockNextRequest, createMockSession, createMockUser } from '../../../../utils/test-helpers'

jest.mock('@/lib/inventoryStorage')
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

const mockInventoryStorage = inventoryStorage as jest.Mocked<typeof inventoryStorage>
const mockUserStorage = userStorage as jest.Mocked<typeof userStorage>
const mockRequireAuthAndPermission = requireAuthAndPermission as jest.MockedFunction<typeof requireAuthAndPermission>

describe('/api/inventory/[id] - GET', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return inventory item by id', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()
    const mockItem = {
      id: 'item-1',
      name: 'Screen Protector',
      sku: 'SP-001',
      currentQuantity: 50,
    }

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)
    mockInventoryStorage.getById.mockResolvedValue(mockItem as any)

    const request = createMockNextRequest()
    const params = { id: 'item-1' }
    const response = await GET(request, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.item).toBeDefined()
    expect(data.item.id).toBe('item-1')
  })

  it('should return 404 when item not found', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)
    mockInventoryStorage.getById.mockResolvedValue(null)

    const request = createMockNextRequest()
    const params = { id: 'non-existent-id' }
    const response = await GET(request, { params })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Inventory item not found')
  })

  it('should return 404 when user store not found', async () => {
    const mockSession = createMockSession()

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(null)

    const request = createMockNextRequest()
    const params = { id: 'item-1' }
    const response = await GET(request, { params })
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
    const params = { id: 'item-1' }
    const response = await GET(request, { params })

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
    mockInventoryStorage.getById.mockRejectedValue(new Error('Database error'))

    const request = createMockNextRequest()
    const params = { id: 'item-1' }
    const response = await GET(request, { params })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })
})

describe('/api/inventory/[id] - PATCH', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should update inventory item successfully', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()
    const mockItem = {
      id: 'item-1',
      name: 'Updated Screen Protector',
      currentQuantity: 60,
    }
    const updateData = {
      name: 'Updated Screen Protector',
      currentQuantity: 60,
    }

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)
    mockInventoryStorage.update.mockResolvedValue(mockItem as any)

    const request = createMockNextRequest({
      method: 'PATCH',
      json: jest.fn().mockResolvedValue(updateData),
    })
    const params = { id: 'item-1' }
    const response = await PATCH(request, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.item).toBeDefined()
    expect(mockInventoryStorage.update).toHaveBeenCalled()
  })

  it('should return 400 when name is empty', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)

    const request = createMockNextRequest({
      method: 'PATCH',
      json: jest.fn().mockResolvedValue({ name: '' }),
    })
    const params = { id: 'item-1' }
    const response = await PATCH(request, { params })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Name cannot be empty')
  })

  it('should return 400 when currentQuantity is invalid', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)

    const request = createMockNextRequest({
      method: 'PATCH',
      json: jest.fn().mockResolvedValue({ currentQuantity: -5 }),
    })
    const params = { id: 'item-1' }
    const response = await PATCH(request, { params })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Current quantity must be a valid non-negative number')
  })

  it('should return 400 when minQuantity is invalid', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)

    const request = createMockNextRequest({
      method: 'PATCH',
      json: jest.fn().mockResolvedValue({ minQuantity: 'invalid' }),
    })
    const params = { id: 'item-1' }
    const response = await PATCH(request, { params })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Min quantity must be a valid non-negative number')
  })

  it('should return 400 when unitPrice is invalid', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)

    const request = createMockNextRequest({
      method: 'PATCH',
      json: jest.fn().mockResolvedValue({ unitPrice: -10 }),
    })
    const params = { id: 'item-1' }
    const response = await PATCH(request, { params })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Unit price must be a valid non-negative number')
  })

  it('should return 400 when costPrice is invalid', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)

    const request = createMockNextRequest({
      method: 'PATCH',
      json: jest.fn().mockResolvedValue({ costPrice: 'not-a-number' }),
    })
    const params = { id: 'item-1' }
    const response = await PATCH(request, { params })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Cost price must be a valid non-negative number')
  })

  it('should return 409 when SKU is not unique', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)
    mockInventoryStorage.update.mockRejectedValue(new Error('SKU must be unique'))

    const request = createMockNextRequest({
      method: 'PATCH',
      json: jest.fn().mockResolvedValue({ sku: 'DUPLICATE-SKU' }),
    })
    const params = { id: 'item-1' }
    const response = await PATCH(request, { params })
    const data = await response.json()

    expect(response.status).toBe(409)
    expect(data.error).toBe('SKU must be unique within this store')
  })

  it('should return 404 when item not found during update', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)
    mockInventoryStorage.update.mockRejectedValue(new Error('Inventory item not found'))

    const request = createMockNextRequest({
      method: 'PATCH',
      json: jest.fn().mockResolvedValue({ name: 'Updated Item' }),
    })
    const params = { id: 'non-existent-id' }
    const response = await PATCH(request, { params })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Inventory item not found')
  })

  it('should return 500 when an error occurs', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)
    mockInventoryStorage.update.mockRejectedValue(new Error('Database error'))

    const request = createMockNextRequest({
      method: 'PATCH',
      json: jest.fn().mockResolvedValue({ name: 'Updated Item' }),
    })
    const params = { id: 'item-1' }
    const response = await PATCH(request, { params })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })

  it('should return 404 when user store not found', async () => {
    const mockSession = createMockSession()

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(null)

    const request = createMockNextRequest({
      method: 'PATCH',
      json: jest.fn().mockResolvedValue({ name: 'Updated Item' }),
    })
    const params = { id: 'item-1' }
    const response = await PATCH(request, { params })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('User store not found')
  })

  it('should return 401 when not authenticated', async () => {
    mockRequireAuthAndPermission.mockResolvedValue({
      session: null,
      response: { status: 401 } as any,
    })

    const request = createMockNextRequest({
      method: 'PATCH',
      json: jest.fn().mockResolvedValue({}),
    })
    const params = { id: 'item-1' }
    const response = await PATCH(request, { params })

    expect(response.status).toBe(401)
  })
})

describe('/api/inventory/[id] - DELETE', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should delete inventory item successfully', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)
    mockInventoryStorage.delete.mockResolvedValue(true)

    const request = createMockNextRequest({ method: 'DELETE' })
    const params = { id: 'item-1' }
    const response = await DELETE(request, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toBe('Inventory item deleted successfully')
    expect(mockInventoryStorage.delete).toHaveBeenCalledWith('item-1', mockUser.storeId)
  })

  it('should return 404 when item not found for deletion', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)
    mockInventoryStorage.delete.mockResolvedValue(false)

    const request = createMockNextRequest({ method: 'DELETE' })
    const params = { id: 'non-existent-id' }
    const response = await DELETE(request, { params })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Inventory item not found')
  })

  it('should return 404 when user store not found', async () => {
    const mockSession = createMockSession()

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(null)

    const request = createMockNextRequest({ method: 'DELETE' })
    const params = { id: 'item-1' }
    const response = await DELETE(request, { params })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('User store not found')
  })

  it('should return 401 when not authenticated', async () => {
    mockRequireAuthAndPermission.mockResolvedValue({
      session: null,
      response: { status: 401 } as any,
    })

    const request = createMockNextRequest({ method: 'DELETE' })
    const params = { id: 'item-1' }
    const response = await DELETE(request, { params })

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
    mockInventoryStorage.delete.mockRejectedValue(new Error('Database error'))

    const request = createMockNextRequest({ method: 'DELETE' })
    const params = { id: 'item-1' }
    const response = await DELETE(request, { params })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })
})

