import { GET, POST } from '@/app/api/inventory/route'
import { NextRequest, NextResponse } from 'next/server'
import { inventoryStorage } from '@/lib/inventoryStorage'
import { userStorage } from '@/lib/userStorage'
import { requireAuthAndPermission } from '@/lib/api-middleware'
import { createMockNextRequest, createMockSession, createMockUser } from '../../../utils/test-helpers'

// Mock dependencies
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

describe('/api/inventory - GET', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return inventory items successfully', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()
    const mockItems = [
      {
        id: 'item-1',
        name: 'Screen Protector',
        sku: 'SP-001',
        currentQuantity: 50,
        minQuantity: 10,
      },
    ]
    const mockResult = {
      items: mockItems,
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
    mockUserStorage.getStoreId.mockResolvedValue(mockUser.storeId)
    mockInventoryStorage.getAll.mockResolvedValue(mockResult as any)

    const request = createMockNextRequest()
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.items).toHaveLength(1)
    expect(data.total).toBe(1)
    expect(mockInventoryStorage.getAll).toHaveBeenCalled()
  })

  it('should filter inventory by low stock', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()
    const mockResult = {
      items: [],
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
    mockUserStorage.getStoreId.mockResolvedValue(mockUser.storeId)
    mockInventoryStorage.getAll.mockResolvedValue(mockResult as any)

    const url = new URL('http://localhost:3001/api/inventory?lowStock=true')
    const request = createMockNextRequest({ url: url.toString(), nextUrl: url })
    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(mockInventoryStorage.getAll).toHaveBeenCalledWith(
      mockUser.storeId,
      expect.objectContaining({
        lowStock: true,
      })
    )
  })
})

describe('/api/inventory - POST', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should create inventory item successfully', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()
    const mockItem = {
      id: 'item-1',
      name: 'Screen Protector',
      sku: 'SP-001',
      currentQuantity: 50,
      minQuantity: 10,
      unitPrice: 5.99,
      costPrice: 3.50,
    }
    const itemData = {
      name: 'Screen Protector',
      sku: 'SP-001',
      currentQuantity: 50,
      minQuantity: 10,
      unitPrice: 5.99,
      costPrice: 3.50,
    }

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)
    mockUserStorage.getStoreId.mockResolvedValue(mockUser.storeId)
    mockInventoryStorage.create.mockResolvedValue(mockItem as any)

    const request = createMockNextRequest({
      method: 'POST',
      json: jest.fn().mockResolvedValue(itemData),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.item).toBeDefined()
    expect(data.message).toBe('Inventory item created successfully')
    expect(mockInventoryStorage.create).toHaveBeenCalled()
  })

  it('should return 400 when name is missing', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()
    const itemData = {
      sku: 'SP-001',
      // Missing name
    }

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)
    mockUserStorage.getStoreId.mockResolvedValue(mockUser.storeId)

    const request = createMockNextRequest({
      method: 'POST',
      json: jest.fn().mockResolvedValue(itemData),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Name is required')
    expect(mockInventoryStorage.create).not.toHaveBeenCalled()
  })

  it('should return 400 when quantity is negative', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()
    const itemData = {
      name: 'Screen Protector',
      currentQuantity: -10,
    }

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)
    mockUserStorage.getStoreId.mockResolvedValue(mockUser.storeId)

    const request = createMockNextRequest({
      method: 'POST',
      json: jest.fn().mockResolvedValue(itemData),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Current quantity must be a valid non-negative number')
  })

  it('should return 409 when SKU is duplicate', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()
    const itemData = {
      name: 'Screen Protector',
      sku: 'SP-001',
    }

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)
    mockUserStorage.getStoreId.mockResolvedValue(mockUser.storeId)
    mockInventoryStorage.create.mockRejectedValue(new Error('SKU must be unique'))

    const request = createMockNextRequest({
      method: 'POST',
      json: jest.fn().mockResolvedValue(itemData),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(409)
    expect(data.error).toBe('SKU must be unique within this store')
  })
})

