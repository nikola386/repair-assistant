import { POST } from '@/app/api/auth/check-verification/route'
import { NextRequest } from 'next/server'
import { userStorage } from '@/lib/userStorage'
import { createMockNextRequest, createMockUser } from '../../../utils/test-helpers'

jest.mock('@/lib/userStorage')

const mockUserStorage = userStorage as jest.Mocked<typeof userStorage>

describe('/api/auth/check-verification - POST', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return requiresVerification true when user exists and is not verified', async () => {
    const unverifiedUser = createMockUser({
      email: 'test@example.com',
      emailVerified: false,
    })

    mockUserStorage.findByEmail.mockResolvedValue(unverifiedUser as any)

    const request = createMockNextRequest({
      method: 'POST',
      json: jest.fn().mockResolvedValue({ email: 'test@example.com' }),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.requiresVerification).toBe(true)
    expect(mockUserStorage.findByEmail).toHaveBeenCalledWith('test@example.com')
  })

  it('should return requiresVerification false when user does not exist', async () => {
    mockUserStorage.findByEmail.mockResolvedValue(null)

    const request = createMockNextRequest({
      method: 'POST',
      json: jest.fn().mockResolvedValue({ email: 'nonexistent@example.com' }),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.requiresVerification).toBe(false)
  })

  it('should return requiresVerification false when user is already verified', async () => {
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

    expect(response.status).toBe(200)
    expect(data.requiresVerification).toBe(false)
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

