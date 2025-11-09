import { GET } from '@/app/api/users/me/route'
import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth.config'
import { userStorage } from '@/lib/userStorage'
import { createMockNextRequest, createMockUser } from '../../../utils/test-helpers'

jest.mock('@/lib/auth.config')
jest.mock('@/lib/userStorage')

const mockAuth = auth as jest.MockedFunction<typeof auth>
const mockUserStorage = userStorage as jest.Mocked<typeof userStorage>

describe('/api/users/me - GET', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return current user successfully', async () => {
    const mockUser = createMockUser()
    const mockSession = {
      user: {
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
      },
    }

    mockAuth.mockResolvedValue(mockSession as any)
    mockUserStorage.findById.mockResolvedValue(mockUser as any)

    const request = createMockNextRequest()
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.id).toBe(mockUser.id)
    expect(data.email).toBe(mockUser.email)
    expect(data.name).toBe(mockUser.name)
    expect(data.role).toBeDefined()
    expect(data.isActive).toBeDefined()
    expect(data.storeId).toBe(mockUser.storeId)
  })

  it('should return 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)

    const request = createMockNextRequest()
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('should return 401 when session has no user id', async () => {
    mockAuth.mockResolvedValue({ user: null } as any)

    const request = createMockNextRequest()
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('should return 404 when user not found', async () => {
    const mockSession = {
      user: {
        id: 'user-id',
        email: 'test@example.com',
        name: 'Test User',
      },
    }

    mockAuth.mockResolvedValue(mockSession as any)
    mockUserStorage.findById.mockResolvedValue(null)

    const request = createMockNextRequest()
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('User not found')
  })
})

