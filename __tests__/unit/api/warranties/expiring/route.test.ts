import { GET } from '@/app/api/warranties/expiring/route'
import { NextRequest } from 'next/server'
import { warrantyStorage } from '@/lib/warrantyStorage'
import { userStorage } from '@/lib/userStorage'
import { requireAuthAndPermission } from '@/lib/api-middleware'
import { Permission } from '@/lib/permissions'
import { createMockNextRequest, createMockSession, createMockUser } from '../../../../utils/test-helpers'

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

describe('/api/warranties/expiring - GET', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return expiring warranties successfully with default days', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()
    const mockWarranties = [
      { id: 'warranty-1', status: 'active', expiryDate: new Date() },
      { id: 'warranty-2', status: 'active', expiryDate: new Date() },
    ]

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)
    mockWarrantyStorage.getActiveWarranties.mockResolvedValue(mockWarranties as any)

    const request = createMockNextRequest()
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.warranties).toEqual(mockWarranties)
    expect(mockWarrantyStorage.getActiveWarranties).toHaveBeenCalledWith(mockUser.storeId, 30)
  })

  it('should use custom days parameter', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()
    const mockWarranties = []

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)
    mockWarrantyStorage.getActiveWarranties.mockResolvedValue(mockWarranties as any)

    const url = new URL('http://localhost:3001/api/warranties/expiring')
    url.searchParams.set('days', '60')
    const request = createMockNextRequest({ url: url.toString(), nextUrl: url })
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.warranties).toEqual(mockWarranties)
    expect(mockWarrantyStorage.getActiveWarranties).toHaveBeenCalledWith(mockUser.storeId, 60)
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

  it('should return 401 when not authenticated', async () => {
    mockRequireAuthAndPermission.mockResolvedValue({
      session: null,
      response: { status: 401 } as any,
    })

    const request = createMockNextRequest()
    const response = await GET(request)

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
    mockWarrantyStorage.getActiveWarranties.mockRejectedValue(new Error('Database error'))

    const request = createMockNextRequest()
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })
})

