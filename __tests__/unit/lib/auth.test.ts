import { getAuthSession, requireAuth } from '@/lib/auth'
import { auth } from '@/lib/auth.config'

jest.mock('@/lib/auth.config')

const mockAuth = auth as jest.MockedFunction<typeof auth>

describe('auth', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getAuthSession', () => {
    it('should return session when authenticated', async () => {
      const mockSession = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User',
        },
      }

      mockAuth.mockResolvedValue(mockSession as any)

      const result = await getAuthSession()

      expect(result).toEqual(mockSession)
      expect(mockAuth).toHaveBeenCalled()
    })

    it('should return null when not authenticated', async () => {
      mockAuth.mockResolvedValue(null)

      const result = await getAuthSession()

      expect(result).toBeNull()
    })
  })

  describe('requireAuth', () => {
    it('should return session when user is authenticated', async () => {
      const mockSession = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User',
        },
      }

      mockAuth.mockResolvedValue(mockSession as any)

      const result = await requireAuth()

      expect(result).toEqual(mockSession)
    })

    it('should return null when session is null', async () => {
      mockAuth.mockResolvedValue(null)

      const result = await requireAuth()

      expect(result).toBeNull()
    })

    it('should return null when session has no user', async () => {
      mockAuth.mockResolvedValue({ user: null } as any)

      const result = await requireAuth()

      expect(result).toBeNull()
    })
  })
})

