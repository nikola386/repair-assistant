import { db } from './db'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
// Prisma generates User type automatically from schema - use it directly
import type { User } from '@prisma/client'

// Type for UserInvitation (will be available after Prisma client regeneration)
interface UserInvitation {
  id: string
  email: string
  storeId: string
  role: string
  invitedBy: string
  token: string
  expiresAt: Date
  acceptedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export type { User }
export type { UserInvitation }

export interface CreateUserInput {
  email: string
  password: string
  name?: string
  storeId?: string
  storeName?: string // If provided, create a new store with this name
  role?: string
  invitedBy?: string
  invitedAt?: Date
}

export class UserStorage {
  async create(input: CreateUserInput): Promise<User> {
    const { email, password, name, storeId, storeName, role, invitedBy, invitedAt } = input

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    let finalStoreId = storeId

    // If storeName is provided, create a new store
    if (storeName && !storeId) {
      const store = await db.store.create({
        data: {
          name: storeName,
        },
      })
      finalStoreId = store.id
    }

    // If neither storeId nor storeName provided, throw error (store is required)
    if (!finalStoreId) {
      throw new Error('Either storeId or storeName must be provided when creating a user')
    }

    return db.user.create({
      data: {
        email,
        passwordHash,
        name: name || null,
        storeId: finalStoreId,
        role: (role || 'VIEWER') as any,
        invitedBy: invitedBy || null,
        invitedAt: invitedAt || null,
      },
    })
  }

  async getStoreId(userId: string): Promise<string | null> {
    const user = await this.findById(userId)
    return user?.storeId || null
  }

  async findByEmail(email: string): Promise<User | null> {
    return db.user.findUnique({
      where: { email },
    }) as Promise<User | null>
  }

  async findById(id: string): Promise<User | null> {
    return db.user.findUnique({
      where: { id },
    })
  }

  async verifyPassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.passwordHash)
  }

  async updateProfile(id: string, data: { name?: string; email?: string }): Promise<User> {
    const updates: { name?: string | null; email?: string } = {}

    if (data.name !== undefined) {
      updates.name = data.name || null
    }

    if (data.email !== undefined) {
      updates.email = data.email
    }

    return db.user.update({
      where: { id },
      data: updates,
    })
  }

  async updatePassword(id: string, newPassword: string): Promise<void> {
    const passwordHash = await bcrypt.hash(newPassword, 10)

    await db.user.update({
      where: { id },
      data: {
        passwordHash,
      },
    })
  }

  async updateProfileImage(id: string, imagePath: string | null): Promise<User> {
    return db.user.update({
      where: { id },
      data: {
        profileImage: imagePath,
      },
    })
  }

  /**
   * Generate and store verification token for email verification
   */
  async generateVerificationToken(userId: string, token: string): Promise<User> {
    const expiryDate = new Date()
    expiryDate.setHours(expiryDate.getHours() + 24) // Token expires in 24 hours

    return db.user.update({
      where: { id: userId },
      data: {
        verificationToken: token,
        verificationTokenExpiry: expiryDate,
        lastVerificationEmailSent: new Date(),
      },
    })
  }

  /**
   * Verify email using token
   */
  async verifyEmail(token: string): Promise<User | null> {
    try {
      // Find user with valid token
      const user = await db.user.findFirst({
        where: {
          verificationToken: token,
          verificationTokenExpiry: {
            gt: new Date(), // Token must not be expired
          },
        },
      })

      if (!user) {
        console.log('No user found with valid token:', token.substring(0, 10) + '...')
        return null
      }

      console.log('Found user for verification:', user.id, user.email, 'token expires at:', user.verificationTokenExpiry)

      // Mark email as verified and clear verification token
      const updatedUser = await db.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          verificationToken: null,
          verificationTokenExpiry: null,
        },
      })

      console.log('User updated successfully:', updatedUser.id, updatedUser.email, 'emailVerified:', updatedUser.emailVerified)
      
      // Double-check that the update succeeded
      if (!updatedUser || !updatedUser.emailVerified) {
        console.error('Update appeared to succeed but user is not verified!', updatedUser)
        throw new Error('Failed to verify email - update did not persist')
      }
      
      return updatedUser
    } catch (error) {
      console.error('Error in verifyEmail:', error)
      // Re-throw to be handled by the API route
      throw error
    }
  }

  /**
   * Find user by verification token
   */
  async findByVerificationToken(token: string): Promise<User | null> {
    return db.user.findFirst({
      where: {
        verificationToken: token,
        verificationTokenExpiry: {
          gt: new Date(),
        },
      },
    })
  }

  /**
   * Check if user can resend verification email (rate limit: 1 minute)
   */
  async canResendVerificationEmail(userId: string): Promise<boolean> {
    const user = await this.findById(userId)
    if (!user || !user.lastVerificationEmailSent) {
      return true
    }

    const oneMinuteAgo = new Date(Date.now() - 60 * 1000)
    return user.lastVerificationEmailSent < oneMinuteAgo
  }

  async createInvitation(input: {
    email: string
    storeId: string
    role: string
    invitedBy: string
  }): Promise<UserInvitation> {
    const token = crypto.randomUUID()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

    return (db as any).userInvitation.create({
      data: {
        email: input.email,
        storeId: input.storeId,
        role: input.role as any,
        invitedBy: input.invitedBy,
        token,
        expiresAt,
      },
    })
  }

  async findInvitationByToken(token: string): Promise<UserInvitation | null> {
    return (db as any).userInvitation.findUnique({
      where: { token },
      include: {
        store: true,
        inviter: true,
      },
    })
  }

  async acceptInvitation(invitationId: string): Promise<void> {
    await (db as any).userInvitation.update({
      where: { id: invitationId },
      data: { acceptedAt: new Date() },
    })
  }

  async findPendingInvitationsByStoreId(storeId: string): Promise<UserInvitation[]> {
    return (db as any).userInvitation.findMany({
      where: {
        storeId,
        acceptedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        inviter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async resendInvitation(invitationId: string): Promise<UserInvitation> {
    // Generate new token and extend expiry
    const token = crypto.randomUUID()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

    return (db as any).userInvitation.update({
      where: { id: invitationId },
      data: {
        token,
        expiresAt,
      },
    })
  }

  // User management methods
  async findByStoreId(storeId: string): Promise<User[]> {
    return db.user.findMany({
      where: { storeId },
      orderBy: { createdAt: 'asc' },
    })
  }

  async update(userId: string, data: {
    role?: string
    isActive?: boolean
    name?: string
  }): Promise<User> {
    return db.user.update({
      where: { id: userId },
      data,
    })
  }
}

export const userStorage = new UserStorage()
