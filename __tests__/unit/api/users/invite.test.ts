import { POST } from '@/app/api/users/invite/route'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuthAndPermission } from '@/lib/api-middleware'
import { userStorage } from '@/lib/userStorage'
import { emailService } from '@/lib/email'
import { createMockNextRequest, createMockSession, createMockUser } from '../../../utils/test-helpers'

jest.mock('@/lib/api-middleware')
jest.mock('@/lib/userStorage')
jest.mock('@/lib/email')

const mockRequireAuthAndPermission = requireAuthAndPermission as jest.MockedFunction<typeof requireAuthAndPermission>
const mockUserStorage = userStorage as jest.Mocked<typeof userStorage>
const mockEmailService = emailService as jest.Mocked<typeof emailService>

describe('/api/users/invite - POST', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should send invitation successfully', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()
    const mockInvitation = {
      id: 'invitation-1',
      email: 'newuser@example.com',
      role: 'TECHNICIAN',
      token: 'invitation-token',
      expiresAt: new Date(),
    }
    const inviteData = {
      email: 'newuser@example.com',
      role: 'TECHNICIAN',
    }

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)
    mockUserStorage.findByEmail.mockResolvedValue(null)
    mockUserStorage.createInvitation.mockResolvedValue(mockInvitation as any)
    mockEmailService.sendInvitationEmail.mockResolvedValue(undefined)

    const request = createMockNextRequest({
      method: 'POST',
      json: jest.fn().mockResolvedValue(inviteData),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toBe('Invitation sent successfully')
    expect(data.invitation.email).toBe(inviteData.email)
    expect(mockUserStorage.createInvitation).toHaveBeenCalled()
    expect(mockEmailService.sendInvitationEmail).toHaveBeenCalled()
  })

  it('should return 409 when user already exists in store', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()
    const existingUser = createMockUser({ email: 'existing@example.com', storeId: mockUser.storeId })
    const inviteData = {
      email: 'existing@example.com',
      role: 'TECHNICIAN',
    }

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)
    mockUserStorage.findByEmail.mockResolvedValue(existingUser as any)

    const request = createMockNextRequest({
      method: 'POST',
      json: jest.fn().mockResolvedValue(inviteData),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(409)
    expect(data.error).toBe('User already exists in this store')
    expect(mockUserStorage.createInvitation).not.toHaveBeenCalled()
  })

  it('should return 400 when validation fails', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()
    const invalidData = {
      email: 'invalid-email',
      role: 'INVALID_ROLE',
    }

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)

    const request = createMockNextRequest({
      method: 'POST',
      json: jest.fn().mockResolvedValue(invalidData),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid request data')
  })

  it('should return 401 when unauthorized', async () => {
    mockRequireAuthAndPermission.mockResolvedValue({
      session: null,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) as any,
    })

    const request = createMockNextRequest({
      method: 'POST',
      json: jest.fn().mockResolvedValue({}),
    })
    const response = await POST(request)

    expect(response.status).toBe(401)
  })
})

