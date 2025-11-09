import { GET, PATCH } from '@/app/api/profile/route'
import { NextRequest } from 'next/server'
import { userStorage } from '@/lib/userStorage'
import { withAuth } from '@/lib/auth.middleware'
import { db } from '@/lib/db'
import { createMockNextRequest, createMockSession, createMockUser, createMockStore } from '../../../utils/test-helpers'

jest.mock('@/lib/userStorage')
jest.mock('@/lib/auth.middleware')
jest.mock('@/lib/db', () => ({
  db: {
    store: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}))

const mockUserStorage = userStorage as jest.Mocked<typeof userStorage>
const mockWithAuth = withAuth as jest.MockedFunction<typeof withAuth>
const mockDb = db as jest.Mocked<typeof db>

describe('/api/profile', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should return user profile with store information', async () => {
      const mockSession = createMockSession()
      const mockUser = createMockUser()
      const mockStore = createMockStore()

      mockWithAuth.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })
      mockUserStorage.findById.mockResolvedValue(mockUser as any)
      mockDb.store.findUnique.mockResolvedValue(mockStore as any)

      const request = createMockNextRequest()
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.user).toBeDefined()
      expect(data.user.passwordHash).toBeUndefined()
      expect(data.store).toBeDefined()
      expect(mockUserStorage.findById).toHaveBeenCalledWith(mockSession.user.id)
    })

    it('should return 404 when user not found', async () => {
      const mockSession = createMockSession()

      mockWithAuth.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })
      mockUserStorage.findById.mockResolvedValue(null)

      const request = createMockNextRequest()
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('User not found')
    })

    it('should return 401 when not authenticated', async () => {
      mockWithAuth.mockResolvedValue({
        session: null,
        response: { status: 401 } as any,
      })

      const request = createMockNextRequest()
      const response = await GET(request)

      expect(response.status).toBe(401)
    })

    it('should return 500 when an error occurs', async () => {
      const mockSession = createMockSession()

      mockWithAuth.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })
      mockUserStorage.findById.mockRejectedValue(new Error('Database error'))

      const request = createMockNextRequest()
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })

  describe('PATCH', () => {
    it('should update user profile successfully', async () => {
      const mockSession = createMockSession()
      const mockUser = createMockUser()
      const mockStore = createMockStore()
      const updatedUser = createMockUser({ name: 'Updated Name' })

      mockWithAuth.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })
      mockUserStorage.findById.mockResolvedValue(mockUser as any)
      mockUserStorage.updateProfile.mockResolvedValue(updatedUser as any)
      mockDb.store.findUnique.mockResolvedValue(mockStore as any)
      mockDb.store.update.mockResolvedValue(mockStore as any)

      const request = createMockNextRequest({
        method: 'PATCH',
        json: jest.fn().mockResolvedValue({ name: 'Updated Name' }),
      })
      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Profile updated successfully')
      expect(data.user.name).toBe('Updated Name')
      expect(mockUserStorage.updateProfile).toHaveBeenCalled()
    })

    it('should update email when provided', async () => {
      const mockSession = createMockSession()
      const mockUser = createMockUser()
      const mockStore = createMockStore()
      const updatedUser = createMockUser({ email: 'newemail@example.com' })

      mockWithAuth.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })
      mockUserStorage.findById.mockResolvedValue(mockUser as any)
      mockUserStorage.findByEmail.mockResolvedValue(null)
      mockUserStorage.updateProfile.mockResolvedValue(updatedUser as any)
      mockDb.store.findUnique.mockResolvedValue(mockStore as any)

      const request = createMockNextRequest({
        method: 'PATCH',
        json: jest.fn().mockResolvedValue({ email: 'newemail@example.com' }),
      })
      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.user.email).toBe('newemail@example.com')
    })

    it('should return 400 when email format is invalid', async () => {
      const mockSession = createMockSession()
      const mockUser = createMockUser()

      mockWithAuth.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })
      mockUserStorage.findById.mockResolvedValue(mockUser as any)

      const request = createMockNextRequest({
        method: 'PATCH',
        json: jest.fn().mockResolvedValue({ email: 'invalid-email' }),
      })
      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid email format')
    })

    it('should return 400 when email is already taken', async () => {
      const mockSession = createMockSession()
      const mockUser = createMockUser()
      const existingUser = createMockUser({ id: 'other-user-id', email: 'taken@example.com' })

      mockWithAuth.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })
      mockUserStorage.findById.mockResolvedValue(mockUser as any)
      mockUserStorage.findByEmail.mockResolvedValue(existingUser as any)

      const request = createMockNextRequest({
        method: 'PATCH',
        json: jest.fn().mockResolvedValue({ email: 'taken@example.com' }),
      })
      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Email is already taken')
    })

    it('should update store country and VAT number', async () => {
      const mockSession = createMockSession()
      const mockUser = createMockUser()
      const mockStore = createMockStore()
      const updatedUser = createMockUser()

      mockWithAuth.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })
      mockUserStorage.findById.mockResolvedValue(mockUser as any)
      mockUserStorage.updateProfile.mockResolvedValue(updatedUser as any)
      mockDb.store.findUnique.mockResolvedValue(mockStore as any)
      mockDb.store.update.mockResolvedValue(mockStore as any)

      const request = createMockNextRequest({
        method: 'PATCH',
        json: jest.fn().mockResolvedValue({ country: 'US', vatNumber: '123456' }),
      })
      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(mockDb.store.update).toHaveBeenCalled()
    })

    it('should return 404 when user not found', async () => {
      const mockSession = createMockSession()

      mockWithAuth.mockResolvedValue({
        session: mockSession as any,
        response: null,
      })
      mockUserStorage.findById.mockResolvedValue(null)

      const request = createMockNextRequest({
        method: 'PATCH',
        json: jest.fn().mockResolvedValue({ name: 'Updated Name' }),
      })
      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('User not found')
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
      mockUserStorage.updateProfile.mockRejectedValue(new Error('Database error'))

      const request = createMockNextRequest({
        method: 'PATCH',
        json: jest.fn().mockResolvedValue({ name: 'Updated Name' }),
      })
      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })
})

