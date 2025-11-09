import { GET } from '@/app/api/users/route'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuthAndPermission } from '@/lib/api-middleware'
import { userStorage } from '@/lib/userStorage'
import { createMockNextRequest, createMockSession, createMockUser } from '../../../utils/test-helpers'

// Mock dependencies
jest.mock('@/lib/api-middleware')
jest.mock('@/lib/userStorage')

const mockRequireAuthAndPermission = requireAuthAndPermission as jest.MockedFunction<typeof requireAuthAndPermission>
const mockUserStorage = userStorage as jest.Mocked<typeof userStorage>

describe('/api/users - GET', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return users and invitations successfully', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()
    const mockUsers = [
      createMockUser({ id: 'user-1', email: 'user1@example.com' }),
      createMockUser({ id: 'user-2', email: 'user2@example.com' }),
    ]
    const mockInvitations = [
      {
        id: 'invitation-1',
        email: 'invited@example.com',
        role: 'TECHNICIAN',
        invitedBy: 'test-user-id',
        createdAt: new Date(),
        token: 'invitation-token',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    ]

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)
    mockUserStorage.findByStoreId.mockResolvedValue(mockUsers as any)
    mockUserStorage.findPendingInvitationsByStoreId.mockResolvedValue(mockInvitations as any)

    const request = createMockNextRequest()
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(Array.isArray(data)).toBe(true)
    expect(data.length).toBe(3) // 2 users + 1 invitation
    expect(data[0].type).toBe('user')
    expect(data[2].type).toBe('invitation')
    expect(mockUserStorage.findByStoreId).toHaveBeenCalledWith(mockUser.storeId)
    expect(mockUserStorage.findPendingInvitationsByStoreId).toHaveBeenCalledWith(mockUser.storeId)
  })

  it('should return 401 when unauthorized', async () => {
    mockRequireAuthAndPermission.mockResolvedValue({
      session: null,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) as any,
    })

    const request = createMockNextRequest()
    const response = await GET(request)

    expect(response.status).toBe(401)
    expect(mockUserStorage.findByStoreId).not.toHaveBeenCalled()
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
})

