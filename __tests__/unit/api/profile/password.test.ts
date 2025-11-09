import { PATCH } from '@/app/api/profile/password/route'
import { NextRequest } from 'next/server'
import { userStorage } from '@/lib/userStorage'
import { withAuth } from '@/lib/auth.middleware'
import { validatePassword } from '@/lib/validation'
import { createMockNextRequest, createMockSession, createMockUser } from '../../../utils/test-helpers'

jest.mock('@/lib/userStorage')
jest.mock('@/lib/auth.middleware')
jest.mock('@/lib/validation')

const mockUserStorage = userStorage as jest.Mocked<typeof userStorage>
const mockWithAuth = withAuth as jest.MockedFunction<typeof withAuth>
const mockValidatePassword = validatePassword as jest.MockedFunction<typeof validatePassword>

describe('/api/profile/password - PATCH', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should update password successfully', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()

    mockWithAuth.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)
    mockUserStorage.verifyPassword.mockResolvedValue(true)
    mockUserStorage.updatePassword.mockResolvedValue(undefined)
    mockValidatePassword.mockReturnValue(null)

    const request = createMockNextRequest({
      method: 'PATCH',
      json: jest.fn().mockResolvedValue({
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
      }),
    })
    const response = await PATCH(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toBe('Password updated successfully')
    expect(mockUserStorage.updatePassword).toHaveBeenCalledWith(mockSession.user.id, 'NewPassword123!')
  })

  it('should return 400 when current password or new password is missing', async () => {
    const mockSession = createMockSession()

    mockWithAuth.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })

    const request = createMockNextRequest({
      method: 'PATCH',
      json: jest.fn().mockResolvedValue({
        currentPassword: 'OldPassword123!',
      }),
    })
    const response = await PATCH(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Current password and new password are required')
  })

  it('should return 400 when password validation fails', async () => {
    const mockSession = createMockSession()

    mockWithAuth.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockValidatePassword.mockReturnValue('Password is too weak')

    const request = createMockNextRequest({
      method: 'PATCH',
      json: jest.fn().mockResolvedValue({
        currentPassword: 'OldPassword123!',
        newPassword: 'weak',
      }),
    })
    const response = await PATCH(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Password is too weak')
  })

  it('should return 404 when user not found', async () => {
    const mockSession = createMockSession()

    mockWithAuth.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(null)
    mockValidatePassword.mockReturnValue(null)

    const request = createMockNextRequest({
      method: 'PATCH',
      json: jest.fn().mockResolvedValue({
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
      }),
    })
    const response = await PATCH(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('User not found')
  })

  it('should return 400 when current password is incorrect', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()

    mockWithAuth.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)
    mockUserStorage.verifyPassword.mockResolvedValue(false)
    mockValidatePassword.mockReturnValue(null)

    const request = createMockNextRequest({
      method: 'PATCH',
      json: jest.fn().mockResolvedValue({
        currentPassword: 'WrongPassword123!',
        newPassword: 'NewPassword123!',
      }),
    })
    const response = await PATCH(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Current password is incorrect')
    expect(mockUserStorage.updatePassword).not.toHaveBeenCalled()
  })

  it('should return 401 when not authenticated', async () => {
    mockWithAuth.mockResolvedValue({
      session: null,
      response: { status: 401 } as any,
    })

    const request = createMockNextRequest({
      method: 'PATCH',
      json: jest.fn().mockResolvedValue({}),
    })
    const response = await PATCH(request)

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
    mockUserStorage.verifyPassword.mockResolvedValue(true)
    mockUserStorage.updatePassword.mockRejectedValue(new Error('Database error'))
    mockValidatePassword.mockReturnValue(null)

    const request = createMockNextRequest({
      method: 'PATCH',
      json: jest.fn().mockResolvedValue({
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
      }),
    })
    const response = await PATCH(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })
})

