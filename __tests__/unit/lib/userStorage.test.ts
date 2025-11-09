import { userStorage } from '@/lib/userStorage'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

jest.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    store: {
      create: jest.fn(),
    },
    userInvitation: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}))
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}))

const mockDb = db as jest.Mocked<typeof db>

describe('userStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('create', () => {
    it('should create user with new store', async () => {
      const input = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        name: 'Test User',
        storeName: "Test User's Store",
      }

      const mockStore = { id: 'store-1', name: "Test User's Store" }
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        storeId: 'store-1',
        role: 'ADMIN',
      }

      mockDb.store.create.mockResolvedValue(mockStore as any)
      mockDb.user.findMany.mockResolvedValue([])
      ;(bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password')
      mockDb.user.create.mockResolvedValue(mockUser as any)

      const result = await userStorage.create(input)

      expect(result).toBeDefined()
      expect(result.email).toBe('test@example.com')
      expect(mockDb.store.create).toHaveBeenCalled()
      expect(mockDb.user.create).toHaveBeenCalled()
    })

    it('should create user with existing storeId', async () => {
      const input = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        name: 'Test User',
        storeId: 'existing-store-1',
      }

      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        storeId: 'existing-store-1',
        role: 'VIEWER',
      }

      mockDb.user.findMany.mockResolvedValue([{ id: 'existing-user' }] as any)
      ;(bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password')
      mockDb.user.create.mockResolvedValue(mockUser as any)

      const result = await userStorage.create(input)

      expect(result).toBeDefined()
      expect(mockDb.store.create).not.toHaveBeenCalled()
    })

    it('should assign ADMIN role for first user in store', async () => {
      const input = {
        email: 'admin@example.com',
        password: 'SecurePass123!',
        storeName: 'New Store',
      }

      const mockStore = { id: 'store-1', name: 'New Store' }
      mockDb.store.create.mockResolvedValue(mockStore as any)
      mockDb.user.findMany.mockResolvedValue([])
      ;(bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password')
      mockDb.user.create.mockResolvedValue({
        id: 'user-1',
        role: 'ADMIN',
      } as any)

      await userStorage.create(input)

      expect(mockDb.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            role: 'ADMIN',
          }),
        })
      )
    })
  })

  describe('findByEmail', () => {
    it('should return user by email', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
      }

      mockDb.user.findUnique.mockResolvedValue(mockUser as any)

      const result = await userStorage.findByEmail('test@example.com')

      expect(result).toBeDefined()
      expect(result?.email).toBe('test@example.com')
    })

    it('should return null when user not found', async () => {
      mockDb.user.findUnique.mockResolvedValue(null)

      const result = await userStorage.findByEmail('nonexistent@example.com')

      expect(result).toBeNull()
    })
  })

  describe('findById', () => {
    it('should return user by id', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
      }

      mockDb.user.findUnique.mockResolvedValue(mockUser as any)

      const result = await userStorage.findById('user-1')

      expect(result).toBeDefined()
      expect(result?.id).toBe('user-1')
    })
  })

  describe('getStoreId', () => {
    it('should return storeId for user', async () => {
      const mockUser = {
        id: 'user-1',
        storeId: 'store-1',
      }

      mockDb.user.findUnique.mockResolvedValue(mockUser as any)

      const result = await userStorage.getStoreId('user-1')

      expect(result).toBe('store-1')
    })

    it('should return null when user not found', async () => {
      mockDb.user.findUnique.mockResolvedValue(null)

      const result = await userStorage.getStoreId('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('verifyPassword', () => {
    it('should return true for correct password', async () => {
      const mockUser = {
        id: 'user-1',
        passwordHash: 'hashed-password',
      } as any

      ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)

      const result = await userStorage.verifyPassword(mockUser, 'correct-password')

      expect(result).toBe(true)
      expect(bcrypt.compare).toHaveBeenCalledWith('correct-password', 'hashed-password')
    })

    it('should return false for incorrect password', async () => {
      const mockUser = {
        id: 'user-1',
        passwordHash: 'hashed-password',
      } as any

      ;(bcrypt.compare as jest.Mock).mockResolvedValue(false)

      const result = await userStorage.verifyPassword(mockUser, 'wrong-password')

      expect(result).toBe(false)
    })
  })
})

