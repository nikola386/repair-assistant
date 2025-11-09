import { GET, POST } from '@/app/api/auth/verify-email/route'
import { NextRequest } from 'next/server'
import { userStorage } from '@/lib/userStorage'
import { createMockNextRequest, createMockUser } from '../../../utils/test-helpers'

jest.mock('@/lib/userStorage')

const mockUserStorage = userStorage as jest.Mocked<typeof userStorage>

describe('/api/auth/verify-email', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should verify email successfully with valid token', async () => {
      const verifiedUser = createMockUser({
        email: 'test@example.com',
        emailVerified: true,
      })

      mockUserStorage.verifyEmail.mockResolvedValue(verifiedUser as any)

      const url = new URL('http://localhost:3001/api/auth/verify-email')
      url.searchParams.set('token', 'valid-token')
      const request = createMockNextRequest({
        method: 'GET',
        url: url.toString(),
        nextUrl: url,
      })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Email verified successfully')
      expect(data.verified).toBe(true)
      expect(mockUserStorage.verifyEmail).toHaveBeenCalledWith('valid-token')
    })

    it('should return 400 when token is missing', async () => {
      const url = new URL('http://localhost:3001/api/auth/verify-email')
      const request = createMockNextRequest({
        method: 'GET',
        url: url.toString(),
        nextUrl: url,
      })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Verification token is required')
    })

    it('should return 400 when token is invalid', async () => {
      mockUserStorage.verifyEmail.mockResolvedValue(null)

      const url = new URL('http://localhost:3001/api/auth/verify-email')
      url.searchParams.set('token', 'invalid-token')
      const request = createMockNextRequest({
        method: 'GET',
        url: url.toString(),
        nextUrl: url,
      })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid or expired verification token')
    })

    it('should return 500 when an error occurs', async () => {
      mockUserStorage.verifyEmail.mockRejectedValue(new Error('Database error'))

      const url = new URL('http://localhost:3001/api/auth/verify-email')
      url.searchParams.set('token', 'valid-token')
      const request = createMockNextRequest({
        method: 'GET',
        url: url.toString(),
        nextUrl: url,
      })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('An error occurred during verification')
    })
  })

  describe('POST', () => {
    it('should verify email successfully with valid token', async () => {
      const verifiedUser = createMockUser({
        email: 'test@example.com',
        emailVerified: true,
      })

      mockUserStorage.verifyEmail.mockResolvedValue(verifiedUser as any)

      const request = createMockNextRequest({
        method: 'POST',
        json: jest.fn().mockResolvedValue({ token: 'valid-token' }),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Email verified successfully')
      expect(data.verified).toBe(true)
      expect(mockUserStorage.verifyEmail).toHaveBeenCalledWith('valid-token')
    })

    it('should return 400 when token is missing', async () => {
      const request = createMockNextRequest({
        method: 'POST',
        json: jest.fn().mockResolvedValue({}),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Verification token is required')
    })

    it('should return 400 when token is invalid', async () => {
      mockUserStorage.verifyEmail.mockResolvedValue(null)

      const request = createMockNextRequest({
        method: 'POST',
        json: jest.fn().mockResolvedValue({ token: 'invalid-token' }),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid or expired verification token')
    })

    it('should return 500 when update does not persist', async () => {
      const error = new Error('update did not persist')
      mockUserStorage.verifyEmail.mockRejectedValue(error)

      const request = createMockNextRequest({
        method: 'POST',
        json: jest.fn().mockResolvedValue({ token: 'valid-token' }),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('Verification failed')
    })

    it('should return 500 when an error occurs', async () => {
      mockUserStorage.verifyEmail.mockRejectedValue(new Error('Database error'))

      const request = createMockNextRequest({
        method: 'POST',
        json: jest.fn().mockResolvedValue({ token: 'valid-token' }),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('An error occurred during verification')
    })
  })
})

