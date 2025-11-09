import { POST } from '@/app/api/users/resend-invitation/route'
import { NextRequest } from 'next/server'
import { requireAuthAndPermission } from '@/lib/api-middleware'
import { Permission } from '@/lib/permissions'
import { userStorage } from '@/lib/userStorage'
import { emailService } from '@/lib/email'
import { db } from '@/lib/db'
import { createMockNextRequest, createMockSession, createMockUser } from '../../../utils/test-helpers'

jest.mock('@/lib/api-middleware')
jest.mock('@/lib/userStorage')
jest.mock('@/lib/email')
jest.mock('@/lib/db', () => ({
  db: {
    userInvitation: {
      findUnique: jest.fn(),
    },
  },
}))

const mockRequireAuthAndPermission = requireAuthAndPermission as jest.MockedFunction<typeof requireAuthAndPermission>
const mockUserStorage = userStorage as jest.Mocked<typeof userStorage>
const mockEmailService = emailService as jest.Mocked<typeof emailService>
const mockDb = db as jest.Mocked<typeof db>

describe('/api/users/resend-invitation - POST', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should resend invitation successfully', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()
    const mockInvitation = {
      id: 'invitation-1',
      email: 'user@example.com',
      storeId: mockUser.storeId,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      acceptedAt: null,
    }
    const updatedInvitation = {
      ...mockInvitation,
      token: 'new-token',
    }

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)
    mockDb.userInvitation.findUnique.mockResolvedValue(mockInvitation as any)
    mockUserStorage.resendInvitation.mockResolvedValue(updatedInvitation as any)
    mockEmailService.sendInvitationEmail.mockResolvedValue(undefined)

    const request = createMockNextRequest({
      method: 'POST',
      json: jest.fn().mockResolvedValue({ invitationId: 'invitation-1' }),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toBe('Invitation resent successfully')
    expect(mockEmailService.sendInvitationEmail).toHaveBeenCalled()
  })

  it('should return 400 when invitationId is missing', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)

    const request = createMockNextRequest({
      method: 'POST',
      json: jest.fn().mockResolvedValue({}),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invitation ID is required')
  })

  it('should return 404 when invitation not found', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)
    mockDb.userInvitation.findUnique.mockResolvedValue(null)

    const request = createMockNextRequest({
      method: 'POST',
      json: jest.fn().mockResolvedValue({ invitationId: 'invitation-1' }),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Invitation not found')
  })

  it('should return 404 when invitation belongs to different store', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()
    const mockInvitation = {
      id: 'invitation-1',
      email: 'user@example.com',
      storeId: 'different-store-id',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      acceptedAt: null,
    }

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)
    mockDb.userInvitation.findUnique.mockResolvedValue(mockInvitation as any)

    const request = createMockNextRequest({
      method: 'POST',
      json: jest.fn().mockResolvedValue({ invitationId: 'invitation-1' }),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Invitation not found')
  })

  it('should return 400 when invitation already accepted', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()
    const mockInvitation = {
      id: 'invitation-1',
      email: 'user@example.com',
      storeId: mockUser.storeId,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      acceptedAt: new Date(),
    }

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)
    mockDb.userInvitation.findUnique.mockResolvedValue(mockInvitation as any)

    const request = createMockNextRequest({
      method: 'POST',
      json: jest.fn().mockResolvedValue({ invitationId: 'invitation-1' }),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invitation is no longer valid')
  })

  it('should return 400 when invitation expired', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()
    const mockInvitation = {
      id: 'invitation-1',
      email: 'user@example.com',
      storeId: mockUser.storeId,
      expiresAt: new Date(Date.now() - 1000),
      acceptedAt: null,
    }

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)
    mockDb.userInvitation.findUnique.mockResolvedValue(mockInvitation as any)

    const request = createMockNextRequest({
      method: 'POST',
      json: jest.fn().mockResolvedValue({ invitationId: 'invitation-1' }),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invitation is no longer valid')
  })

  it('should return 401 when not authenticated', async () => {
    mockRequireAuthAndPermission.mockResolvedValue({
      session: null,
      response: { status: 401 } as any,
    })

    const request = createMockNextRequest({
      method: 'POST',
      json: jest.fn().mockResolvedValue({}),
    })
    const response = await POST(request)

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
    mockDb.userInvitation.findUnique.mockRejectedValue(new Error('Database error'))

    const request = createMockNextRequest({
      method: 'POST',
      json: jest.fn().mockResolvedValue({ invitationId: 'invitation-1' }),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to resend invitation')
  })
})
