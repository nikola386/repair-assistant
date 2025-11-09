import { POST } from '@/app/api/auth/resend-verification/route'
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

describe('/api/auth/resend-verification - POST', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRateLimit.mockReturnValue(null)
  })

  it('should resend verification email successfully', async () => {
    const unverifiedUser = createMockUser({
      email: 'test@example.com',
      emailVerified: false,
    })

    mockUserStorage.findByEmail.mockResolvedValue(unverifiedUser as any)
    mockUserStorage.canResendVerificationEmail.mockResolvedValue(true)
    mockEmailService.generateVerificationToken.mockReturnValue('new-token')
    mockUserStorage.generateVerificationToken.mockResolvedValue(undefined)
    mockEmailService.sendVerificationEmail.mockResolvedValue(undefined)

    const request = createMockNextRequest({
      method: 'POST',
      json: jest.fn().mockResolvedValue({ email: 'test@example.com' }),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toBe('Verification email sent successfully')
    expect(mockEmailService.sendVerificationEmail).toHaveBeenCalled()
  })

  it('should return success message even if user does not exist (security)', async () => {
    mockUserStorage.findByEmail.mockResolvedValue(null)

    const request = createMockNextRequest({
      method: 'POST',
      json: jest.fn().mockResolvedValue({ email: 'nonexistent@example.com' }),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toContain('If an account exists')
    expect(mockEmailService.sendVerificationEmail).not.toHaveBeenCalled()
  })

  it('should return 400 when email is already verified', async () => {
    const verifiedUser = createMockUser({
      email: 'test@example.com',
      emailVerified: true,
    })

    mockUserStorage.findByEmail.mockResolvedValue(verifiedUser as any)

    const request = createMockNextRequest({
      method: 'POST',
      json: jest.fn().mockResolvedValue({ email: 'test@example.com' }),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Email is already verified')
  })

  it('should return 429 when rate limit is exceeded', async () => {
    mockRateLimit.mockReturnValue(
      NextResponse.json({ error: 'Too many requests' }, { status: 429 }) as any
    )

    const request = createMockNextRequest({
      method: 'POST',
      json: jest.fn().mockResolvedValue({ email: 'test@example.com' }),
    })
    const response = await POST(request)

    expect(response.status).toBe(429)
  })

  it('should return 429 when canResendVerificationEmail returns false', async () => {
    const unverifiedUser = createMockUser({
      email: 'test@example.com',
      emailVerified: false,
    })

    mockUserStorage.findByEmail.mockResolvedValue(unverifiedUser as any)
    mockUserStorage.canResendVerificationEmail.mockResolvedValue(false)

    const request = createMockNextRequest({
      method: 'POST',
      json: jest.fn().mockResolvedValue({ email: 'test@example.com' }),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(429)
    expect(data.error).toContain('Please wait')
  })

  it('should return 400 when email is missing', async () => {
    const request = createMockNextRequest({
      method: 'POST',
      json: jest.fn().mockResolvedValue({}),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Email is required')
  })

  it('should return 500 when email sending fails', async () => {
    const unverifiedUser = createMockUser({
      email: 'test@example.com',
      emailVerified: false,
    })

    mockUserStorage.findByEmail.mockResolvedValue(unverifiedUser as any)
    mockUserStorage.canResendVerificationEmail.mockResolvedValue(true)
    mockEmailService.generateVerificationToken.mockReturnValue('new-token')
    mockUserStorage.generateVerificationToken.mockResolvedValue(undefined)
    mockEmailService.sendVerificationEmail.mockRejectedValue(new Error('Email service error'))

    const request = createMockNextRequest({
      method: 'POST',
      json: jest.fn().mockResolvedValue({ email: 'test@example.com' }),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toContain('Failed to send verification email')
  })

  it('should return 500 when an error occurs', async () => {
    mockUserStorage.findByEmail.mockRejectedValue(new Error('Database error'))

    const request = createMockNextRequest({
      method: 'POST',
      json: jest.fn().mockResolvedValue({ email: 'test@example.com' }),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('An error occurred')
  })
})

