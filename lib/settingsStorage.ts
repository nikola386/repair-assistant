import { db } from './db'
// Prisma generates Settings type automatically from schema
// Import will work after TypeScript server reloads (Cmd+Shift+P → "TypeScript: Restart TS Server")
// @ts-expect-error - Prisma types available after generate, TS server may need restart
import type { Settings } from '@prisma/client'

export type { Settings }
export interface UpdateSettingsInput {
  primaryColor?: string
  secondaryColor?: string
}

export class SettingsStorage {
  async findByStoreId(storeId: string): Promise<Settings | null> {
    // @ts-expect-error - settings available after Prisma generate
    return db.settings.findUnique({
      where: { storeId },
    })
  }

  async createOrUpdate(storeId: string, data: UpdateSettingsInput): Promise<Settings> {
    // @ts-expect-error - settings available after Prisma generate  
    return db.settings.upsert({
      where: { storeId },
      update: {
        primaryColor: data.primaryColor ?? undefined,
        secondaryColor: data.secondaryColor ?? undefined,
      },
      create: {
        storeId,
        primaryColor: data.primaryColor ?? '#FFD700',
        secondaryColor: data.secondaryColor ?? '#000000',
      },
    })
  }

  async updateColors(storeId: string, primaryColor?: string, secondaryColor?: string): Promise<Settings> {
    const updateData: UpdateSettingsInput = {}
    
    if (primaryColor !== undefined) {
      updateData.primaryColor = primaryColor
    }
    
    if (secondaryColor !== undefined) {
      updateData.secondaryColor = secondaryColor
    }

    return this.createOrUpdate(storeId, updateData)
  }
}

export const settingsStorage = new SettingsStorage()

