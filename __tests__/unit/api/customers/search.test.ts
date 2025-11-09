import { GET } from '@/app/api/customers/search/route'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuthAndPermission } from '@/lib/api-middleware'
import { userStorage } from '@/lib/userStorage'
import { db } from '@/lib/db'
import { createMockNextRequest, createMockSession, createMockUser } from '../../../utils/test-helpers'

jest.mock('@/lib/api-middleware')
jest.mock('@/lib/userStorage')
jest.mock('@/lib/db', () => ({
  db: {
    customer: {
      findMany: jest.fn(),
    },
  },
}))

const mockRequireAuthAndPermission = requireAuthAndPermission as jest.MockedFunction<typeof requireAuthAndPermission>
const mockUserStorage = userStorage as jest.Mocked<typeof userStorage>
const mockDb = db as jest.Mocked<typeof db>

describe('/api/customers/search - GET', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return customers matching search query', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()
    const mockCustomers = [
      {
        id: 'customer-1',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
      },
    ]

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)
    mockDb.customer.findMany.mockResolvedValue(mockCustomers as any)

    const url = new URL('http://localhost:3001/api/customers/search?q=john&limit=10')
    const request = createMockNextRequest({ url: url.toString(), nextUrl: url })
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.customers).toHaveLength(1)
    expect(mockDb.customer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          storeId: mockUser.storeId,
          OR: expect.arrayContaining([
            { phone: { contains: 'john', mode: 'insensitive' } },
            { name: { contains: 'john', mode: 'insensitive' } },
            { email: { contains: 'john', mode: 'insensitive' } },
          ]),
        },
        take: 10,
      })
    )
  })

  it('should return empty array when query is too short', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)

    const url = new URL('http://localhost:3001/api/customers/search?q=j')
    const request = createMockNextRequest({ url: url.toString(), nextUrl: url })
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.customers).toEqual([])
    expect(mockDb.customer.findMany).not.toHaveBeenCalled()
  })

  it('should return empty array when query is empty', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)

    const url = new URL('http://localhost:3001/api/customers/search')
    const request = createMockNextRequest({ url: url.toString(), nextUrl: url })
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.customers).toEqual([])
  })

  it('should return 401 when unauthorized', async () => {
    mockRequireAuthAndPermission.mockResolvedValue({
      session: null,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) as any,
    })

    const request = createMockNextRequest()
    const response = await GET(request)

    expect(response.status).toBe(401)
  })

  it('should handle server errors', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)
    mockDb.customer.findMany.mockRejectedValue(new Error('Database error'))

    const url = new URL('http://localhost:3001/api/customers/search?q=test')
    const request = createMockNextRequest({ url: url.toString(), nextUrl: url })
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })
})

