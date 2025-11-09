import { POST } from '@/app/api/auth/register/route'
import { NextRequest, NextResponse } from 'next/server'
import { userStorage } from '@/lib/userStorage'
import { emailService } from '@/lib/email'
import { rateLimit } from '@/lib/rateLimit'
import { createMockNextRequest, createMockUser } from '../../../utils/test-helpers'

jest.mock('@/lib/userStorage')
jest.mock('@/lib/email')
jest.mock('@/lib/rateLimit')

const mockUserStorage = userStorage as jest.Mocked<typeof userStorage>
const mockEmailService = emailService as jest.Mocked<typeof emailService>
const mockRateLimit = rateLimit as jest.MockedFunction<typeof rateLimit>

describe('/api/auth/register - POST', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.DISABLE_REGISTER = 'false'
    mockRateLimit.mockReturnValue(null)
  })

  it('should register user successfully', async () => {
    const registerData = {
      email: 'newuser@example.com',
      password: 'SecurePass123!',
      name: 'New User',
    }
    const mockUser = createMockUser({
      email: registerData.email,
      name: registerData.name,
    })

    mockUserStorage.findByEmail.mockResolvedValue(null)
    mockUserStorage.create.mockResolvedValue(mockUser as any)
    mockEmailService.generateVerificationToken.mockReturnValue('verification-token')
    mockUserStorage.generateVerificationToken.mockResolvedValue(undefined)
    mockEmailService.sendVerificationEmail.mockResolvedValue(undefined)

    const request = createMockNextRequest({
      method: 'POST',
      json: jest.fn().mockResolvedValue(registerData),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.message).toContain('registered successfully')
    expect(data.user.email).toBe(registerData.email)
    expect(mockUserStorage.create).toHaveBeenCalled()
  })

  it('should return 403 when registration is disabled', async () => {
    process.env.DISABLE_REGISTER = 'true'

    const request = createMockNextRequest({
      method: 'POST',
      json: jest.fn().mockResolvedValue({}),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Registration is currently disabled')
  })

  it('should return 409 when email already exists', async () => {
    const existingUser = createMockUser()
    const registerData = {
      email: 'existing@example.com',
      password: 'SecurePass123!',
      name: 'New User',
    }

    mockUserStorage.findByEmail.mockResolvedValue(existingUser as any)

    const request = createMockNextRequest({
      method: 'POST',
      json: jest.fn().mockResolvedValue(registerData),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(409)
    expect(data.error).toBe('User with this email already exists')
    expect(mockUserStorage.create).not.toHaveBeenCalled()
  })

  it('should return 400 when validation fails', async () => {
    const invalidData = {
      email: 'invalid-email',
      password: 'weak',
      name: '',
    }

    const request = createMockNextRequest({
      method: 'POST',
      json: jest.fn().mockResolvedValue(invalidData),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBeDefined()
  })

  it('should handle rate limiting', async () => {
    mockRateLimit.mockReturnValue(NextResponse.json({ error: 'Too many requests' }, { status: 429 }) as any)

    const request = createMockNextRequest({
      method: 'POST',
      json: jest.fn().mockResolvedValue({}),
    })
    const response = await POST(request)

    expect(response.status).toBe(429)
  })
})

