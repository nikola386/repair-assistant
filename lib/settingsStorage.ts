import { db } from './db'
// Prisma generates UserSettings type automatically from schema
// Import will work after TypeScript server reloads (Cmd+Shift+P → "TypeScript: Restart TS Server")
// @ts-expect-error - Prisma types available after generate, TS server may need restart
import type { UserSettings } from '@prisma/client'

export type { UserSettings }
export interface UpdateSettingsInput {
  primaryColor?: string
  secondaryColor?: string
}

export class UserSettingsStorage {
  async findByUserId(userId: string): Promise<UserSettings | null> {
    // @ts-expect-error - userSettings available after Prisma generate
    return db.userSettings.findUnique({
      where: { userId },
    })
  }

  async createOrUpdate(userId: string, data: UpdateSettingsInput): Promise<UserSettings> {
    // @ts-expect-error - userSettings available after Prisma generate  
    return db.userSettings.upsert({
      where: { userId },
      update: {
        primaryColor: data.primaryColor ?? undefined,
        secondaryColor: data.secondaryColor ?? undefined,
      },
      create: {
        userId,
        primaryColor: data.primaryColor ?? '#FFD700',
        secondaryColor: data.secondaryColor ?? '#000000',
      },
    })
  }

  async updateColors(userId: string, primaryColor?: string, secondaryColor?: string): Promise<UserSettings> {
    const updateData: UpdateSettingsInput = {}
    
    if (primaryColor !== undefined) {
      updateData.primaryColor = primaryColor
    }
    
    if (secondaryColor !== undefined) {
      updateData.secondaryColor = secondaryColor
    }

    return this.createOrUpdate(userId, updateData)
  }
}

export const settingsStorage = new UserSettingsStorage()

