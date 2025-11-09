import { POST } from '@/app/api/users/accept-invitation/route'
import { NextRequest } from 'next/server'
import { userStorage } from '@/lib/userStorage'
import { createMockNextRequest, createMockUser } from '../../../utils/test-helpers'

jest.mock('@/lib/userStorage')

const mockUserStorage = userStorage as jest.Mocked<typeof userStorage>

describe('/api/users/accept-invitation - POST', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should accept invitation successfully', async () => {
    const mockInvitation = {
      id: 'invitation-1',
      email: 'newuser@example.com',
      storeId: 'store-1',
      role: 'TECHNICIAN',
      invitedBy: 'admin-id',
      token: 'invitation-token',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      acceptedAt: null,
    }
    const mockUser = createMockUser({
      email: mockInvitation.email,
      storeId: mockInvitation.storeId,
      role: mockInvitation.role,
    })

    mockUserStorage.findInvitationByToken.mockResolvedValue(mockInvitation as any)
    mockUserStorage.findByEmail.mockResolvedValue(null)
    mockUserStorage.create.mockResolvedValue(mockUser as any)
    mockUserStorage.acceptInvitation.mockResolvedValue(undefined)

    const request = createMockNextRequest({
      method: 'POST',
      json: jest.fn().mockResolvedValue({
        token: 'invitation-token',
        password: 'SecurePass123!',
        name: 'New User',
      }),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toBe('Account created successfully')
    expect(data.user.email).toBe(mockInvitation.email)
    expect(mockUserStorage.acceptInvitation).toHaveBeenCalledWith('invitation-1')
  })

  it('should return 400 when token is invalid', async () => {
    mockUserStorage.findInvitationByToken.mockResolvedValue(null)

    const request = createMockNextRequest({
      method: 'POST',
      json: jest.fn().mockResolvedValue({
        token: 'invalid-token',
        password: 'SecurePass123!',
      }),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid invitation token')
  })

  it('should return 400 when invitation has expired', async () => {
    const expiredInvitation = {
      id: 'invitation-1',
      email: 'newuser@example.com',
      storeId: 'store-1',
      role: 'TECHNICIAN',
      invitedBy: 'admin-id',
      token: 'invitation-token',
      expiresAt: new Date(Date.now() - 1000),
      acceptedAt: null,
    }

    mockUserStorage.findInvitationByToken.mockResolvedValue(expiredInvitation as any)

    const request = createMockNextRequest({
      method: 'POST',
      json: jest.fn().mockResolvedValue({
        token: 'invitation-token',
        password: 'SecurePass123!',
      }),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invitation has expired')
  })

  it('should return 400 when invitation already accepted', async () => {
    const acceptedInvitation = {
      id: 'invitation-1',
      email: 'newuser@example.com',
      storeId: 'store-1',
      role: 'TECHNICIAN',
      invitedBy: 'admin-id',
      token: 'invitation-token',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      acceptedAt: new Date(),
    }

    mockUserStorage.findInvitationByToken.mockResolvedValue(acceptedInvitation as any)

    const request = createMockNextRequest({
      method: 'POST',
      json: jest.fn().mockResolvedValue({
        token: 'invitation-token',
        password: 'SecurePass123!',
      }),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invitation has already been accepted')
  })

  it('should return 409 when user already exists', async () => {
    const mockInvitation = {
      id: 'invitation-1',
      email: 'existing@example.com',
      storeId: 'store-1',
      role: 'TECHNICIAN',
      invitedBy: 'admin-id',
      token: 'invitation-token',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      acceptedAt: null,
    }
    const existingUser = createMockUser({ email: mockInvitation.email })

    mockUserStorage.findInvitationByToken.mockResolvedValue(mockInvitation as any)
    mockUserStorage.findByEmail.mockResolvedValue(existingUser as any)

    const request = createMockNextRequest({
      method: 'POST',
      json: jest.fn().mockResolvedValue({
        token: 'invitation-token',
        password: 'SecurePass123!',
      }),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(409)
    expect(data.error).toBe('User with this email already exists')
  })

  it('should return 400 when validation fails', async () => {
    const request = createMockNextRequest({
      method: 'POST',
      json: jest.fn().mockResolvedValue({
        token: 'invitation-token',
        password: 'weak',
      }),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid request data')
  })

  it('should return 500 when an error occurs', async () => {
    mockUserStorage.findInvitationByToken.mockRejectedValue(new Error('Database error'))

    const request = createMockNextRequest({
      method: 'POST',
      json: jest.fn().mockResolvedValue({
        token: 'invitation-token',
        password: 'SecurePass123!',
      }),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to accept invitation')
  })
})

