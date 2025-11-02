import { db } from './db'
import bcrypt from 'bcryptjs'
// Prisma generates User type automatically from schema - use it directly
import type { User } from '@prisma/client'

export type { User }

export interface CreateUserInput {
  email: string
  password: string
  name?: string
  storeId?: string
  storeName?: string // If provided, create a new store with this name
}

export class UserStorage {
  async create(input: CreateUserInput): Promise<User> {
    const { email, password, name, storeId, storeName } = input

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
    })
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
}

export const userStorage = new UserStorage()
